const CHILLFO_LUCIDE_ICONS = {
  "ban": [
    '<circle cx="12" cy="12" r="10"/>',
    '<path d="m4.9 4.9 14.2 14.2"/>'
  ],
  "bar-chart-3": [
    '<path d="M3 3v18h18"/>',
    '<path d="M18 17V9"/>',
    '<path d="M13 17V5"/>',
    '<path d="M8 17v-3"/>'
  ],
  "bell": [
    '<path d="M10.268 21a2 2 0 0 0 3.464 0"/>',
    '<path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>'
  ],
  "check": [
    '<path d="M20 6 9 17l-5-5"/>'
  ],
  "clock": [
    '<circle cx="12" cy="12" r="10"/>',
    '<polyline points="12 6 12 12 16 14"/>'
  ],
  "globe-2": [
    '<circle cx="12" cy="12" r="10"/>',
    '<path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>',
    '<path d="M2 12h20"/>'
  ],
  "list-checks": [
    '<path d="m3 17 2 2 4-4"/>',
    '<path d="m3 7 2 2 4-4"/>',
    '<path d="M13 6h8"/>',
    '<path d="M13 12h8"/>',
    '<path d="M13 18h8"/>'
  ],
  "pencil": [
    '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    '<path d="m15 5 4 4"/>'
  ],
  "power": [
    '<path d="M12 2v10"/>',
    '<path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>'
  ],
  "rotate-ccw": [
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>',
    '<path d="M3 3v5h5"/>'
  ],
  "save": [
    '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>',
    '<path d="M17 21v-7H7v7"/>',
    '<path d="M7 3v4h8"/>'
  ],
  "settings": [
    '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>',
    '<circle cx="12" cy="12" r="3"/>'
  ],
  "shield-check": [
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/>',
    '<path d="m9 12 2 2 4-4"/>'
  ],
  "timer": [
    '<line x1="10" x2="14" y1="2" y2="2"/>',
    '<line x1="12" x2="15" y1="14" y2="11"/>',
    '<circle cx="12" cy="14" r="8"/>'
  ]
};

function createChillfoLucideIcon(name) {
  const paths = CHILLFO_LUCIDE_ICONS[name];
  if (!paths) {
    return "";
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths.join("")}</svg>`;
}

function renderChillfoLucideIcons(root = document) {
  root.querySelectorAll("[data-lucide]").forEach((element) => {
    const iconName = element.getAttribute("data-lucide");
    element.innerHTML = createChillfoLucideIcon(iconName);
  });
}

window.ChillfoIcons = {
  create: createChillfoLucideIcon,
  render: renderChillfoLucideIcons
};

document.addEventListener("DOMContentLoaded", () => {
  renderChillfoLucideIcons();
});
