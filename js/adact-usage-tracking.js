const firebaseSdkVersion = "12.16.0";
const firebaseConfig = window.ADACT_FIREBASE_CONFIG || {};
const requiredConfigKeys = ["apiKey", "authDomain", "projectId", "appId"];
const isConfigured = firebaseConfig.trackingEnabled !== false
  && requiredConfigKeys.every((key) => String(firebaseConfig[key] || "").trim());
const consentStorageKey = `adact-project-tracking-consent:${firebaseConfig.consentVersion || "1"}`;
const sessionStorageKey = "adact-project-tracking-session";
const pendingEvents = [];
const projectIdsByFileId = new Map();
let firebaseServices = null;
let initializationPromise = null;
let projectWriteChain = Promise.resolve();
let projectGeneration = 0;

function getConsent() {
  if (firebaseConfig.consentRequired === false) return "allowed";
  try {
    return window.localStorage.getItem(consentStorageKey) || "";
  } catch (error) {
    return "";
  }
}

function setConsent(value) {
  try {
    window.localStorage.setItem(consentStorageKey, value);
  } catch (error) {
    // Tracking can still continue for the current page if storage is unavailable.
  }
}

function getSessionId() {
  try {
    let id = window.sessionStorage.getItem(sessionStorageKey);
    if (!id) {
      id = window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(sessionStorageKey, id);
    }
    return id;
  } catch (error) {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function setTrackingStatus(status) {
  document.documentElement.dataset.projectTracking = status;
  window.dispatchEvent(new CustomEvent("adact:tracking-status", { detail: { status } }));
}

function showConsentModal() {
  const modal = document.querySelector("[data-role='usage-consent-modal']");
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("usage-consent-open");
  modal.querySelector("[data-action='allow-project-tracking']")?.focus();
}

function hideConsentModal() {
  const modal = document.querySelector("[data-role='usage-consent-modal']");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("usage-consent-open");
}

async function initializeFirebase() {
  if (!isConfigured) {
    setTrackingStatus("not-configured");
    return null;
  }
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    setTrackingStatus("connecting");
    const [
      { initializeApp },
      { getAuth, onAuthStateChanged, signInAnonymously },
      { addDoc, collection, getFirestore, serverTimestamp },
    ] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${firebaseSdkVersion}/firebase-firestore.js`),
    ]);

    const app = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
    });
    const auth = getAuth(app);
    const db = getFirestore(app);
    let user = auth.currentUser;
    if (!user) {
      user = await new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            unsubscribe();
            resolve(currentUser);
            return;
          }
          try {
            const credential = await signInAnonymously(auth);
            unsubscribe();
            resolve(credential.user);
          } catch (error) {
            unsubscribe();
            reject(error);
          }
        }, reject);
      });
    }

    firebaseServices = { addDoc, collection, db, serverTimestamp, user };
    setTrackingStatus("ready");
    return firebaseServices;
  })().catch((error) => {
    console.warn("ADACT project tracking is unavailable.", error);
    setTrackingStatus("unavailable");
    return null;
  });

  return initializationPromise;
}

function cleanString(value, maximumLength = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

function cleanNumber(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

function cleanProject(project) {
  const location = project.location || {};
  const cleaned = {
    local_file_id: cleanString(project.localFileId, 80),
    project_name: cleanString(project.projectName),
    surveyor_name: cleanString(project.surveyorName),
    engineer_name: cleanString(project.engineerName),
    receiver: cleanString(project.receiver),
    software_product: cleanString(project.softwareProduct),
    schema_version: cleanString(project.schemaVersion, 24),
    asset_count: Math.round(Math.max(0, Math.min(1000000, Number(project.assetCount) || 0))),
    coordinate_system: cleanString(project.coordinateSystem, 80),
    horizontal_datum: cleanString(project.horizontalDatum, 40),
    session_id: getSessionId(),
    page_path: window.location.pathname,
    source: "uploaded_xml",
  };
  const centreLatitude = cleanNumber(location.centreLatitude, -90, 90);
  const centreLongitude = cleanNumber(location.centreLongitude, -180, 180);
  const minimumLatitude = cleanNumber(location.minimumLatitude, -90, 90);
  const maximumLatitude = cleanNumber(location.maximumLatitude, -90, 90);
  const minimumLongitude = cleanNumber(location.minimumLongitude, -180, 180);
  const maximumLongitude = cleanNumber(location.maximumLongitude, -180, 180);
  if (centreLatitude !== null) cleaned.centre_latitude = centreLatitude;
  if (centreLongitude !== null) cleaned.centre_longitude = centreLongitude;
  if (minimumLatitude !== null) cleaned.minimum_latitude = minimumLatitude;
  if (maximumLatitude !== null) cleaned.maximum_latitude = maximumLatitude;
  if (minimumLongitude !== null) cleaned.minimum_longitude = minimumLongitude;
  if (maximumLongitude !== null) cleaned.maximum_longitude = maximumLongitude;
  return cleaned;
}

async function writeProjects(projects, generation) {
  const services = await initializeFirebase();
  if (!services) return;

  for (const project of projects) {
    const cleaned = cleanProject(project);
    const reference = await services.addDoc(services.collection(services.db, "project_uploads"), {
      ...cleaned,
      visitor_id: services.user.uid,
      created_at: services.serverTimestamp(),
    });
    if (generation === projectGeneration && cleaned.local_file_id) {
      projectIdsByFileId.set(cleaned.local_file_id, reference.id);
    }
  }
}

async function writeToolEvent(toolEvent) {
  const services = await initializeFirebase();
  if (!services) return;
  await projectWriteChain;
  const projectIds = Array.from(projectIdsByFileId.values()).slice(0, 20);
  await services.addDoc(services.collection(services.db, "tool_events"), {
    visitor_id: services.user.uid,
    session_id: getSessionId(),
    project_ids: projectIds,
    tool_name: cleanString(toolEvent.toolName, 80),
    page_path: window.location.pathname,
    created_at: services.serverTimestamp(),
  });
}

function processPendingEvents() {
  if (getConsent() !== "allowed") return;
  while (pendingEvents.length) {
    const event = pendingEvents.shift();
    if (event.type === "projects") {
      projectWriteChain = projectWriteChain
        .then(() => writeProjects(event.projects, event.generation))
        .catch((error) => console.warn("ADACT project record could not be saved.", error));
    } else if (event.type === "tool") {
      writeToolEvent(event).catch((error) => console.warn("ADACT tool event could not be saved.", error));
    }
  }
}

function queueEvent(event) {
  if (!isConfigured || getConsent() === "declined") return;
  pendingEvents.push(event);
  if (getConsent() === "allowed") {
    processPendingEvents();
  } else {
    showConsentModal();
  }
}

window.addEventListener("adact:xml-loaded", (event) => {
  const projects = Array.isArray(event.detail?.projects) ? event.detail.projects : [];
  if (projects.length) queueEvent({ type: "projects", projects, generation: projectGeneration });
});

window.addEventListener("adact:viewer-projects-cleared", () => {
  projectGeneration += 1;
  projectIdsByFileId.clear();
});

window.addEventListener("adact:viewer-tool", (event) => {
  const toolName = cleanString(event.detail?.toolName, 80);
  if (toolName) queueEvent({ type: "tool", toolName });
});

document.addEventListener("click", (event) => {
  const action = event.target.closest?.("[data-action]")?.dataset.action;
  if (action === "allow-project-tracking") {
    setConsent("allowed");
    hideConsentModal();
    initializeFirebase().then(processPendingEvents);
  } else if (action === "decline-project-tracking") {
    setConsent("declined");
    pendingEvents.length = 0;
    hideConsentModal();
    setTrackingStatus("declined");
  }
});

window.ADACTUsage = Object.freeze({
  isConfigured: () => Boolean(isConfigured),
  getConsent,
  getStatus: () => document.documentElement.dataset.projectTracking || "idle",
});

setTrackingStatus(isConfigured ? (getConsent() || "awaiting-consent") : "not-configured");
if (isConfigured && getConsent() === "allowed") initializeFirebase();
