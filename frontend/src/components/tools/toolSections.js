export const TOOL_SECTIONS = Object.freeze([
  {
    id: "tools-overview",
    href: "#tools-overview",
    routeSlug: "",
    navLabel: "概览",
    sectionTitle: "概览",
    description: "先看工具台里有哪些管理能力。"
  },
  {
    id: "tools-catalog",
    href: "#tools-catalog",
    routeSlug: "catalog",
    navLabel: "题库",
    sectionTitle: "题库",
    description: "查看、筛选和维护现有题目。"
  },
  {
    id: "tools-import",
    href: "#tools-import",
    routeSlug: "import",
    navLabel: "导入",
    sectionTitle: "导入",
    description: "追加或覆盖导入题目，也支持 AI 批量生成。"
  },
  {
    id: "tools-cache",
    href: "#tools-cache",
    routeSlug: "cache",
    navLabel: "讲堂缓存",
    sectionTitle: "讲堂缓存",
    description: "内部查看和清理讲堂语音缓存。"
  }
]);

export const TOOL_SECTION_IDS = Object.freeze(TOOL_SECTIONS.map((section) => section.id));
export const TOOL_DEFAULT_SECTION_ID = TOOL_SECTIONS[0].id;

export function getToolSectionById(sectionId = "") {
  return TOOL_SECTIONS.find((section) => section.id === String(sectionId || "").trim()) || TOOL_SECTIONS[0];
}

export function getToolSectionByRouteSlug(routeSlug = "") {
  const normalizedRouteSlug = String(routeSlug || "").trim();

  return TOOL_SECTIONS.find((section) => String(section.routeSlug || "") === normalizedRouteSlug) || TOOL_SECTIONS[0];
}
