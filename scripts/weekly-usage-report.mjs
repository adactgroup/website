import { createSign } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIME_ZONE = "Australia/Brisbane";
const DEFAULT_TO = "projects@adact.com.au";
const DEFAULT_FROM = "ADACT Viewer <reports@adact.com.au>";
const DEFAULT_DASHBOARD_URL = "https://adact.com.au/usage-dashboard.html";
const PROJECT_TABLE_LIMIT = 25;
const REPORT_BOUNDARY_UTC_HOUR = 22;

function requireEnvironment(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getGoogleAccessToken(serviceAccount) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: issuedAt + 3600,
  }));
  const unsignedToken = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key);
  const assertion = `${unsignedToken}.${base64Url(signature)}`;
  const response = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(`Google access token request failed (${response.status}): ${body.error_description || body.error || "Unknown error"}`);
  }
  return body.access_token;
}

function decodeFirestoreValue(value = {}) {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue.fields || {});
  if ("geoPointValue" in value) return value.geoPointValue;
  return "";
}

function decodeFirestoreFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([name, value]) => [name, decodeFirestoreValue(value)]),
  );
}

async function queryCollection({ accessToken, projectId, collectionId, start, end }) {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents:runQuery`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: "created_at" },
                  op: "GREATER_THAN_OR_EQUAL",
                  value: { timestampValue: start.toISOString() },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: "created_at" },
                  op: "LESS_THAN",
                  value: { timestampValue: end.toISOString() },
                },
              },
            ],
          },
        },
        orderBy: [{
          field: { fieldPath: "created_at" },
          direction: "DESCENDING",
        }],
      },
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Firestore ${collectionId} query failed (${response.status}): ${body.error?.message || "Unknown error"}`);
  }
  return body
    .filter((result) => result.document)
    .map((result) => ({
      id: result.document.name.split("/").pop(),
      ...decodeFirestoreFields(result.document.fields),
    }));
}

function getReportRange(now = new Date()) {
  const end = new Date(now);
  end.setUTCMinutes(0, 0, 0);
  end.setUTCDate(end.getUTCDate() - end.getUTCDay());
  end.setUTCHours(REPORT_BOUNDARY_UTC_HOUR, 0, 0, 0);
  if (end > now) end.setUTCDate(end.getUTCDate() - 7);
  const start = new Date(end.getTime() - (7 * DAY_MS));
  const previousStart = new Date(start.getTime() - (7 * DAY_MS));
  return { start, end, previousStart, previousEnd: start };
}

function cleanText(value, fallback = "Not supplied") {
  const cleaned = String(value ?? "").replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value, timeZone, includeTime = true) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return "Unknown";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function formatDateKey(value, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-AU");
}

function formatToolName(value) {
  return cleanText(value, "Unknown tool")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function countBy(records, getter, fallback = "Not supplied") {
  const counts = new Map();
  records.forEach((record) => {
    const value = cleanText(getter(record), fallback);
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function toolCountsForProjects(projects, toolEvents) {
  const byProject = new Map(projects.map((project) => [project.id, new Map()]));
  toolEvents.forEach((event) => {
    (event.project_ids || []).forEach((projectId) => {
      const projectCounts = byProject.get(projectId);
      if (!projectCounts) return;
      const toolName = cleanText(event.tool_name, "unknown");
      projectCounts.set(toolName, (projectCounts.get(toolName) || 0) + 1);
    });
  });
  return byProject;
}

function formatProjectTools(projectCounts) {
  if (!projectCounts?.size) return "None recorded";
  return Array.from(projectCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => `${formatToolName(name)}${count > 1 ? ` (${count})` : ""}`)
    .join(", ");
}

function uniqueVisitorCount(projects, toolEvents) {
  return new Set([
    ...projects.map((project) => project.visitor_id),
    ...toolEvents.map((event) => event.visitor_id),
  ].filter(Boolean)).size;
}

function buildMetrics(projects, toolEvents) {
  const projectNames = new Set(
    projects.map((project) => cleanText(project.project_name, "")).filter(Boolean),
  );
  return {
    uploads: projects.length,
    projects: projectNames.size,
    visitors: uniqueVisitorCount(projects, toolEvents),
    assets: projects.reduce((sum, project) => sum + (Number(project.asset_count) || 0), 0),
    toolActions: toolEvents.length,
  };
}

function comparisonText(current, previous) {
  const difference = current - previous;
  if (difference === 0) return "No change";
  return `${difference > 0 ? "+" : ""}${formatNumber(difference)} vs prior week`;
}

function renderMetricCard(label, current, previous, width = "33.333%") {
  return `
    <td style="width:${width};padding:0 6px 12px 0;vertical-align:top;">
      <div style="border:1px solid #dbe4ef;background:#f7f9fc;padding:14px;border-radius:6px;">
        <div style="font-size:12px;color:#607089;text-transform:uppercase;font-weight:700;">${escapeHtml(label)}</div>
        <div style="font-size:26px;color:#081f3a;font-weight:800;margin-top:5px;">${formatNumber(current)}</div>
        <div style="font-size:12px;color:#607089;margin-top:3px;">${escapeHtml(comparisonText(current, previous))}</div>
      </div>
    </td>`;
}

function renderBreakdown(title, rows, labelFormatter = (label) => label) {
  const visible = rows.slice(0, 8);
  return `
    <td style="width:50%;padding:0 8px 18px 0;vertical-align:top;">
      <div style="border:1px solid #dbe4ef;border-radius:6px;overflow:hidden;">
        <div style="background:#f3f6fa;padding:10px 12px;font-weight:800;color:#081f3a;">${escapeHtml(title)}</div>
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          ${visible.length ? visible.map((row) => `
            <tr>
              <td style="padding:8px 12px;border-top:1px solid #edf1f6;color:#263a52;">${escapeHtml(labelFormatter(row.label))}</td>
              <td style="padding:8px 12px;border-top:1px solid #edf1f6;text-align:right;color:#081f3a;font-weight:700;">${formatNumber(row.count)}</td>
            </tr>`).join("") : `
            <tr><td style="padding:12px;color:#607089;">No activity recorded</td></tr>`}
        </table>
      </div>
    </td>`;
}

function buildCsv(projects, projectToolCounts, timeZone) {
  const headers = [
    "Loaded",
    "Project",
    "Surveyor",
    "Engineer",
    "Receiver",
    "Software product",
    "Schema",
    "Assets",
    "Tools used",
  ];
  const rows = projects.map((project) => [
    formatDate(project.created_at, timeZone),
    cleanText(project.project_name),
    cleanText(project.surveyor_name),
    cleanText(project.engineer_name),
    cleanText(project.receiver),
    cleanText(project.software_product),
    cleanText(project.schema_version, "Unknown"),
    Number(project.asset_count) || 0,
    formatProjectTools(projectToolCounts.get(project.id)),
  ]);

  const csvValue = (value) => {
    let text = String(value ?? "");
    if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };

  return [headers, ...rows]
    .map((row) => row.map(csvValue).join(","))
    .join("\r\n");
}

function buildTextReport({ range, projects, toolEvents, previousProjects, previousToolEvents, dashboardUrl, timeZone }) {
  const metrics = buildMetrics(projects, toolEvents);
  const previous = buildMetrics(previousProjects, previousToolEvents);
  const projectToolCounts = toolCountsForProjects(projects, toolEvents);
  const lines = [
    "ADACT Viewer weekly usage report",
    `${formatDate(range.start, timeZone, false)} to ${formatDate(range.end, timeZone, false)}`,
    "",
    `XML uploads: ${formatNumber(metrics.uploads)} (${comparisonText(metrics.uploads, previous.uploads)})`,
    `Distinct projects: ${formatNumber(metrics.projects)} (${comparisonText(metrics.projects, previous.projects)})`,
    `Unique anonymous users: ${formatNumber(metrics.visitors)} (${comparisonText(metrics.visitors, previous.visitors)})`,
    `Assets reviewed: ${formatNumber(metrics.assets)} (${comparisonText(metrics.assets, previous.assets)})`,
    `Viewer tool actions: ${formatNumber(metrics.toolActions)} (${comparisonText(metrics.toolActions, previous.toolActions)})`,
    "",
    "Projects",
  ];
  projects.forEach((project) => {
    lines.push(
      `${formatDate(project.created_at, timeZone)} | ${cleanText(project.project_name)} | Surveyor: ${cleanText(project.surveyor_name)} | Engineer: ${cleanText(project.engineer_name)} | Receiver: ${cleanText(project.receiver)} | Software: ${cleanText(project.software_product)} | Assets: ${formatNumber(project.asset_count)} | Tools: ${formatProjectTools(projectToolCounts.get(project.id))}`,
    );
  });
  if (!projects.length) lines.push("No XML uploads were recorded.");
  lines.push("", `Private dashboard: ${dashboardUrl}`);
  return lines.join("\n");
}

function buildHtmlReport({ range, projects, toolEvents, previousProjects, previousToolEvents, dashboardUrl, timeZone }) {
  const metrics = buildMetrics(projects, toolEvents);
  const previous = buildMetrics(previousProjects, previousToolEvents);
  const projectToolCounts = toolCountsForProjects(projects, toolEvents);
  const software = countBy(projects, (project) => project.software_product);
  const receivers = countBy(projects, (project) => project.receiver);
  const schemas = countBy(projects, (project) => project.schema_version, "Unknown");
  const tools = countBy(toolEvents, (event) => event.tool_name, "unknown");
  const visibleProjects = projects.slice(0, PROJECT_TABLE_LIMIT);
  const additionalCount = Math.max(0, projects.length - visibleProjects.length);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#edf3f9;font-family:Arial,Helvetica,sans-serif;color:#142840;">
    <div style="display:none;max-height:0;overflow:hidden;">${formatNumber(metrics.uploads)} XML uploads and ${formatNumber(metrics.toolActions)} viewer tool actions this week.</div>
    <table role="presentation" style="width:100%;border-collapse:collapse;background:#edf3f9;">
      <tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" style="width:100%;max-width:920px;border-collapse:collapse;background:#ffffff;border:1px solid #dbe4ef;">
          <tr>
            <td style="background:#081f3a;color:#ffffff;padding:24px 28px;">
              <div style="font-size:12px;text-transform:uppercase;font-weight:700;color:#8fc5ff;">ADACT Viewer</div>
              <div style="font-size:28px;font-weight:800;margin-top:6px;">Weekly usage report</div>
              <div style="font-size:14px;color:#d7e5f4;margin-top:7px;">${escapeHtml(formatDate(range.start, timeZone, false))} to ${escapeHtml(formatDate(range.end, timeZone, false))}</div>
            </td>
          </tr>
          <tr><td style="padding:24px 28px 8px;">
            <table role="presentation" style="width:100%;border-collapse:collapse;"><tr>
              ${renderMetricCard("XML uploads", metrics.uploads, previous.uploads)}
              ${renderMetricCard("Projects", metrics.projects, previous.projects)}
              ${renderMetricCard("Users", metrics.visitors, previous.visitors)}
            </tr><tr>
              ${renderMetricCard("Assets", metrics.assets, previous.assets, "50%")}
              ${renderMetricCard("Tool actions", metrics.toolActions, previous.toolActions, "50%")}
            </tr></table>
          </td></tr>
          <tr><td style="padding:0 28px;">
            <table role="presentation" style="width:100%;border-collapse:collapse;"><tr>
              ${renderBreakdown("Software products", software)}
              ${renderBreakdown("Receiving authorities", receivers)}
            </tr><tr>
              ${renderBreakdown("ADAC schemas", schemas)}
              ${renderBreakdown("Viewer tools", tools, formatToolName)}
            </tr></table>
          </td></tr>
          <tr><td style="padding:0 28px 28px;">
            <div style="font-size:20px;font-weight:800;color:#081f3a;margin-bottom:10px;">Project uploads</div>
            <div style="border:1px solid #dbe4ef;border-radius:6px;overflow:hidden;">
              ${visibleProjects.length ? visibleProjects.map((project, index) => `
                <div style="padding:13px 14px;${index ? "border-top:1px solid #edf1f6;" : ""}">
                  <table role="presentation" style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td style="font-size:15px;color:#081f3a;font-weight:800;">${escapeHtml(cleanText(project.project_name))}</td>
                      <td style="font-size:12px;color:#607089;text-align:right;white-space:nowrap;">${escapeHtml(formatDate(project.created_at, timeZone))}</td>
                    </tr>
                  </table>
                  <div style="font-size:12px;line-height:1.55;color:#263a52;margin-top:6px;">
                    <strong>Surveyor:</strong> ${escapeHtml(cleanText(project.surveyor_name))}
                    &nbsp;&nbsp; <strong>Engineer:</strong> ${escapeHtml(cleanText(project.engineer_name))}
                  </div>
                  <div style="font-size:12px;line-height:1.55;color:#263a52;">
                    <strong>Receiver:</strong> ${escapeHtml(cleanText(project.receiver))}
                    &nbsp;&nbsp; <strong>Software:</strong> ${escapeHtml(cleanText(project.software_product))}
                    &nbsp;&nbsp; <strong>Schema:</strong> ${escapeHtml(cleanText(project.schema_version, "Unknown"))}
                    &nbsp;&nbsp; <strong>Assets:</strong> ${formatNumber(project.asset_count)}
                  </div>
                  <div style="font-size:12px;line-height:1.55;color:#52647b;">
                    <strong>Tools:</strong> ${escapeHtml(formatProjectTools(projectToolCounts.get(project.id)))}
                  </div>
                </div>`).join("") : `
                <div style="padding:18px;text-align:center;color:#607089;">No XML uploads were recorded during this period.</div>`}
            </div>
            ${additionalCount ? `<div style="font-size:12px;color:#607089;margin-top:8px;">${formatNumber(additionalCount)} additional uploads are included in the attached CSV.</div>` : ""}
          </td></tr>
          <tr><td style="background:#f3f6fa;padding:18px 28px;color:#52647b;font-size:12px;">
            This report contains private project usage information. Review the full register in the
            <a href="${escapeHtml(dashboardUrl)}" style="color:#0868c9;font-weight:700;">ADACT Viewer dashboard</a>.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function buildSampleData(range) {
  const within = (daysAgo, hoursAgo = 0) => new Date(range.end.getTime() - ((daysAgo * 24 + hoursAgo) * 60 * 60 * 1000)).toISOString();
  const previous = (daysAgo) => new Date(range.start.getTime() - (daysAgo * DAY_MS)).toISOString();
  return {
    projects: [
      { id: "p1", created_at: within(1), project_name: "River Road Upgrade", surveyor_name: "Example Surveying", engineer_name: "Example Engineering", receiver: "Unitywater", software_product: "ADACT Generator", schema_version: "ADAC 5.0.1", asset_count: 142, visitor_id: "v1" },
      { id: "p2", created_at: within(2), project_name: "Park Estate Stage 4", surveyor_name: "North Survey", engineer_name: "Civil Design Group", receiver: "Moreton Bay City", software_product: "12d Model", schema_version: "ADAC 5.0.1", asset_count: 86, visitor_id: "v2" },
      { id: "p3", created_at: within(4), project_name: "Industrial Drive Sewer", surveyor_name: "Example Surveying", engineer_name: "Water Design Pty Ltd", receiver: "Urban Utilities", software_product: "ADACT Generator", schema_version: "ADAC 6.0.0", asset_count: 54, visitor_id: "v1" },
    ],
    toolEvents: [
      { project_ids: ["p1"], tool_name: "attribute_edit", visitor_id: "v1" },
      { project_ids: ["p1"], tool_name: "edited_xml_download", visitor_id: "v1" },
      { project_ids: ["p2"], tool_name: "as_constructed_labels", visitor_id: "v2" },
      { project_ids: ["p2"], tool_name: "combined_pdf_report", visitor_id: "v2" },
      { project_ids: ["p3"], tool_name: "engineering_recalculation", visitor_id: "v1" },
      { project_ids: ["p3"], tool_name: "edited_xml_download", visitor_id: "v1" },
    ],
    previousProjects: [
      { id: "old1", created_at: previous(1), project_name: "Previous Project", asset_count: 75, visitor_id: "old-v1" },
      { id: "old2", created_at: previous(3), project_name: "Earlier Project", asset_count: 40, visitor_id: "old-v2" },
    ],
    previousToolEvents: [
      { project_ids: ["old1"], tool_name: "combined_pdf_report", visitor_id: "old-v1" },
      { project_ids: ["old2"], tool_name: "simple_labels", visitor_id: "old-v2" },
    ],
  };
}

async function loadReportData(range) {
  if (parseBoolean(process.env.REPORT_SAMPLE_DATA)) return buildSampleData(range);
  const serviceAccount = JSON.parse(requireEnvironment("FIREBASE_SERVICE_ACCOUNT_JSON"));
  if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required service-account fields.");
  }
  const accessToken = await getGoogleAccessToken(serviceAccount);
  const query = (collectionId, start, end) => queryCollection({
    accessToken,
    projectId: serviceAccount.project_id,
    collectionId,
    start,
    end,
  });
  const [projects, toolEvents, previousProjects, previousToolEvents] = await Promise.all([
    query("project_uploads", range.start, range.end),
    query("tool_events", range.start, range.end),
    query("project_uploads", range.previousStart, range.previousEnd),
    query("tool_events", range.previousStart, range.previousEnd),
  ]);
  return { projects, toolEvents, previousProjects, previousToolEvents };
}

async function sendReport({ apiKey, from, to, subject, html, text, csv, filename, idempotencyKey }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
      attachments: [{
        filename,
        content: Buffer.from(csv, "utf8").toString("base64"),
      }],
      tags: [
        { name: "report", value: "weekly_viewer_usage" },
      ],
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Resend email failed (${response.status}): ${body.message || body.name || "Unknown error"}`);
  }
  return body.id;
}

async function main() {
  const timeZone = process.env.REPORT_TIME_ZONE || DEFAULT_TIME_ZONE;
  const dashboardUrl = process.env.REPORT_DASHBOARD_URL || DEFAULT_DASHBOARD_URL;
  const now = process.env.REPORT_NOW ? new Date(process.env.REPORT_NOW) : new Date();
  if (Number.isNaN(now.valueOf())) throw new Error("REPORT_NOW must be a valid date.");
  const range = getReportRange(now);
  const data = await loadReportData(range);
  const reportInput = { range, ...data, dashboardUrl, timeZone };
  const metrics = buildMetrics(data.projects, data.toolEvents);
  const projectToolCounts = toolCountsForProjects(data.projects, data.toolEvents);
  const html = buildHtmlReport(reportInput);
  const text = buildTextReport(reportInput);
  const csv = buildCsv(data.projects, projectToolCounts, timeZone);
  const dateKey = formatDateKey(range.end, timeZone);
  const filename = `adact-viewer-weekly-usage-${dateKey}.csv`;
  const subject = `ADACT Viewer weekly usage: ${formatNumber(metrics.uploads)} uploads, ${formatNumber(metrics.projects)} projects`;

  const outputDirectory = String(process.env.REPORT_OUTPUT_DIR || "").trim();
  if (outputDirectory) {
    await mkdir(outputDirectory, { recursive: true });
    await Promise.all([
      writeFile(path.join(outputDirectory, "weekly-report.html"), html, "utf8"),
      writeFile(path.join(outputDirectory, "weekly-report.txt"), text, "utf8"),
      writeFile(path.join(outputDirectory, filename), csv, "utf8"),
    ]);
  }

  const shouldSend = parseBoolean(process.env.REPORT_SEND_EMAIL);
  if (!shouldSend) {
    console.log(`Weekly report dry run complete: ${metrics.uploads} uploads, ${metrics.projects} projects, ${metrics.toolActions} tool actions.`);
    return;
  }

  const emailId = await sendReport({
    apiKey: requireEnvironment("RESEND_API_KEY"),
    from: process.env.REPORT_FROM || DEFAULT_FROM,
    to: process.env.REPORT_TO || DEFAULT_TO,
    subject,
    html,
    text,
    csv,
    filename,
    idempotencyKey: `adact-viewer-weekly-${dateKey}`,
  });
  console.log(`Weekly report sent successfully (${emailId}).`);
}

main().catch((error) => {
  console.error(`Weekly usage report failed: ${error.message}`);
  process.exitCode = 1;
});
