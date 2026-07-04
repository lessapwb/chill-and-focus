const CHILLFO_TRANSLATIONS = {
  en: {
    activeDomain: "Active domain",
    blockedDetail: "Daily limit: {limit} minutes total across tracked sites. Current total: {total} minutes. {host}: {site} minutes today.",
    blockedEyebrow: "Time limit reached",
    blockedMessage: "Time is up. You have spent {minutes} minutes across tracked sites today.",
    blockedTitle: "Chill & Focus blocked this page",
    couldNotLoad: "Could not load",
    couldNotSave: "Could not save",
    currentSite: "Current site",
    dailyBlockedSiteTime: "Daily total time",
    dailyTotalSeries: "Daily total time series for the last {days} days",
    dailyLimitReached: "Daily limit reached",
    dailyTotalLimit: "Daily total limit",
    defaults: "Defaults",
    domains: "Domains",
    editSites: "Edit sites",
    enabled: "Enabled",
    focusRules: "Focus rules",
    language: "Language / Idioma",
    lastDays: "Last {days} days",
    leavePage: "Leave page",
    loading: "Loading...",
    noTrackedHistory: "No tracked history yet.",
    noTrackedSites: "No tracked sites",
    noTrackedTimeToday: "No tracked time today.",
    notTrackingPage: "Not tracking this page",
    notificationRepeat: "Notification repeat",
    paused: "Paused",
    saveChanges: "Save changes",
    saved: "Saved",
    settings: "Settings",
    timeLeftBeforeBlock: "{time} left before daily block",
    timeLeftToday: "Time left today",
    today: "Today",
    todayBySite: "Today by site",
    totalAcrossTrackedSites: "Total across tracked sites",
    trackedDomains: "Tracked domains",
    trackedSites: "Tracked sites",
    unavailable: "Unavailable",
    usedToday: "{time} used today"
  },
  pt: {
    activeDomain: "Domínio ativo",
    blockedDetail: "Limite diário: {limit} minutos no total em sites rastreados. Total atual: {total} minutos. {host}: {site} minutos hoje.",
    blockedEyebrow: "Limite de tempo atingido",
    blockedMessage: "O tempo acabou. Você passou {minutes} minutos em sites rastreados hoje.",
    blockedTitle: "Chill & Focus bloqueou esta página",
    couldNotLoad: "Não foi possível carregar",
    couldNotSave: "Não foi possível salvar",
    currentSite: "Site atual",
    dailyBlockedSiteTime: "Tempo total por dia",
    dailyTotalSeries: "Série de tempo total dos últimos {days} dias",
    dailyLimitReached: "Limite diário atingido",
    dailyTotalLimit: "Limite diário total",
    defaults: "Padrões",
    domains: "Domínios",
    editSites: "Editar sites",
    enabled: "Ativado",
    focusRules: "Regras de foco",
    language: "Language / Idioma",
    lastDays: "Últimos {days} dias",
    leavePage: "Sair da página",
    loading: "Carregando...",
    noTrackedHistory: "Ainda não há histórico rastreado.",
    noTrackedSites: "Nenhum site rastreado",
    noTrackedTimeToday: "Nenhum tempo rastreado hoje.",
    notTrackingPage: "Esta página não está sendo rastreada",
    notificationRepeat: "Repetir notificação",
    paused: "Pausado",
    saveChanges: "Salvar alterações",
    saved: "Salvo",
    settings: "Configurações",
    timeLeftBeforeBlock: "{time} restantes antes do bloqueio diário",
    timeLeftToday: "Tempo restante hoje",
    today: "Hoje",
    todayBySite: "Hoje por site",
    totalAcrossTrackedSites: "Total em sites rastreados",
    trackedDomains: "Domínios rastreados",
    trackedSites: "Sites rastreados",
    unavailable: "Indisponível",
    usedToday: "{time} usados hoje"
  }
};

function normalizeChillfoLanguage(language) {
  return language === "pt" ? "pt" : "en";
}

function chillfoTranslate(language, key, values = {}) {
  const normalizedLanguage = normalizeChillfoLanguage(language);
  const template =
    CHILLFO_TRANSLATIONS[normalizedLanguage][key] ||
    CHILLFO_TRANSLATIONS.en[key] ||
    key;

  return template.replace(/\{(\w+)\}/g, (_match, token) => {
    return Object.prototype.hasOwnProperty.call(values, token) ? values[token] : "";
  });
}

function applyChillfoTranslations(language, root = document) {
  const normalizedLanguage = normalizeChillfoLanguage(language);
  root.documentElement.lang = normalizedLanguage === "pt" ? "pt-BR" : "en";

  root.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = chillfoTranslate(normalizedLanguage, element.dataset.i18n);
  });

  root.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.title = chillfoTranslate(normalizedLanguage, element.dataset.i18nTitle);
  });
}

window.ChillfoI18n = {
  apply: applyChillfoTranslations,
  normalize: normalizeChillfoLanguage,
  t: chillfoTranslate
};
