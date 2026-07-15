/* global DxfParser */
"use strict";

importScripts("./vendor/dxf-parser/dxf-parser.js");

const MAX_ENTITIES = 250000;
const MAX_POINTS = 1500000;
const TAU = Math.PI * 2;

self.addEventListener("message", (event) => {
  const message = event.data || {};
  if (message.type !== "parse") return;
  try {
    const parser = new DxfParser();
    const document = parser.parseSync(String(message.text || ""));
    const reference = normalizeDxfDocument(document, String(message.fileName || "Reference drawing.dxf"));
    self.postMessage({ type: "parsed", requestId: message.requestId, reference });
  } catch (error) {
    self.postMessage({
      type: "error",
      requestId: message.requestId,
      message: error instanceof Error ? error.message : String(error || "The DXF could not be parsed."),
    });
  }
});

function normalizeDxfDocument(document, fileName) {
  if (!document || !Array.isArray(document.entities)) {
    throw new Error("The file does not contain a readable DXF model space.");
  }

  const layerRecords = document.tables?.layer?.layers || {};
  const entities = [];
  const unsupported = new Map();
  const stats = { sourceEntities: 0, points: 0, approximate: 0 };
  const context = { document, layerRecords, entities, unsupported, stats };

  document.entities.forEach((entity) => {
    appendEntity(context, entity, identityTransform(), entity.layer || "0", 0);
  });

  if (!entities.length) {
    throw new Error("No supported model-space geometry was found in this DXF.");
  }

  const layers = buildLayers(entities, layerRecords);
  const bounds = getBounds(entities);
  return {
    name: fileName,
    format: "DXF",
    version: String(document.header?.$ACADVER || "").trim(),
    unitsCode: finiteNumber(document.header?.$INSUNITS) ?? 0,
    unitsLabel: getDxfUnitsLabel(document.header?.$INSUNITS),
    entities,
    layers,
    bounds,
    sourceEntityCount: stats.sourceEntities,
    approximateEntityCount: stats.approximate,
    unsupported: Array.from(unsupported.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type)),
  };
}

function appendEntity(context, entity, transform, inheritedLayer, depth) {
  if (!entity || entity.visible === false || entity.inPaperSpace) return;
  if (context.entities.length >= MAX_ENTITIES || context.stats.points >= MAX_POINTS) {
    throw new Error("This DXF is too large for the browser reference viewer. Hide or remove unnecessary CAD layers and export a smaller DXF.");
  }

  context.stats.sourceEntities += 1;
  const sourceType = String(entity.type || "UNKNOWN").toUpperCase();
  const layer = entity.layer && entity.layer !== "0" ? entity.layer : (inheritedLayer || "0");
  const color = getEntityColor(entity, layer, context.layerRecords);

  if (sourceType === "INSERT") {
    appendInsert(context, entity, transform, layer, depth);
    return;
  }

  let normalized = null;
  if (sourceType === "POINT") {
    normalized = makePointEntity(entity.position, transform);
  } else if (sourceType === "LINE") {
    normalized = makePathEntity(entity.vertices, false, transform);
  } else if (sourceType === "LWPOLYLINE" || sourceType === "POLYLINE") {
    const closed = Boolean(entity.shape);
    normalized = makePathEntity(expandBulgedPolyline(entity.vertices || [], closed), closed, transform);
  } else if (sourceType === "ARC") {
    normalized = makePathEntity(sampleArc(entity), false, transform);
  } else if (sourceType === "CIRCLE") {
    normalized = makePathEntity(sampleCircle(entity), true, transform);
  } else if (sourceType === "ELLIPSE") {
    const ellipse = sampleEllipse(entity);
    normalized = makePathEntity(ellipse.points, ellipse.closed, transform);
  } else if (sourceType === "SPLINE") {
    const points = entity.fitPoints?.length ? entity.fitPoints : (entity.controlPoints || []);
    normalized = makePathEntity(points, Boolean(entity.closed), transform);
    if (normalized) context.stats.approximate += 1;
  } else if (sourceType === "SOLID" || sourceType === "3DFACE") {
    normalized = makePathEntity(entity.points || entity.vertices || [], true, transform);
  } else if (sourceType === "TEXT" || sourceType === "MTEXT" || sourceType === "ATTDEF") {
    const position = entity.position || entity.startPoint;
    normalized = makeTextEntity(entity, position, transform);
  }

  if (!normalized) {
    context.unsupported.set(sourceType, (context.unsupported.get(sourceType) || 0) + 1);
    return;
  }

  normalized.id = `dxf-entity-${context.entities.length + 1}`;
  normalized.sourceType = sourceType;
  normalized.layer = layer;
  normalized.color = color;
  normalized.handle = String(entity.handle || "");
  normalized.lineType = String(entity.lineType || "");
  normalized.lineweight = finiteNumber(entity.lineweight);
  context.stats.points += normalized.points.length;
  context.entities.push(normalized);
}

function appendInsert(context, entity, parentTransform, inheritedLayer, depth) {
  if (depth >= 8) {
    context.unsupported.set("NESTED INSERT", (context.unsupported.get("NESTED INSERT") || 0) + 1);
    return;
  }
  const block = context.document.blocks?.[entity.name];
  if (!block || !Array.isArray(block.entities)) {
    const marker = makePointEntity(entity.position, parentTransform);
    if (marker) {
      marker.id = `dxf-entity-${context.entities.length + 1}`;
      marker.sourceType = "INSERT";
      marker.layer = inheritedLayer;
      marker.color = getEntityColor(entity, inheritedLayer, context.layerRecords);
      marker.blockName = String(entity.name || "");
      context.stats.points += marker.points.length;
      context.entities.push(marker);
    }
    return;
  }

  const columnCount = clampInteger(entity.columnCount, 1, 100, 1);
  const rowCount = clampInteger(entity.rowCount, 1, 100, 1);
  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      const insertTransform = makeInsertTransform(entity, block, column, row);
      const combined = multiplyTransforms(parentTransform, insertTransform);
      block.entities.forEach((child) => appendEntity(context, child, combined, inheritedLayer, depth + 1));
    }
  }
}

function makePointEntity(sourcePoint, transform) {
  const value = normalizePoint(sourcePoint);
  if (!value) return null;
  return { geometryKind: "Point", points: [applyTransform(value, transform)], closed: false };
}

function makePathEntity(sourcePoints, closed, transform) {
  const points = (sourcePoints || [])
    .map(normalizePoint)
    .filter(Boolean)
    .map((point) => applyTransform(point, transform));
  if (points.length < 2) return null;
  return { geometryKind: closed ? "Polygon" : "Line", points, closed: Boolean(closed) };
}

function makeTextEntity(entity, sourcePoint, transform) {
  const value = normalizePoint(sourcePoint);
  const text = cleanDxfText(entity.text);
  if (!value || !text) return null;
  return {
    geometryKind: "Text",
    points: [applyTransform(value, transform)],
    closed: false,
    text,
    textHeight: finiteNumber(entity.textHeight ?? entity.height),
    rotation: finiteNumber(entity.rotation) ?? 0,
  };
}

function expandBulgedPolyline(vertices, closed) {
  const source = (vertices || []).map(normalizePoint).filter(Boolean);
  if (source.length < 2) return source;
  const result = [source[0]];
  const segmentCount = closed ? source.length : source.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const start = source[index];
    const end = source[(index + 1) % source.length];
    const bulge = finiteNumber(vertices[index]?.bulge) || 0;
    if (Math.abs(bulge) < 1e-9) {
      result.push(end);
    } else {
      sampleBulge(start, end, bulge).slice(1).forEach((point) => result.push(point));
    }
  }
  if (closed && pointsEqual(result[0], result[result.length - 1])) result.pop();
  return result;
}

function sampleBulge(start, end, bulge) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const chord = Math.hypot(dx, dy);
  if (!(chord > 0)) return [start, end];
  const sweep = 4 * Math.atan(bulge);
  const offset = chord * (1 - bulge * bulge) / (4 * bulge);
  const center = {
    x: (start.x + end.x) / 2 + (-dy / chord) * offset,
    y: (start.y + end.y) / 2 + (dx / chord) * offset,
    z: start.z,
  };
  const radius = Math.hypot(start.x - center.x, start.y - center.y);
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  const segments = Math.max(4, Math.min(128, Math.ceil(Math.abs(sweep) / (Math.PI / 18))));
  return Array.from({ length: segments + 1 }, (_unused, index) => {
    const angle = startAngle + sweep * (index / segments);
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
      z: interpolateNumber(start.z, end.z, index / segments),
    };
  });
}

function sampleArc(entity) {
  const center = normalizePoint(entity.center);
  const radius = finiteNumber(entity.radius);
  const start = finiteNumber(entity.startAngle);
  let end = finiteNumber(entity.endAngle);
  if (!center || !(radius > 0) || start === null || end === null) return [];
  while (end <= start) end += TAU;
  const sweep = end - start;
  const segments = Math.max(8, Math.min(180, Math.ceil(sweep / (Math.PI / 36))));
  return Array.from({ length: segments + 1 }, (_unused, index) => {
    const angle = start + sweep * (index / segments);
    return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle), z: center.z };
  });
}

function sampleCircle(entity) {
  const center = normalizePoint(entity.center);
  const radius = finiteNumber(entity.radius);
  if (!center || !(radius > 0)) return [];
  return Array.from({ length: 72 }, (_unused, index) => {
    const angle = TAU * index / 72;
    return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle), z: center.z };
  });
}

function sampleEllipse(entity) {
  const center = normalizePoint(entity.center);
  const major = normalizePoint(entity.majorAxisEndPoint);
  const ratio = finiteNumber(entity.axisRatio);
  const start = finiteNumber(entity.startAngle) ?? 0;
  let end = finiteNumber(entity.endAngle) ?? TAU;
  if (!center || !major || !(ratio > 0)) return { points: [], closed: false };
  while (end <= start) end += TAU;
  const sweep = Math.min(TAU, end - start);
  const closed = Math.abs(sweep - TAU) < 1e-6;
  const segments = Math.max(16, Math.min(180, Math.ceil(sweep / (Math.PI / 36))));
  const count = closed ? segments : segments + 1;
  const points = Array.from({ length: count }, (_unused, index) => {
    const angle = start + sweep * (index / segments);
    return {
      x: center.x + major.x * Math.cos(angle) - major.y * ratio * Math.sin(angle),
      y: center.y + major.y * Math.cos(angle) + major.x * ratio * Math.sin(angle),
      z: center.z,
    };
  });
  return { points, closed };
}

function makeInsertTransform(entity, block, column, row) {
  const position = normalizePoint(entity.position) || { x: 0, y: 0, z: 0 };
  const base = normalizePoint(block.position) || { x: 0, y: 0, z: 0 };
  const xScale = finiteNumber(entity.xScale) ?? 1;
  const yScale = finiteNumber(entity.yScale) ?? 1;
  const zScale = finiteNumber(entity.zScale) ?? 1;
  const rotation = (finiteNumber(entity.rotation) ?? 0) * Math.PI / 180;
  const columnOffset = column * (finiteNumber(entity.columnSpacing) ?? 0);
  const rowOffset = row * (finiteNumber(entity.rowSpacing) ?? 0);
  const localOffset = translationTransform(columnOffset - base.x, rowOffset - base.y, -base.z);
  const scale = scaleTransform(xScale, yScale, zScale);
  const rotate = rotationTransform(rotation);
  const translate = translationTransform(position.x, position.y, position.z);
  return multiplyTransforms(translate, multiplyTransforms(rotate, multiplyTransforms(scale, localOffset)));
}

function identityTransform() {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, zScale: 1, zOffset: 0 };
}

function translationTransform(x, y, z) {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y, zScale: 1, zOffset: z || 0 };
}

function scaleTransform(x, y, z) {
  return { a: x, b: 0, c: 0, d: y, e: 0, f: 0, zScale: z, zOffset: 0 };
}

function rotationTransform(angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return { a: cosine, b: sine, c: -sine, d: cosine, e: 0, f: 0, zScale: 1, zOffset: 0 };
}

function multiplyTransforms(parent, child) {
  return {
    a: parent.a * child.a + parent.c * child.b,
    b: parent.b * child.a + parent.d * child.b,
    c: parent.a * child.c + parent.c * child.d,
    d: parent.b * child.c + parent.d * child.d,
    e: parent.a * child.e + parent.c * child.f + parent.e,
    f: parent.b * child.e + parent.d * child.f + parent.f,
    zScale: parent.zScale * child.zScale,
    zOffset: parent.zScale * child.zOffset + parent.zOffset,
  };
}

function applyTransform(point, transform) {
  return {
    x: transform.a * point.x + transform.c * point.y + transform.e,
    y: transform.b * point.x + transform.d * point.y + transform.f,
    z: point.z === null ? null : transform.zScale * point.z + transform.zOffset,
  };
}

function buildLayers(entities, layerRecords) {
  const counts = new Map();
  entities.forEach((entity) => counts.set(entity.layer, (counts.get(entity.layer) || 0) + 1));
  return Array.from(counts.entries())
    .map(([name, entityCount]) => {
      const record = layerRecords?.[name] || {};
      return {
        name,
        entityCount,
        visible: record.visible !== false && !record.frozen,
        color: colorIntegerToHex(record.color) || "#718096",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function getBounds(entities) {
  let bounds = null;
  entities.forEach((entity) => {
    (entity.points || []).forEach((point) => {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
      if (!bounds) bounds = { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y };
      else {
        bounds.minX = Math.min(bounds.minX, point.x);
        bounds.minY = Math.min(bounds.minY, point.y);
        bounds.maxX = Math.max(bounds.maxX, point.x);
        bounds.maxY = Math.max(bounds.maxY, point.y);
      }
    });
  });
  return bounds;
}

function getEntityColor(entity, layer, layerRecords) {
  return colorIntegerToHex(entity.color) || colorIntegerToHex(layerRecords?.[layer]?.color) || "#718096";
}

function colorIntegerToHex(value) {
  const numeric = finiteNumber(value);
  if (numeric === null || numeric < 0 || numeric > 0xffffff) return "";
  return `#${Math.round(numeric).toString(16).padStart(6, "0")}`;
}

function normalizePoint(value) {
  if (!value) return null;
  const x = finiteNumber(value.x ?? value[0]);
  const y = finiteNumber(value.y ?? value[1]);
  const z = finiteNumber(value.z ?? value[2]);
  return x === null || y === null ? null : { x, y, z };
}

function finiteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function interpolateNumber(start, end, fraction) {
  if (start === null || end === null) return start ?? end ?? null;
  return start + (end - start) * fraction;
}

function pointsEqual(first, second) {
  return Boolean(first && second && Math.abs(first.x - second.x) < 1e-9 && Math.abs(first.y - second.y) < 1e-9);
}

function clampInteger(value, minimum, maximum, fallback) {
  const numeric = Math.round(Number(value));
  return Number.isFinite(numeric) ? Math.max(minimum, Math.min(maximum, numeric)) : fallback;
}

function cleanDxfText(value) {
  return String(value || "")
    .replace(/\\P/gi, " ")
    .replace(/\\[A-Za-z][^;]*;/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function getDxfUnitsLabel(value) {
  const labels = {
    0: "Unitless",
    1: "Inches",
    2: "Feet",
    3: "Miles",
    4: "Millimetres",
    5: "Centimetres",
    6: "Metres",
    7: "Kilometres",
    8: "Microinches",
    9: "Mils",
    10: "Yards",
    11: "Angstroms",
    12: "Nanometres",
    13: "Microns",
    14: "Decimetres",
    15: "Decametres",
    16: "Hectometres",
  };
  return labels[Math.round(Number(value) || 0)] || "Unknown";
}
