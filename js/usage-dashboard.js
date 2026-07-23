const firebaseSdkVersion = "12.16.0";
const config = window.ADACT_FIREBASE_CONFIG || {};
const requiredConfigKeys = ["apiKey", "authDomain", "projectId", "appId"];
const configured = requiredConfigKeys.every((key) => String(config[key] || "").trim());
const adminEmails = (config.adminEmails || []).map((email) => String(email).toLowerCase());
const elements = {
  loginPanel: document.querySelector("[data-role='login-panel']"),
  loginStatus: document.querySelector("[data-role='login-status']"),
  dashboard: document.querySelector("[data-role='dashboard']"),
  dashboardStatus: document.querySelector("[data-role='dashboard-status']"),
  signOut: document.querySelector("[data-action='sign-out']"),
  projectCount: document.querySelector("[data-role='project-count']"),
  visitorCount: document.querySelector("[data-role='visitor-count']"),
  toolCount: document.querySelector("[data-role='tool-count']"),
  assetCount: document.querySelector("[data-role='asset-count']"),
  toolList: document.querySelector("[data-role='tool-list']"),
  projectRows: document.querySelector("[data-role='project-rows']"),
  search: document.querySelector("[data-role='project-search']"),
  empty: document.querySelector("[data-role='empty-state']"),
};
let services = null;
let projects = [];
let toolEvents = [];

function setLoginStatus(message) {
  elements.loginStatus.textContent = message || "";
}

function setDashboardStatus(message) {
  elements.dashboardStatus.textContent = message || "";
}

function isAllowedAdmin(user) {
  return Boolean(user?.email && user.emailVerified && adminEmails.includes(user.email.toLowerCase()));
}

async function initializeDashboard() {
  if (!configured) {
    setLoginStatus("Firebase is not configured yet. Complete FIREBASE_SETUP.md, then add the web configuration.");
    return;
  }

  const [
    { initializeApp },
    { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut },
    { collection, getDocs, getFirestore, limit, orderBy, query },
  ] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-firestore.js`),
  ]);
  const app = initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    appId: config.appId,
  });
  services = {
    auth: getAuth(app),
    db: getFirestore(app),
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    collection,
    getDocs,
    limit,
    orderBy,
    query,
  };
  onAuthStateChanged(services.auth, handleAuthChange);
}

async function handleAuthChange(user) {
  if (!user) {
    elements.loginPanel.hidden = false;
    elements.dashboard.hidden = true;
    elements.signOut.hidden = true;
    return;
  }
  if (!isAllowedAdmin(user)) {
    setLoginStatus(`${user.email || "That account"} is not authorised to view this register.`);
    await services.signOut(services.auth);
    return;
  }
  elements.loginPanel.hidden = true;
  elements.dashboard.hidden = false;
  elements.signOut.hidden = false;
  await loadDashboard();
}

async function signIn() {
  if (!services) {
    setLoginStatus("Firebase is not configured yet.");
    return;
  }
  setLoginStatus("Opening secure Google sign-in...");
  try {
    const provider = new services.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await services.signInWithPopup(services.auth, provider);
    setLoginStatus("");
  } catch (error) {
    setLoginStatus(error?.message || "Sign-in was not completed.");
  }
}

async function loadDashboard() {
  setDashboardStatus("Loading the private project register...");
  try {
    const projectQuery = services.query(
      services.collection(services.db, "project_uploads"),
      services.orderBy("created_at", "desc"),
      services.limit(500),
    );
    const toolQuery = services.query(
      services.collection(services.db, "tool_events"),
      services.orderBy("created_at", "desc"),
      services.limit(2000),
    );
    const [projectSnapshot, toolSnapshot] = await Promise.all([
      services.getDocs(projectQuery),
      services.getDocs(toolQuery),
    ]);
    projects = projectSnapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
    toolEvents = toolSnapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
    renderDashboard();
    setDashboardStatus(`Updated ${new Date().toLocaleString("en-AU")}.`);
  } catch (error) {
    setDashboardStatus(error?.message || "The project register could not be loaded.");
  }
}

function toolLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(timestamp) {
  const date = timestamp?.toDate?.();
  return date instanceof Date && !Number.isNaN(date.valueOf())
    ? date.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })
    : "Pending";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function projectToolCounts(projectId) {
  const counts = new Map();
  toolEvents.forEach((event) => {
    if (!(event.project_ids || []).includes(projectId)) return;
    counts.set(event.tool_name, (counts.get(event.tool_name) || 0) + 1);
  });
  return counts;
}

function formatProjectTools(projectId) {
  const entries = Array.from(projectToolCounts(projectId).entries())
    .sort((left, right) => right[1] - left[1]);
  if (!entries.length) return "None yet";
  const visible = entries.slice(0, 3).map(([name, count]) => `${toolLabel(name)}${count > 1 ? ` (${count})` : ""}`);
  return `${visible.join(", ")}${entries.length > 3 ? ` +${entries.length - 3}` : ""}`;
}

function locationLink(project) {
  const latitude = Number(project.centre_latitude);
  const longitude = Number(project.centre_longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "Not mapped";
  const href = `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`;
  return `<a href="${href}" target="_blank" rel="noopener">${latitude.toFixed(5)}, ${longitude.toFixed(5)}</a>`;
}

function renderDashboard() {
  elements.projectCount.textContent = projects.length.toLocaleString("en-AU");
  elements.visitorCount.textContent = new Set(projects.map((project) => project.visitor_id).filter(Boolean)).size.toLocaleString("en-AU");
  elements.toolCount.textContent = toolEvents.length.toLocaleString("en-AU");
  elements.assetCount.textContent = projects.reduce((sum, project) => sum + (Number(project.asset_count) || 0), 0).toLocaleString("en-AU");

  const toolTotals = new Map();
  toolEvents.forEach((event) => toolTotals.set(event.tool_name, (toolTotals.get(event.tool_name) || 0) + 1));
  elements.toolList.innerHTML = Array.from(toolTotals.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => `<div><span>${escapeHtml(toolLabel(name))}</span><strong>${count.toLocaleString("en-AU")}</strong></div>`)
    .join("") || "<div><span>No tool activity yet</span><strong>0</strong></div>";
  renderProjectRows();
}

function renderProjectRows() {
  const search = String(elements.search.value || "").trim().toLowerCase();
  const filtered = projects.filter((project) => {
    if (!search) return true;
    return [
      project.project_name,
      project.surveyor_name,
      project.engineer_name,
      project.receiver,
      project.software_product,
      project.schema_version,
    ].some((value) => String(value || "").toLowerCase().includes(search));
  });

  elements.projectRows.innerHTML = filtered.map((project) => `
    <tr>
      <td>${escapeHtml(formatDate(project.created_at))}</td>
      <td><strong>${escapeHtml(project.project_name || "Unnamed project")}</strong><small>${escapeHtml(project.coordinate_system || "")} ${escapeHtml(project.horizontal_datum || "")}</small></td>
      <td>${escapeHtml(project.surveyor_name || "Not supplied")}</td>
      <td>${escapeHtml(project.engineer_name || "Not supplied")}</td>
      <td>${escapeHtml(project.receiver || "Not supplied")}</td>
      <td>${escapeHtml(project.software_product || "Not supplied")}</td>
      <td>${locationLink(project)}</td>
      <td>${escapeHtml(project.schema_version || "Unknown")}</td>
      <td>${Number(project.asset_count || 0).toLocaleString("en-AU")}</td>
      <td>${escapeHtml(formatProjectTools(project.id))}</td>
    </tr>
  `).join("");
  elements.empty.hidden = Boolean(filtered.length);
}

function downloadCsv() {
  const headers = ["Loaded", "Project", "Surveyor", "Engineer", "Receiver", "Software product", "Latitude", "Longitude", "Coordinate system", "Datum", "Schema", "Assets", "Tools"];
  const rows = projects.map((project) => [
    formatDate(project.created_at),
    project.project_name,
    project.surveyor_name,
    project.engineer_name,
    project.receiver,
    project.software_product,
    project.centre_latitude,
    project.centre_longitude,
    project.coordinate_system,
    project.horizontal_datum,
    project.schema_version,
    project.asset_count,
    formatProjectTools(project.id),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `adact-viewer-usage-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("click", async (event) => {
  const action = event.target.closest?.("[data-action]")?.dataset.action;
  if (action === "sign-in") await signIn();
  if (action === "sign-out" && services) await services.signOut(services.auth);
  if (action === "refresh") await loadDashboard();
  if (action === "download-csv") downloadCsv();
});

elements.search.addEventListener("input", renderProjectRows);
initializeDashboard().catch((error) => setLoginStatus(error?.message || "The dashboard could not start."));
