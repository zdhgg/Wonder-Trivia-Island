export const TOOL_SECTION_ID = Object.freeze({
  CATALOG: "tools-catalog",
  IMPORT: "tools-import",
  CACHE: "tools-cache"
});

export const TOOL_SECTIONS = Object.freeze([
  {
    id: TOOL_SECTION_ID.CATALOG,
    href: "#tools-catalog",
    routeSlug: "catalog",
    navLabel: "题库",
    sectionTitle: "题库",
    description: "查看、筛选和维护现有题目。"
  },
  {
    id: TOOL_SECTION_ID.IMPORT,
    href: "#tools-import",
    routeSlug: "import",
    navLabel: "导入",
    sectionTitle: "导入",
    description: "核对外部 harness 提交的批次，确认后写入题库。"
  },
  {
    id: TOOL_SECTION_ID.CACHE,
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
