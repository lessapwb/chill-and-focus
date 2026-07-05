(() => {
const BLOCKER_SCRIPT_VERSION = "2026-07-04-context-safe";

if (typeof globalThis.__chillfoBlockerCleanup === "function") {
  globalThis.__chillfoBlockerCleanup();
}

globalThis.__chillfoBlockerVersion = BLOCKER_SCRIPT_VERSION;

const BLOCKER_HOST_ID = "chillfo-blocker-host";
const STATUS_POLL_MS = 1000;
const BLOCKER_TEXT = {
  en: {
    blockedDetail: "Daily limit: {limit} minutes total across tracked sites. Current total: {total} minutes. {host}: {site} minutes today.",
    blockedEyebrow: "Time limit reached",
    blockedTitle: "Chill & Focus blocked this page",
    closeInstruction: "Close this tab to keep your focus.",
    defaultMessage: "Time is up on {host}.",
    motivation: "You already made the decision. Protect the next few minutes."
  },
  pt: {
    blockedDetail: "Limite diário: {limit} minutos no total em sites rastreados. Total atual: {total} minutos. {host}: {site} minutos hoje.",
    blockedEyebrow: "Limite de tempo atingido",
    blockedTitle: "Chill & Focus bloqueou esta página",
    closeInstruction: "Feche esta aba para manter o foco.",
    defaultMessage: "O tempo acabou em {host}.",
    motivation: "Você já tomou a decisão. Proteja os próximos minutos."
  }
};
let statusTimer = null;
let contextActive = true;

if (!addRuntimeMessageListener()) {
  deactivateBlocker();
  return;
}

window.addEventListener("focus", handleFocus);
window.addEventListener("unhandledrejection", handleUnhandledRejection);
window.addEventListener("error", handleWindowError);
document.addEventListener("visibilitychange", handleVisibilityChange);

globalThis.__chillfoBlockerCleanup = deactivateBlocker;

function deactivateBlocker() {
  contextActive = false;
  window.clearTimeout(statusTimer);
  statusTimer = null;
  removeRuntimeMessageListener();
  window.removeEventListener("focus", handleFocus);
  window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  window.removeEventListener("error", handleWindowError);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
}

checkPageStatus();

function handleRuntimeMessage(message) {
  if (!message || typeof message.type !== "string") {
    return;
  }

  if (message.type === "BLOCK_CHILLFO_SITE") {
    showBlocker(message);
  }

  if (message.type === "UNBLOCK_CHILLFO_SITE") {
    removeBlocker();
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    checkPageStatus();
  }
}

function handleFocus() {
  checkPageStatus();
}

function checkPageStatus() {
  void requestPageStatus().catch(handleAsyncError);
}

async function requestPageStatus() {
  if (!contextActive) {
    return;
  }

  window.clearTimeout(statusTimer);

  const response = await sendMessage({
    type: "GET_PAGE_STATUS",
    url: window.location.href
  });

  if (!response || !response.ok) {
    return;
  }

  if (response.blocked) {
    showBlocker(response);
    return;
  }

  removeBlocker();
  scheduleNextStatusCheck(response);
}

function scheduleNextStatusCheck(status) {
  if (!contextActive || !status.enabled || !status.tracked || document.visibilityState !== "visible") {
    return;
  }

  const limitSeconds = Math.max(60, Number.parseInt(status.limitMinutes, 10) * 60 || 60);
  const trackedSeconds = Math.max(0, Number.parseInt(status.totalSeconds ?? status.todaySeconds, 10) || 0);
  const remainingMs = Math.max(1000, (limitSeconds - trackedSeconds) * 1000);
  const nextCheckMs = Math.min(remainingMs, STATUS_POLL_MS);

  statusTimer = window.setTimeout(checkPageStatus, nextCheckMs);
}

function showBlocker(status) {
  const existingBlocker = document.getElementById(BLOCKER_HOST_ID);
  if (existingBlocker) {
    updateBlocker(existingBlocker.shadowRoot, status);
    return;
  }

  const language = normalizeLanguage(status.language);
  const host = document.createElement("div");
  host.id = BLOCKER_HOST_ID;
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483647";
  document.documentElement.appendChild(host);
  document.documentElement.dataset.chillfoBlocked = "true";

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .blocker {
        display: grid;
        place-items: center;
        width: 100vw;
        min-height: 100vh;
        box-sizing: border-box;
        padding: 24px;
        background: #f8fafc;
        color: #111827;
      }

      .panel {
        width: min(560px, 100%);
        box-sizing: border-box;
        border: 1px solid rgba(17, 24, 39, 0.12);
        border-radius: 8px;
        background: #ffffff;
        padding: 28px;
        box-shadow: 0 28px 80px rgba(17, 24, 39, 0.24);
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        border-radius: 999px;
        padding: 0 10px;
        background: #fee2e2;
        color: #991b1b;
        font-size: 12px;
        font-weight: 800;
        line-height: 1;
        text-transform: uppercase;
      }

      h1 {
        margin: 14px 0 8px;
        color: #111827;
        font-size: 28px;
        line-height: 1.15;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        color: #4b5563;
        font-size: 15px;
        line-height: 1.55;
      }

      .detail {
        margin-top: 10px;
      }

      .close-note {
        margin-top: 22px;
        border-radius: 8px;
        background: #ecfdf5;
        padding: 14px;
        color: #0f766e;
        text-align: center;
      }

      .close-note strong {
        display: block;
        color: #0f766e;
        font-size: 15px;
        line-height: 1.4;
      }

      .close-note span {
        display: block;
        margin-top: 4px;
        color: #315d59;
        font-size: 13px;
        line-height: 1.45;
      }

      @media (max-width: 520px) {
        .panel {
          padding: 22px;
        }

        h1 {
          font-size: 24px;
        }
      }
    </style>
    <main class="blocker" role="dialog" aria-modal="true" aria-labelledby="chillfo-title">
      <section class="panel">
        <span class="eyebrow">${translate(language, "blockedEyebrow")}</span>
        <h1 id="chillfo-title">${translate(language, "blockedTitle")}</h1>
        <p class="message"></p>
        <p class="detail"></p>
        <div class="close-note">
          <strong>${translate(language, "closeInstruction")}</strong>
          <span>${translate(language, "motivation")}</span>
        </div>
      </section>
    </main>
  `;

  updateBlocker(shadow, status);
}

function updateBlocker(shadow, status) {
  if (!shadow) {
    return;
  }

  const host = status.host || "this site";
  const language = normalizeLanguage(status.language);
  const minutes = Math.max(1, Number.parseInt(status.minutes, 10) || 1);
  const siteMinutes = Math.max(0, Number.parseInt(status.siteMinutes, 10) || 0);
  const limitMinutes = Math.max(1, Number.parseInt(status.limitMinutes, 10) || 1);
  const message = status.message || translate(language, "defaultMessage", { host });

  shadow.querySelector(".message").textContent = message;
  shadow.querySelector(".detail").textContent = translate(language, "blockedDetail", {
    host,
    limit: limitMinutes,
    site: siteMinutes,
    total: minutes
  });
}

function normalizeLanguage(language) {
  return language === "pt" ? "pt" : "en";
}

function translate(language, key, values = {}) {
  const normalizedLanguage = normalizeLanguage(language);
  const template =
    BLOCKER_TEXT[normalizedLanguage][key] ||
    BLOCKER_TEXT.en[key] ||
    key;

  return template.replace(/\{(\w+)\}/g, (_match, token) => {
    return Object.prototype.hasOwnProperty.call(values, token) ? values[token] : "";
  });
}

function removeBlocker() {
  const existingBlocker = document.getElementById(BLOCKER_HOST_ID);
  if (existingBlocker) {
    existingBlocker.remove();
  }
  delete document.documentElement.dataset.chillfoBlocked;
}

function sendMessage(message) {
  return new Promise((resolve) => {
    if (!contextActive || !isRuntimeAvailable()) {
      resolve({ ok: false, contextInvalidated: true });
      return;
    }

    try {
      chrome.runtime.sendMessage(message, (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          handleRuntimeError(runtimeError);
          resolve({ ok: false, error: runtimeError.message || String(runtimeError) });
          return;
        }

        resolve(response || { ok: false });
      });
    } catch (error) {
      handleRuntimeError(error);
      resolve({ ok: false, error: error.message || String(error) });
    }
  });
}

function addRuntimeMessageListener() {
  if (!isRuntimeAvailable()) {
    return false;
  }

  try {
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    return true;
  } catch (error) {
    handleRuntimeError(error);
    return false;
  }
}

function removeRuntimeMessageListener() {
  if (!isRuntimeAvailable()) {
    return;
  }

  try {
    chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
  } catch {
    // The page may still hold an old content script after the extension reloads.
  }
}

function isRuntimeAvailable() {
  return Boolean(globalThis.chrome?.runtime?.sendMessage && globalThis.chrome?.runtime?.onMessage);
}

function handleRuntimeError(error) {
  if (isExtensionContextInvalidated(error)) {
    deactivateBlocker();
  }
}

function handleAsyncError(error) {
  handleRuntimeError(error);
}

function handleUnhandledRejection(event) {
  if (isExtensionContextInvalidated(event.reason)) {
    event.preventDefault();
    deactivateBlocker();
  }
}

function handleWindowError(event) {
  if (isExtensionContextInvalidated(event.error || event.message)) {
    event.preventDefault();
    deactivateBlocker();
  }
}

function isExtensionContextInvalidated(error) {
  const message = String(error?.message || error || "");
  return message.includes("Extension context invalidated");
}
})();
