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
const SVG_NS = "http://www.w3.org/2000/svg";

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

    return {
      day,
      totalSeconds
    };
  });
  const maxSeconds = Math.max(...rows.map((row) => row.totalSeconds), 60);
  const hasData = rows.some((row) => row.totalSeconds > 0);

  graphRange.textContent = t("lastDays", { days: GRAPH_DAYS });
  dailyChart.replaceChildren();
  dailyChart.setAttribute("aria-label", t("dailyTotalSeries", { days: GRAPH_DAYS }));
  chartEmpty.hidden = hasData;

  if (!hasData) {
    return;
  }

  dailyChart.append(createTimeSeriesChart(rows, maxSeconds));
  dailyChart.append(createDailyTotalsList(rows));
}

function createTimeSeriesChart(rows, maxSeconds) {
  const width = 840;
  const height = 300;
  const padding = { top: 24, right: 20, bottom: 46, left: 62 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const baselineY = padding.top + chartHeight;
  const points = rows.map((row, index) => {
    const x = padding.left + (chartWidth * index) / Math.max(1, rows.length - 1);
    const y = baselineY - (row.totalSeconds / maxSeconds) * chartHeight;

    return { ...row, x, y };
  });
  const svg = createSvgElement("svg", {
    class: "time-series-chart",
    viewBox: `0 0 ${width} ${height}`,
    focusable: "false",
    "aria-hidden": "true"
  });

  appendGrid(svg, padding, chartWidth, chartHeight, maxSeconds);

  svg.append(
    createSvgElement("path", {
      class: "chart-area",
      d: createAreaPath(points, baselineY)
    }),
    createSvgElement("path", {
      class: "chart-line",
      d: createLinePath(points)
    })
  );

  for (const point of points) {
    const group = createSvgElement("g", { class: point.totalSeconds > 0 ? "chart-point" : "chart-point zero" });
    const title = createSvgElement("title");
    const circle = createSvgElement("circle", {
      cx: point.x.toFixed(2),
      cy: point.y.toFixed(2),
      r: point.totalSeconds > 0 ? "5" : "3"
    });

    title.textContent = `${formatLongDate(point.day)}: ${formatDuration(point.totalSeconds)}`;
    group.append(title, circle);

    if (point.totalSeconds > 0) {
      const value = createSvgElement("text", {
        class: "chart-point-label",
        x: point.x.toFixed(2),
        y: Math.max(14, point.y - 10).toFixed(2),
        "text-anchor": "middle"
      });

      value.textContent = formatCompactDuration(point.totalSeconds);
      group.append(value);
    }

    svg.append(group);
  }

  return svg;
}

function appendGrid(svg, padding, chartWidth, chartHeight, maxSeconds) {
  const baselineY = padding.top + chartHeight;
  const ticks = [maxSeconds, Math.round(maxSeconds / 2), 0];

  for (const tick of ticks) {
    const y = baselineY - (tick / maxSeconds) * chartHeight;
    const line = createSvgElement("line", {
      class: tick === 0 ? "chart-axis" : "chart-grid",
      x1: padding.left,
      x2: padding.left + chartWidth,
      y1: y.toFixed(2),
      y2: y.toFixed(2)
    });
    const label = createSvgElement("text", {
      class: "chart-tick-label",
      x: padding.left - 12,
      y: (y + 4).toFixed(2),
      "text-anchor": "end"
    });

    label.textContent = formatCompactDuration(tick);
    svg.append(line, label);
  }

  svg.append(createSvgElement("line", {
    class: "chart-axis",
    x1: padding.left,
    x2: padding.left,
    y1: padding.top,
    y2: baselineY
  }));
}

function createDailyTotalsList(rows) {
  const list = document.createElement("ol");
  const todayKey = localDateKey();

  list.className = "chart-day-list";

  for (const row of rows) {
    const item = document.createElement("li");
    const day = document.createElement("span");
    const total = document.createElement("strong");

    item.className = row.day === todayKey ? "chart-day-item today" : "chart-day-item";
    item.title = `${formatLongDate(row.day)}: ${formatDuration(row.totalSeconds)}`;

    day.className = "chart-day-label";
    day.textContent = formatShortDate(row.day);

    total.className = "chart-day-total";
    total.textContent = formatDuration(row.totalSeconds);

    item.append(day, total);
    list.append(item);
  }

  return list;
}

function createLinePath(points) {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
}

function createAreaPath(points, baselineY) {
  const line = createLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];

  return `${line} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }

  return element;
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

function formatCompactDuration(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${totalSeconds}s`;
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response || { ok: false });
    });
  });
}
