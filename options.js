const settingsForm = document.getElementById("settingsForm");
const enabled = document.getElementById("enabled");
const language = document.getElementById("language");
const notifyAfterMinutes = document.getElementById("notifyAfterMinutes");
const repeatEveryMinutes = document.getElementById("repeatEveryMinutes");
const trackedHosts = document.getElementById("trackedHosts");
const restoreDefaults = document.getElementById("restoreDefaults");
const saveStatus = document.getElementById("saveStatus");
const statusText = document.getElementById("statusText");
const statusPill = document.querySelector(".status-pill");
const todayDate = document.getElementById("todayDate");
const todayTotal = document.getElementById("todayTotal");
const activeHost = document.getElementById("activeHost");
const activeTime = document.getElementById("activeTime");
const limitSummary = document.getElementById("limitSummary");
const blockSummary = document.getElementById("blockSummary");
const domainCount = document.getElementById("domainCount");
const statsList = document.getElementById("statsList");
const emptyState = document.getElementById("emptyState");
const dailyChart = document.getElementById("dailyChart");
const chartEmpty = document.getElementById("chartEmpty");
const graphRange = document.getElementById("graphRange");

let defaultTrackedHosts = [];
let currentSettings = null;
let saveStatusTimer = null;
const GRAPH_DAYS = 14;

document.addEventListener("DOMContentLoaded", () => {
  loadDashboard({ renderForm: true });
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const response = await sendMessage({ type: "SAVE_SETTINGS", settings: getFormSettings() });
  if (!response || !response.ok) {
    setStatus(t("couldNotSave"), true);
    return;
  }

  currentSettings = response.settings;
  applyTranslations(response.settings.language);
  renderSettings(response.settings);
  setStatus(t("saved"));
  await loadDashboard({ renderForm: false });
});

restoreDefaults.addEventListener("click", () => {
  trackedHosts.value = defaultTrackedHosts.join("\n");
  domainCount.textContent = String(defaultTrackedHosts.length);
});

language.addEventListener("change", async () => {
  currentSettings = {
    ...(currentSettings || {}),
    language: language.value
  };
  applyTranslations(language.value);
  statusText.textContent = enabled.checked ? t("enabled") : t("paused");

  const response = await sendMessage({ type: "SAVE_SETTINGS", settings: getFormSettings() });
  if (!response || !response.ok) {
    setStatus(t("couldNotSave"), true);
    return;
  }

  currentSettings = response.settings;
  renderSettings(response.settings);
  applyTranslations(response.settings.language);
  setStatus(t("saved"));
  await loadDashboard({ renderForm: false });
});

async function loadDashboard({ renderForm }) {
  const response = await sendMessage({ type: "GET_DASHBOARD" });
  if (!response || !response.ok) {
    setStatus(t("couldNotLoad"), true);
    return;
  }

  defaultTrackedHosts = response.defaultTrackedHosts || [];
  currentSettings = response.settings;
  applyTranslations(response.settings.language);

  if (renderForm) {
    renderSettings(response.settings);
  }

  renderOverview(response);
  renderStats(response.stats.todayByHost || {});
  renderDailyChart(response.stats.dailyByDate || {}, response.stats.todayByHost || {});
}

function renderSettings(settings) {
  enabled.checked = Boolean(settings.enabled);
  language.value = settings.language || "en";
  notifyAfterMinutes.value = settings.notifyAfterMinutes;
  repeatEveryMinutes.value = settings.repeatEveryMinutes;
  trackedHosts.value = (settings.trackedHosts || []).join("\n");
}

function getFormSettings() {
  return {
    enabled: enabled.checked,
    language: language.value,
    notifyAfterMinutes: notifyAfterMinutes.value,
    repeatEveryMinutes: repeatEveryMinutes.value,
    trackedHosts: trackedHosts.value
  };
}

function renderOverview(data) {
  const settings = data.settings || currentSettings;
  const activeSeconds = data.activeSeconds || 0;
  const totalSeconds = data.todayTotalSeconds || getTotalSeconds(data.stats?.todayByHost || {});
  const remainingSeconds = getRemainingSeconds(data, totalSeconds);
  const hosts = settings?.trackedHosts || [];

  statusText.textContent = settings?.enabled ? t("enabled") : t("paused");
  statusPill.classList.toggle("paused", !settings?.enabled);

  todayTotal.textContent = formatDuration(remainingSeconds);
  activeTime.textContent = formatDuration(activeSeconds);
  activeHost.textContent = data.activeHost || t("notTrackingPage");
  limitSummary.textContent = `${settings?.notifyAfterMinutes || 5}m`;
  blockSummary.textContent = t("usedToday", { time: formatDuration(totalSeconds) });
  domainCount.textContent = String(hosts.length);
}

function getRemainingSeconds(data, totalSeconds) {
  if (Number.isFinite(data.todayRemainingSeconds)) {
    return data.todayRemainingSeconds;
  }

  const limitSeconds = Math.max(60, (data.settings?.notifyAfterMinutes || 5) * 60);
  return Math.max(0, limitSeconds - totalSeconds);
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

function renderDailyChart(dailyByDate, todayByHost) {
  const todayKey = localDateKey();
  const history = {
    ...dailyByDate,
    [todayKey]: {
      ...(dailyByDate[todayKey] || {}),
      ...todayByHost
    }
  };
  const days = getRecentDateKeys(GRAPH_DAYS);
  const rows = days.map((day) => {
    const byHost = history[day] || {};
    const totalSeconds = getTotalSeconds(byHost);
    const topEntry = getTopHostEntry(byHost);

    return {
      day,
      totalSeconds,
      topHost: topEntry ? topEntry[0] : ""
    };
  });
  const maxSeconds = Math.max(...rows.map((row) => row.totalSeconds), 60);
  const hasData = rows.some((row) => row.totalSeconds > 0);

  graphRange.textContent = t("lastDays", { days: GRAPH_DAYS });
  dailyChart.replaceChildren();
  chartEmpty.hidden = hasData;

  for (const row of rows) {
    const item = document.createElement("div");
    const day = document.createElement("span");
    const track = document.createElement("div");
    const fill = document.createElement("span");
    const site = document.createElement("span");
    const time = document.createElement("span");
    const width = row.totalSeconds > 0 ? Math.max(3, (row.totalSeconds / maxSeconds) * 100) : 0;

    item.className = "chart-row";
    item.setAttribute("role", "listitem");
    item.title = `${formatLongDate(row.day)}: ${formatDuration(row.totalSeconds)}`;

    day.className = "chart-day";
    day.textContent = formatShortDate(row.day);

    track.className = "chart-track";
    fill.className = row.totalSeconds > 0 ? "chart-fill" : "chart-fill empty";
    fill.style.width = `${width}%`;

    site.className = "chart-site";
    site.textContent = row.topHost || t("noTrackedSites");

    time.className = "chart-time";
    time.textContent = formatDuration(row.totalSeconds);

    track.append(fill, site);
    item.append(day, track, time);
    dailyChart.append(item);
  }
}

function setStatus(message, isError = false) {
  window.clearTimeout(saveStatusTimer);
  saveStatus.textContent = message;
  saveStatus.style.color = isError ? "#b91c1c" : "#0f766e";

  saveStatusTimer = window.setTimeout(() => {
    saveStatus.textContent = "";
  }, 2500);
}

function applyTranslations(selectedLanguage) {
  window.ChillfoI18n.apply(selectedLanguage);
  todayDate.textContent = new Intl.DateTimeFormat(getDateLocale(), {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date());
}

function t(key, values = {}) {
  return window.ChillfoI18n.t(currentSettings?.language || language?.value || "en", key, values);
}

function getDateLocale() {
  return (currentSettings?.language || language?.value) === "pt" ? "pt-BR" : undefined;
}

function getRecentDateKeys(count) {
  const days = [];
  const date = new Date();

  date.setHours(12, 0, 0, 0);

  for (let index = count - 1; index >= 0; index -= 1) {
    const item = new Date(date);
    item.setDate(date.getDate() - index);
    days.push(localDateKey(item));
  }

  return days;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTopHostEntry(byHost) {
  return Object.entries(byHost)
    .filter(([, seconds]) => seconds > 0)
    .sort((a, b) => b[1] - a[1])[0];
}

function getTotalSeconds(todayByHost) {
  return Object.values(todayByHost).reduce((total, seconds) => {
    return total + Math.max(0, Number(seconds) || 0);
  }, 0);
}

function formatShortDate(dayKey) {
  const date = parseLocalDate(dayKey);
  return new Intl.DateTimeFormat(getDateLocale(), {
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatLongDate(dayKey) {
  const date = parseLocalDate(dayKey);
  return new Intl.DateTimeFormat(getDateLocale(), {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(date);
}

function parseLocalDate(dayKey) {
  const [year, month, day] = dayKey.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day, 12, 0, 0, 0);
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

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response || { ok: false });
    });
  });
}
