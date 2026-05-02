export const SETTINGS_SECTIONS = Object.freeze([
  {
    id: "settings-overview",
    href: "#settings-overview",
    routeSlug: "",
    navLabel: "概览",
    sectionTitle: "概览",
    category: "overview",
    dirtyKey: ""
  },
  {
    id: "settings-profile",
    href: "#settings-profile",
    routeSlug: "profile",
    navLabel: "学习档案",
    sectionTitle: "学习档案",
    category: "editor",
    dirtyKey: "profile"
  },
  {
    id: "settings-ai",
    href: "#settings-ai",
    routeSlug: "ai",
    navLabel: "AI 配置",
    sectionTitle: "AI 配置",
    category: "editor",
    dirtyKey: "ai"
  },
  {
    id: "settings-model-library",
    href: "#settings-model-library",
    routeSlug: "model-library",
    navLabel: "模型管理",
    sectionTitle: "模型管理",
    category: "editor",
    dirtyKey: "ai",
    hidden: true
  },
  {
    id: "settings-coaching",
    href: "#settings-coaching",
    routeSlug: "coaching",
    navLabel: "学习陪练",
    sectionTitle: "学习陪练",
    category: "editor",
    dirtyKey: "coaching"
  },
  {
    id: "settings-audio",
    href: "#settings-audio",
    routeSlug: "audio",
    navLabel: "声音",
    sectionTitle: "声音",
    category: "instant",
    dirtyKey: ""
  },
  {
    id: "settings-backup",
    href: "#settings-backup",
    routeSlug: "backup",
    navLabel: "数据备份",
    sectionTitle: "数据备份",
    category: "utility",
    dirtyKey: ""
  },
  {
    id: "settings-logs",
    href: "#settings-logs",
    routeSlug: "logs",
    navLabel: "操作日志",
    sectionTitle: "操作日志",
    category: "utility",
    dirtyKey: ""
  }
]);

export const SETTINGS_SECTION_IDS = Object.freeze(SETTINGS_SECTIONS.map((section) => section.id));
export const SETTINGS_DEFAULT_SECTION_ID = SETTINGS_SECTIONS[0].id;

export function getSettingsSectionById(sectionId = "") {
  return SETTINGS_SECTIONS.find((section) => section.id === String(sectionId || "").trim()) || SETTINGS_SECTIONS[0];
}

export function getSettingsSectionByRouteSlug(routeSlug = "") {
  const normalizedRouteSlug = String(routeSlug || "").trim();

  return SETTINGS_SECTIONS.find((section) => String(section.routeSlug || "") === normalizedRouteSlug) || SETTINGS_SECTIONS[0];
}
