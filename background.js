const SETTINGS_KEY = "chillfo.settings";
const STATS_KEY = "chillfo.stats";
const ACTIVE_STATE_KEY = "chillfo.activeState";
const TICK_ALARM_NAME = "chillfo.tick";
const ALARM_PERIOD_MINUTES = 1;
const MAX_TRACKABLE_ELAPSED_MS = 5 * 60 * 1000;
const TOTAL_REMINDER_KEY = "__total__";

const DEFAULT_TRACKED_HOSTS = [
  "instagram.com",
  "facebook.com",
  "x.com",
  "twitter.com",
  "reddit.com",
  "tiktok.com",
  "threads.net",
  "snapchat.com",
  "pinterest.com",
  "tumblr.com",
  "youtube.com",
  "youtu.be",
  "twitch.tv",
  "discord.com",
  "9gag.com",
  "imgur.com",
  "netflix.com",
  "hulu.com",
  "disneyplus.com",
  "primevideo.com",
  "max.com",
  "kick.com"
];

const DEFAULT_SETTINGS = {
  enabled: true,
  language: "en",
  notifyAfterMinutes: 5,
  repeatEveryMinutes: 5,
  trackedHosts: DEFAULT_TRACKED_HOSTS
};

const BACKGROUND_TEXT = {
  en: {
    actionLeft: "Chill & Focus: {left} left today. Used: {used}",
    actionSiteLeft: "{left} left today. {host}: {site}. Used: {used}",
    blockedMessage: "Time is up. You have spent {minutes} minutes across tracked sites today.",
    blockedNotification: "You reached your {limit}-minute daily limit across tracked sites.",
    blockedTitle: "Chill & Focus blocked this page"
  },
  pt: {
    actionLeft: "Chill & Focus: {left} restantes hoje. Usado: {used}",
    actionSiteLeft: "{left} restantes hoje. {host}: {site}. Usado: {used}",
    blockedMessage: "O tempo acabou. Você passou {minutes} minutos em sites rastreados hoje.",
    blockedNotification: "Você atingiu seu limite diário de {limit} minutos em sites rastreados.",
    blockedTitle: "Chill & Focus bloqueou esta página"
  }
};

let syncQueue = Promise.resolve();

chrome.runtime.onInstalled.addListener(() => {
  initializeExtension().catch((error) => {
    console.error("Chill & Focus initialization error", error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  initializeExtension().catch((error) => {
    console.error("Chill & Focus initialization error", error);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TICK_ALARM_NAME) {
    queueSyncActiveTime("alarm");
  }
});

chrome.tabs.onActivated.addListener(() => {
  queueSyncActiveTime("tab-activated");
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    queueSyncActiveTime("tab-updated");
  }
});

chrome.windows.onFocusChanged.addListener(() => {
  queueSyncActiveTime("window-focus-changed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error("Chill & Focus message error", error);
      sendResponse({ ok: false, error: error.message || String(error) });
    });

  return true;
});

initializeExtension().catch((error) => {
  console.error("Chill & Focus initialization error", error);
});

async function initializeExtension() {
  const settings = await getSettings();
  await storageSet({ [SETTINGS_KEY]: settings });
  await ensureTickAlarm();
  await injectBlockerIntoOpenTrackedTabs(settings);
  await queueSyncActiveTime("initialize");
}

async function ensureTickAlarm() {
  await createAlarm(TICK_ALARM_NAME, {
    delayInMinutes: ALARM_PERIOD_MINUTES,
    periodInMinutes: ALARM_PERIOD_MINUTES
  });
}

async function handleMessage(message, sender) {
  if (!message || typeof message.type !== "string") {
    return { ok: false, error: "Unknown message" };
  }

  if (message.type === "GET_DASHBOARD") {
    await queueSyncActiveTime("dashboard");
    const [settings, stats, activeState] = await Promise.all([
      getSettings(),
      getStats(),
      getActiveState()
    ]);

    return {
      ok: true,
      settings,
      defaultTrackedHosts: DEFAULT_TRACKED_HOSTS,
      stats,
      activeHost: activeState.host || "",
      activeSeconds: activeState.host ? getTodaySeconds(stats, activeState.host) : 0,
      todayTotalSeconds: getTodayTotalSeconds(stats),
      dailyLimitSeconds: getDailyLimitSeconds(settings),
      todayRemainingSeconds: getRemainingSeconds(stats, settings),
      dailyLimitReached: getRemainingSeconds(stats, settings) <= 0
    };
  }

  if (message.type === "GET_SETTINGS") {
    const settings = await getSettings();
    return { ok: true, settings, defaultTrackedHosts: DEFAULT_TRACKED_HOSTS };
  }

  if (message.type === "GET_PAGE_STATUS") {
    await queueSyncActiveTime("page-status");
    const pageStatus = await getPageStatus(message.url || sender?.tab?.url || "");
    return { ok: true, ...pageStatus };
  }

  if (message.type === "SAVE_SETTINGS") {
    const nextSettings = sanitizeSettings(message.settings || {});
    await storageSet({ [SETTINGS_KEY]: nextSettings });
    await injectBlockerIntoOpenTrackedTabs(nextSettings);
    await queueSyncActiveTime("settings-saved");
    return { ok: true, settings: nextSettings };
  }

  if (message.type === "RESET_TODAY") {
    const settings = await getSettings();
    const stats = await getStats();
    const today = localDateKey();
    const nextStats = {
      ...stats,
      day: today,
      todayByHost: {},
      dailyByDate: {
        ...(stats.dailyByDate || {}),
        [today]: {}
      },
      remindersByHost: {}
    };
    await storageSet({
      [STATS_KEY]: nextStats,
      [ACTIVE_STATE_KEY]: createEmptyActiveState(Date.now())
    });
    await updateBadge("", 0, getDailyLimitSeconds(settings), 0, settings.language);
    await queueSyncActiveTime("reset-today");
    return { ok: true, stats: nextStats };
  }

  if (message.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    return { ok: true };
  }

  return { ok: false, error: "Unsupported message" };
}

function queueSyncActiveTime(reason) {
  syncQueue = syncQueue
    .catch(() => undefined)
    .then(() => syncActiveTime(reason))
    .catch((error) => {
      console.error("Chill & Focus sync error", error);
    });

  return syncQueue;
}

async function syncActiveTime(reason) {
  const now = Date.now();
  const [settings, stats, activeState] = await Promise.all([
    getSettings(),
    getStats(),
    getActiveState()
  ]);

  const nextStats = ensureStatsForToday(stats);

  if (activeState.host && activeState.lastTickAt && settings.enabled) {
    const elapsedMs = Math.max(0, now - activeState.lastTickAt);

    if (
      elapsedMs >= 1000 &&
      elapsedMs <= MAX_TRACKABLE_ELAPSED_MS &&
      isTrackedHost(activeState.host, settings.trackedHosts)
    ) {
      addSeconds(nextStats, activeState.host, Math.floor(elapsedMs / 1000));
    }
  }

  if (!settings.enabled) {
    await storageSet({
      [STATS_KEY]: nextStats,
      [ACTIVE_STATE_KEY]: createEmptyActiveState(now)
    });
    await updateBadge("", 0, Number.POSITIVE_INFINITY, 0, settings.language);
    return;
  }

  const activeTab = await getFocusedActiveTab();
  const pageHost = activeTab ? getPageHost(activeTab.url) : "";
  const matchedHost = pageHost ? getMatchedTrackedHost(pageHost, settings.trackedHosts) : "";
  const nextActiveState = matchedHost
    ? {
        tabId: activeTab.id || null,
        url: activeTab.url || "",
        host: matchedHost,
        lastTickAt: now,
        reason
      }
    : createEmptyActiveState(now);

  await storageSet({
    [STATS_KEY]: nextStats,
    [ACTIVE_STATE_KEY]: nextActiveState
  });

  if (!matchedHost) {
    if (activeTab?.id) {
      await sendTabMessage(activeTab.id, { type: "UNBLOCK_CHILLFO_SITE" });
    }
    await updateBadge(
      "",
      getTodayTotalSeconds(nextStats),
      getDailyLimitSeconds(settings),
      getTodayTotalSeconds(nextStats),
      settings.language
    );
    return;
  }

  const todaySeconds = getTodaySeconds(nextStats, matchedHost);
  const totalSeconds = getTodayTotalSeconds(nextStats);
  await updateBadge(
    matchedHost,
    todaySeconds,
    getDailyLimitSeconds(settings),
    totalSeconds,
    settings.language
  );
  await applyPageLimit(activeTab, matchedHost, todaySeconds, settings, nextStats);
  await storageSet({ [STATS_KEY]: nextStats });
}

async function applyPageLimit(tab, host, siteSeconds, settings, stats) {
  const limitSeconds = getDailyLimitSeconds(settings);
  const repeatSeconds = settings.repeatEveryMinutes * 60;
  const totalSeconds = getTodayTotalSeconds(stats);

  if (!tab || !tab.id) {
    return;
  }

  if (totalSeconds < limitSeconds) {
    await sendTabMessage(tab.id, { type: "UNBLOCK_CHILLFO_SITE" });
    return;
  }

  const minutes = Math.max(1, Math.floor(totalSeconds / 60));
  const siteMinutes = Math.max(0, Math.floor(siteSeconds / 60));
  const message = translate(settings.language, "blockedMessage", { minutes });

  await deliverTabMessage(tab, {
    type: "BLOCK_CHILLFO_SITE",
    host,
    minutes,
    siteMinutes,
    totalSeconds,
    siteSeconds,
    language: settings.language,
    limitMinutes: settings.notifyAfterMinutes,
    message
  });

  const lastReminderAt = stats.remindersByHost[TOTAL_REMINDER_KEY] || 0;
  if (lastReminderAt > 0 && totalSeconds - lastReminderAt < repeatSeconds) {
    return;
  }

  stats.remindersByHost[TOTAL_REMINDER_KEY] = totalSeconds;

  await createNotification(`chillfo-${host}-${Date.now()}`, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon128.png"),
    title: translate(settings.language, "blockedTitle"),
    message: translate(settings.language, "blockedNotification", { limit: settings.notifyAfterMinutes }),
    priority: 1
  });
}

async function getPageStatus(url) {
  const [settings, stats] = await Promise.all([getSettings(), getStats()]);
  const pageHost = getPageHost(url);
  const matchedHost = pageHost ? getMatchedTrackedHost(pageHost, settings.trackedHosts) : "";
  const siteSeconds = matchedHost ? getTodaySeconds(stats, matchedHost) : 0;
  const totalSeconds = getTodayTotalSeconds(stats);
  const limitSeconds = getDailyLimitSeconds(settings);
  const remainingSeconds = Math.max(0, limitSeconds - totalSeconds);
  const minutes = Math.max(0, Math.floor(totalSeconds / 60));

  return {
    enabled: settings.enabled,
    tracked: Boolean(matchedHost),
    blocked: Boolean(settings.enabled && matchedHost && totalSeconds >= limitSeconds),
    host: matchedHost,
    todaySeconds: totalSeconds,
    totalSeconds,
    siteSeconds,
    language: settings.language,
    remainingSeconds,
    dailyLimitSeconds: limitSeconds,
    minutes,
    siteMinutes: Math.max(0, Math.floor(siteSeconds / 60)),
    limitMinutes: settings.notifyAfterMinutes,
    message: matchedHost
      ? translate(settings.language, "blockedMessage", { minutes: Math.max(1, minutes) })
      : ""
  };
}

async function getFocusedActiveTab() {
  const focusedWindow = await getLastFocusedWindow();
  if (!focusedWindow || !focusedWindow.focused) {
    return null;
  }

  const tabs = await queryTabs({
    active: true,
    windowId: focusedWindow.id
  });

  return tabs[0] || null;
}

async function injectBlockerIntoOpenTrackedTabs(settings) {
  if (!settings.enabled) {
    return;
  }

  const tabs = await queryTabs({});
  const trackedTabs = tabs.filter((tab) => {
    const pageHost = getPageHost(tab.url || "");
    return tab.id && pageHost && isTrackedHost(pageHost, settings.trackedHosts);
  });

  await Promise.all(trackedTabs.map((tab) => injectContentBlocker(tab.id)));
}

function sanitizeSettings(rawSettings) {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...rawSettings
  };

  const notifyAfterMinutes = clampInteger(merged.notifyAfterMinutes, 1, 240, DEFAULT_SETTINGS.notifyAfterMinutes);
  const repeatEveryMinutes = clampInteger(merged.repeatEveryMinutes, 1, 240, DEFAULT_SETTINGS.repeatEveryMinutes);
  const trackedHosts = sanitizeHostList(merged.trackedHosts);

  return {
    enabled: Boolean(merged.enabled),
    language: sanitizeLanguage(merged.language),
    notifyAfterMinutes,
    repeatEveryMinutes,
    trackedHosts: trackedHosts.length ? trackedHosts : [...DEFAULT_TRACKED_HOSTS]
  };
}

function sanitizeLanguage(language) {
  return language === "pt" ? "pt" : "en";
}

function sanitizeHostList(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(/\r?\n|,/);
  const seen = new Set();
  const hosts = [];

  for (const item of list) {
    const host = normalizeInputHost(item);
    if (!host || seen.has(host)) {
      continue;
    }
    seen.add(host);
    hosts.push(host);
  }

  return hosts.sort((a, b) => a.localeCompare(b));
}

function normalizeInputHost(value) {
  const trimmed = String(value || "").trim().toLowerCase();
  if (!trimmed) {
    return "";
  }

  let hostSource = trimmed.replace(/^\*\./, "");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(hostSource)) {
    hostSource = `https://${hostSource}`;
  }

  try {
    const url = new URL(hostSource);
    return normalizeHost(url.hostname);
  } catch {
    return "";
  }
}

function getPageHost(url) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "";
    }
    return normalizeHost(parsedUrl.hostname);
  } catch {
    return "";
  }
}

function normalizeHost(host) {
  return String(host || "")
    .trim()
    .toLowerCase()
    .replace(/^\*\./, "")
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

function isTrackedHost(host, trackedHosts) {
  return Boolean(getMatchedTrackedHost(host, trackedHosts));
}

function getMatchedTrackedHost(host, trackedHosts) {
  const normalizedHost = normalizeHost(host);

  for (const trackedHost of trackedHosts) {
    const normalizedTrackedHost = normalizeHost(trackedHost);
    if (
      normalizedHost === normalizedTrackedHost ||
      normalizedHost.endsWith(`.${normalizedTrackedHost}`)
    ) {
      return normalizedTrackedHost;
    }
  }

  return "";
}

function addSeconds(stats, host, seconds) {
  const normalizedHost = normalizeHost(host);
  const day = stats.day || localDateKey();

  stats.dailyByDate = stats.dailyByDate || {};
  stats.dailyByDate[day] = stats.dailyByDate[day] || {};

  stats.todayByHost[normalizedHost] = (stats.todayByHost[normalizedHost] || 0) + seconds;
  stats.totalByHost[normalizedHost] = (stats.totalByHost[normalizedHost] || 0) + seconds;
  stats.dailyByDate[day][normalizedHost] = (stats.dailyByDate[day][normalizedHost] || 0) + seconds;
}

function getTodaySeconds(stats, host) {
  return stats.todayByHost[normalizeHost(host)] || 0;
}

function getTodayTotalSeconds(stats) {
  return Object.values(stats.todayByHost || {}).reduce((total, seconds) => {
    return total + Math.max(0, Number(seconds) || 0);
  }, 0);
}

function getDailyLimitSeconds(settings) {
  return Math.max(60, settings.notifyAfterMinutes * 60);
}

function getRemainingSeconds(stats, settings) {
  return Math.max(0, getDailyLimitSeconds(settings) - getTodayTotalSeconds(stats));
}

function ensureStatsForToday(stats) {
  const today = localDateKey();
  const statsDay = stats.day || today;
  const dailyByDate = sanitizeDailyByDate(stats.dailyByDate || {});
  const storedTodayByHost = sanitizeHostSeconds(stats.todayByHost || {});

  if (Object.keys(storedTodayByHost).length > 0) {
    dailyByDate[statsDay] = {
      ...(dailyByDate[statsDay] || {}),
      ...storedTodayByHost
    };
  }

  const nextStats = {
    day: statsDay,
    todayByHost: { ...storedTodayByHost },
    totalByHost: sanitizeHostSeconds(stats.totalByHost || {}),
    dailyByDate,
    remindersByHost: { ...(stats.remindersByHost || {}) }
  };

  if (nextStats.day !== today) {
    nextStats.day = today;
    nextStats.todayByHost = { ...(nextStats.dailyByDate[today] || {}) };
    nextStats.remindersByHost = {};
    return nextStats;
  }

  nextStats.todayByHost = {
    ...(nextStats.dailyByDate[today] || {}),
    ...nextStats.todayByHost
  };
  nextStats.dailyByDate[today] = { ...nextStats.todayByHost };

  return nextStats;
}

function sanitizeDailyByDate(value) {
  const dailyByDate = {};
  if (!value || typeof value !== "object") {
    return dailyByDate;
  }

  for (const [day, byHost] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      continue;
    }

    dailyByDate[day] = sanitizeHostSeconds(byHost || {});
  }

  return dailyByDate;
}

function sanitizeHostSeconds(value) {
  const byHost = {};
  if (!value || typeof value !== "object") {
    return byHost;
  }

  for (const [host, seconds] of Object.entries(value)) {
    const normalizedHost = normalizeHost(host);
    const normalizedSeconds = Math.max(0, Math.floor(Number(seconds) || 0));

    if (!normalizedHost || normalizedSeconds <= 0) {
      continue;
    }

    byHost[normalizedHost] = normalizedSeconds;
  }

  return byHost;
}

function createEmptyActiveState(now = Date.now()) {
  return {
    tabId: null,
    url: "",
    host: "",
    lastTickAt: now,
    reason: "inactive"
  };
}

async function getSettings() {
  const result = await storageGet([SETTINGS_KEY]);
  return sanitizeSettings(result[SETTINGS_KEY] || DEFAULT_SETTINGS);
}

async function getStats() {
  const result = await storageGet([STATS_KEY]);
  return ensureStatsForToday(
    result[STATS_KEY] || {
      day: localDateKey(),
      todayByHost: {},
      totalByHost: {},
      dailyByDate: {},
      remindersByHost: {}
    }
  );
}

async function getActiveState() {
  const result = await storageGet([ACTIVE_STATE_KEY]);
  return {
    ...createEmptyActiveState(),
    ...(result[ACTIVE_STATE_KEY] || {})
  };
}

async function updateBadge(host, seconds, limitSeconds = Number.POSITIVE_INFINITY, totalSeconds = seconds, language = "en") {
  const hasLimit = Number.isFinite(limitSeconds);
  const remainingSeconds = hasLimit ? Math.max(0, limitSeconds - totalSeconds) : 0;

  if (!host) {
    if (!hasLimit) {
      await setBadgeText("");
      await setActionTitle("Chill & Focus");
      return;
    }

    await setBadgeBackgroundColor(remainingSeconds <= 0 ? "#b91c1c" : "#0f766e");
    await setBadgeText(formatBadge(remainingSeconds));
    await setActionTitle(
      translate(language, "actionLeft", {
        left: formatDuration(remainingSeconds),
        used: formatDuration(totalSeconds)
      })
    );
    return;
  }

  await setBadgeBackgroundColor(totalSeconds >= limitSeconds ? "#b91c1c" : "#0f766e");
  await setBadgeText(formatBadge(remainingSeconds));
  await setActionTitle(
    translate(language, "actionSiteLeft", {
      host,
      left: formatDuration(remainingSeconds),
      site: formatDuration(seconds),
      used: formatDuration(totalSeconds)
    })
  );
}

function translate(language, key, values = {}) {
  const normalizedLanguage = sanitizeLanguage(language);
  const template =
    BACKGROUND_TEXT[normalizedLanguage][key] ||
    BACKGROUND_TEXT.en[key] ||
    key;

  return template.replace(/\{(\w+)\}/g, (_match, token) => {
    return Object.prototype.hasOwnProperty.call(values, token) ? values[token] : "";
  });
}

function formatBadge(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    return hours > 99 ? "99+" : `${hours}h`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes > 99) {
    return "99+";
  }
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
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

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function storageSet(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, resolve);
  });
}

function queryTabs(queryInfo) {
  return new Promise((resolve) => {
    chrome.tabs.query(queryInfo, resolve);
  });
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, () => {
      if (chrome.runtime.lastError) {
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

async function deliverTabMessage(tab, message) {
  if (!tab?.id) {
    return false;
  }

  const delivered = await sendTabMessage(tab.id, message);
  if (delivered) {
    return true;
  }

  const injected = await injectContentBlocker(tab.id);
  if (!injected) {
    return false;
  }

  return sendTabMessage(tab.id, message);
}

function injectContentBlocker(tabId) {
  return new Promise((resolve) => {
    if (!chrome.scripting?.executeScript) {
      resolve(false);
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["content-blocker.js"]
      },
      () => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(true);
      }
    );
  });
}

function getLastFocusedWindow() {
  return new Promise((resolve) => {
    chrome.windows.getLastFocused({}, (windowInfo) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(windowInfo);
    });
  });
}

function createAlarm(name, alarmInfo) {
  return new Promise((resolve) => {
    chrome.alarms.create(name, alarmInfo);
    resolve();
  });
}

function createNotification(id, options) {
  return new Promise((resolve) => {
    chrome.notifications.create(id, options, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });
}

function setBadgeText(text) {
  return new Promise((resolve) => {
    chrome.action.setBadgeText({ text }, resolve);
  });
}

function setBadgeBackgroundColor(color) {
  return new Promise((resolve) => {
    chrome.action.setBadgeBackgroundColor({ color }, resolve);
  });
}

function setActionTitle(title) {
  return new Promise((resolve) => {
    chrome.action.setTitle({ title }, resolve);
  });
}

