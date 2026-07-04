(() => {
const BLOCKER_SCRIPT_VERSION = "2026-07-04-bilingual";

if (globalThis.__chillfoBlockerVersion === BLOCKER_SCRIPT_VERSION) {
  return;
}

if (typeof globalThis.__chillfoBlockerCleanup === "function") {
  globalThis.__chillfoBlockerCleanup();
}

globalThis.__chillfoBlockerVersion = BLOCKER_SCRIPT_VERSION;

const BLOCKER_HOST_ID = "chillfo-blocker-host";
const STATUS_POLL_MS = 2000;
const BLOCKER_TEXT = {
  en: {
    blockedDetail: "Daily limit: {limit} minutes total across tracked sites. Current total: {total} minutes. {host}: {site} minutes today.",
    blockedEyebrow: "Time limit reached",
    blockedTitle: "Chill & Focus blocked this page",
    defaultMessage: "Time is up on {host}.",
    leavePage: "Leave page",
    settings: "Settings"
  },
  pt: {
    blockedDetail: "Limite diário: {limit} minutos no total em sites rastreados. Total atual: {total} minutos. {host}: {site} minutos hoje.",
    blockedEyebrow: "Limite de tempo atingido",
    blockedTitle: "Chill & Focus bloqueou esta página",
    defaultMessage: "O tempo acabou em {host}.",
    leavePage: "Sair da página",
    settings: "Configurações"
  }
};
let statusTimer = null;

chrome.runtime.onMessage.addListener(handleRuntimeMessage);
window.addEventListener("focus", requestPageStatus);
document.addEventListener("visibilitychange", handleVisibilityChange);

globalThis.__chillfoBlockerCleanup = () => {
  window.clearTimeout(statusTimer);
  chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
  window.removeEventListener("focus", requestPageStatus);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
};

requestPageStatus();

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
    requestPageStatus();
  }
}

async function requestPageStatus() {
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
  if (!status.enabled || !status.tracked || document.visibilityState !== "visible") {
    return;
  }

  const limitSeconds = Math.max(60, Number.parseInt(status.limitMinutes, 10) * 60 || 60);
  const trackedSeconds = Math.max(0, Number.parseInt(status.totalSeconds ?? status.todaySeconds, 10) || 0);
  const remainingMs = Math.max(1000, (limitSeconds - trackedSeconds) * 1000);
  const nextCheckMs = Math.min(remainingMs, STATUS_POLL_MS);

  statusTimer = window.setTimeout(requestPageStatus, nextCheckMs);
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

      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 22px;
      }

      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 38px;
        border: 1px solid rgba(17, 24, 39, 0.16);
        border-radius: 6px;
        padding: 0 14px;
        background: white;
        color: #111827;
        font: inherit;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .icon {
        display: inline-flex;
        width: 18px;
        height: 18px;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
      }

      .icon svg {
        width: 100%;
        height: 100%;
      }

      button.primary {
        border-color: #0f766e;
        background: #0f766e;
        color: white;
      }

      button:hover {
        border-color: rgba(17, 24, 39, 0.32);
      }

      button.primary:hover {
        border-color: #115e59;
        background: #115e59;
      }

      button:focus-visible {
        outline: 2px solid #f59e0b;
        outline-offset: 2px;
      }

      @media (max-width: 520px) {
        .panel {
          padding: 22px;
        }

        h1 {
          font-size: 24px;
        }

        .actions {
          display: grid;
        }
      }
    </style>
    <main class="blocker" role="dialog" aria-modal="true" aria-labelledby="chillfo-title">
      <section class="panel">
        <span class="eyebrow">${translate(language, "blockedEyebrow")}</span>
        <h1 id="chillfo-title">${translate(language, "blockedTitle")}</h1>
        <p class="message"></p>
        <p class="detail"></p>
        <div class="actions">
          <button class="settings" type="button">
            <span class="icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </span>
            ${translate(language, "settings")}
          </button>
          <button class="primary leave" type="button">
            <span class="icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <path d="m4.9 4.9 14.2 14.2"/>
              </svg>
            </span>
            ${translate(language, "leavePage")}
          </button>
        </div>
      </section>
    </main>
  `;

  shadow.querySelector(".settings").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
  });
  shadow.querySelector(".leave").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "LEAVE_BLOCKED_PAGE" });
  });

  updateBlocker(shadow, status);
  window.setTimeout(() => {
    shadow.querySelector(".leave")?.focus();
  }, 0);
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
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false });
        return;
      }
      resolve(response || { ok: false });
    });
  });
}
})();
