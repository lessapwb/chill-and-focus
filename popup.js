const activeSite = document.getElementById("activeSite");
const activeTime = document.getElementById("activeTime");
const todayTotal = document.getElementById("todayTotal");
const enabledToggle = document.getElementById("enabledToggle");
const nextReminder = document.getElementById("nextReminder");
const statsList = document.getElementById("statsList");
const emptyState = document.getElementById("emptyState");
const openOptions = document.getElementById("openOptions");

let dashboard = null;

document.addEventListener("DOMContentLoaded", refresh);

enabledToggle.addEventListener("change", async () => {
  if (!dashboard) {
    return;
  }

  const settings = {
    ...dashboard.settings,
    enabled: enabledToggle.checked
  };

  await sendMessage({ type: "SAVE_SETTINGS", settings });
  await refresh();
});

openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

async function refresh() {
  dashboard = await sendMessage({ type: "GET_DASHBOARD" });
  if (!dashboard || !dashboard.ok) {
    activeSite.textContent = "Unavailable";
    return;
  }

  applyTranslations(dashboard.settings.language);
  enabledToggle.checked = dashboard.settings.enabled;
  todayTotal.textContent = formatDuration(getRemainingSeconds(dashboard));
  renderActiveSite(dashboard);
  renderStats(dashboard.stats.todayByHost || {});
}

function renderActiveSite(data) {
  const host = data.activeHost || "";
  const seconds = data.activeSeconds || 0;
  const remainingSeconds = getRemainingSeconds(data);

  if (!data.settings.enabled) {
    activeSite.textContent = t("paused");
    activeTime.textContent = formatDuration(0);
    nextReminder.textContent = "";
    return;
  }

  if (!host) {
    activeSite.textContent = t("notTrackingPage");
    activeTime.textContent = formatDuration(0);
    nextReminder.textContent = "";
    return;
  }

  activeSite.textContent = host;
  activeTime.textContent = formatDuration(seconds);
  nextReminder.textContent = getReminderText(remainingSeconds);
}

function renderStats(todayByHost) {
  const entries = Object.entries(todayByHost)
    .filter(([, seconds]) => seconds > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  statsList.replaceChildren();
  emptyState.hidden = entries.length > 0;

  for (const [host, seconds] of entries) {
    const item = document.createElement("li");
    const site = document.createElement("span");
    const time = document.createElement("span");

    site.className = "site";
    site.textContent = host;
    time.className = "time";
    time.textContent = formatDuration(seconds);

    item.append(site, time);
    statsList.append(item);
  }
}

function getReminderText(remainingSeconds) {
  if (remainingSeconds > 0) {
    return t("timeLeftBeforeBlock", { time: formatDuration(remainingSeconds) });
  }

  return t("dailyLimitReached");
}

function getRemainingSeconds(data) {
  if (Number.isFinite(data.todayRemainingSeconds)) {
    return data.todayRemainingSeconds;
  }

  const limitSeconds = Math.max(60, (data.settings?.notifyAfterMinutes || 5) * 60);
  return Math.max(0, limitSeconds - (data.todayTotalSeconds || 0));
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

function applyTranslations(language) {
  window.ChillfoI18n.apply(language);
}

function t(key, values = {}) {
  return window.ChillfoI18n.t(dashboard?.settings?.language || "en", key, values);
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response || { ok: false });
    });
  });
}
