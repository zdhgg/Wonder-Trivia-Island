<script setup>
import { computed, nextTick, ref, watch } from "vue";
import StudyNarrationPackPanel from "../components/StudyNarrationPackPanel.vue";
import ToolsOverviewSection from "../components/tools/ToolsOverviewSection.vue";
import { TOOL_SECTION_IDS, TOOL_SECTIONS, getToolSectionById } from "../components/tools/toolSections";
import QuestionCatalogView from "./QuestionCatalogView.vue";
import QuestionImportView from "./QuestionImportView.vue";

const props = defineProps({
  adminKey: {
    type: String,
    default: ""
  },
  activeSectionId: {
    type: String,
    default: TOOL_SECTION_IDS[0]
  },
  catalogPrefill: {
    type: Object,
    default: null
  },
  returnLabel: {
    type: String,
    default: "首页"
  }
});

const emit = defineEmits(["back", "imported", "update:adminKey", "update:activeSectionId"]);

const sectionHeadingRef = ref(null);
const quickLinks = TOOL_SECTIONS.map((section) => ({
  id: section.id,
  href: section.href,
  label: section.navLabel,
  description: section.description
}));

const activeSectionModel = computed({
  get: () => getToolSectionById(props.activeSectionId).id,
  set: (value) => emit("update:activeSectionId", getToolSectionById(value).id)
});
const activeSection = computed(() => getToolSectionById(activeSectionModel.value));
const activeSectionLabel = computed(() => activeSection.value.navLabel);
const adminModeLabel = computed(() => (props.adminKey ? "已输入管理口令" : "本机模式可直接访问"));
const catalogContextLabel = computed(() => String(props.catalogPrefill?.sourceLabel || "").trim());
const statusTitle = computed(() => {
  if (activeSectionModel.value === TOOL_SECTION_IDS[3]) {
    return "讲堂缓存属于内部管理项";
  }

  if (catalogContextLabel.value) {
    return "当前带着题库预筛选上下文";
  }

  return "工具台按模块处理，不再弹层堆卡片";
});
const statusText = computed(() => {
  if (activeSectionModel.value === TOOL_SECTION_IDS[3]) {
    return "这里只用于查看和清理讲堂语音缓存，不影响正常学习流程。";
  }

  if (catalogContextLabel.value) {
    return `${catalogContextLabel.value}。进入题库后会直接套用这组筛选条件。`;
  }

  return "题库、导入和缓存管理共用一套左栏导航，右侧只保留当前正在处理的模块。";
});
const activeSectionComponent = computed(() => {
  switch (activeSectionModel.value) {
    case TOOL_SECTION_IDS[1]:
      return QuestionCatalogView;
    case TOOL_SECTION_IDS[2]:
      return QuestionImportView;
    case TOOL_SECTION_IDS[3]:
      return StudyNarrationPackPanel;
    case TOOL_SECTION_IDS[0]:
    default:
      return ToolsOverviewSection;
  }
});
const activeSectionProps = computed(() => {
  switch (activeSectionModel.value) {
    case TOOL_SECTION_IDS[1]:
      return {
        adminKey: props.adminKey,
        initialFilters: props.catalogPrefill
      };
    case TOOL_SECTION_IDS[2]:
      return {
        adminKey: props.adminKey
      };
    case TOOL_SECTION_IDS[3]:
      return {
        showAllPacks: true,
        allowBulkDelete: true,
        internalMode: true
      };
    case TOOL_SECTION_IDS[0]:
    default:
      return {
        sections: TOOL_SECTIONS,
        activeSectionId: activeSectionModel.value,
        adminModeLabel: adminModeLabel.value,
        catalogContextLabel: catalogContextLabel.value
      };
  }
});
const activeSectionListeners = computed(() => {
  switch (activeSectionModel.value) {
    case TOOL_SECTION_IDS[1]:
      return {
        "update:adminKey": handleAdminKeyUpdate
      };
    case TOOL_SECTION_IDS[2]:
      return {
        imported: handleImported,
        "update:adminKey": handleAdminKeyUpdate
      };
    case TOOL_SECTION_IDS[0]:
      return {
        "section-select": handleSectionSelect
      };
    default:
      return {};
  }
});

function resolveSectionId(href = "") {
  return String(href || "").replace(/^#/, "");
}

function handleQuickLinkClick(item) {
  handleSectionSelect(resolveSectionId(item.href));
}

function handleSectionSelect(sectionId = "") {
  activeSectionModel.value = resolveSectionId(sectionId);
}

function handleAdminKeyUpdate(value) {
  emit("update:adminKey", value);
}

function handleImported() {
  emit("imported");
}

watch(
  activeSectionModel,
  async (nextSectionId) => {
    await nextTick();
    sectionHeadingRef.value?.focus();
  },
  { immediate: true }
);
</script>

<template>
  <section class="tools-page">
    <header class="tools-page__hero">
      <div class="tools-page__hero-copy">
        <p class="tools-page__eyebrow">Workspace</p>
        <div class="tools-page__hero-topline">
          <div class="tools-page__hero-main">
            <h1 class="tools-page__title">工具台</h1>
            <p class="tools-page__summary">题库、导入和讲堂缓存都在这里按模块处理，和设置页保持同一套工作区结构。</p>
          </div>

          <div class="tools-page__hero-actions">
            <button class="tools-page__back-button" type="button" @click="$emit('back')">
              返回{{ returnLabel }}
            </button>
          </div>
        </div>

        <div class="tools-page__hero-chips" aria-label="工具台摘要">
          <span class="tools-page__hero-chip">当前模块：{{ activeSectionLabel }}</span>
          <span class="tools-page__hero-chip">{{ adminModeLabel }}</span>
          <span class="tools-page__hero-chip">3 个管理模块</span>
          <span v-if="catalogContextLabel" class="tools-page__hero-chip">来源：{{ catalogContextLabel }}</span>
        </div>
      </div>
    </header>

    <div class="tools-page__layout">
      <aside class="tools-page__rail" aria-label="工具导航">
        <section class="tools-page__rail-card">
          <p class="tools-page__rail-eyebrow">Sections</p>
          <h2 class="tools-page__rail-title">模块导航</h2>
          <p class="tools-page__rail-caption">当前：{{ activeSectionLabel }}</p>

          <nav class="tools-page__nav">
            <a
              v-for="item in quickLinks"
              :key="item.href"
              :class="['tools-page__nav-link', { 'tools-page__nav-link--active': activeSectionModel === resolveSectionId(item.href) }]"
              :href="item.href"
              :aria-current="activeSectionModel === resolveSectionId(item.href) ? 'location' : undefined"
              @click.prevent="handleQuickLinkClick(item)"
            >
              <span class="tools-page__nav-link-label">{{ item.label }}</span>
            </a>
          </nav>
        </section>

        <section class="tools-page__rail-card">
          <p class="tools-page__rail-eyebrow">Status</p>
          <h2 class="tools-page__rail-title">{{ statusTitle }}</h2>
          <p class="tools-page__status">{{ statusText }}</p>
          <p class="tools-page__rail-text">题库和导入共用管理口令；讲堂缓存保留内部模式标识。</p>
        </section>
      </aside>

      <div class="tools-page__content">
        <Transition name="tools-page-swap" mode="out-in">
          <section :key="activeSectionModel" class="tools-page__section-stage">
            <h2 ref="sectionHeadingRef" tabindex="-1" class="tools-page__visually-hidden">
              {{ activeSection.sectionTitle }}
            </h2>

            <component :is="activeSectionComponent" v-bind="activeSectionProps" v-on="activeSectionListeners" />
          </section>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tools-page {
  display: grid;
  gap: 22px;
}

.tools-page__hero {
  position: relative;
  overflow: hidden;
  padding: 24px 26px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 32px;
  background:
    radial-gradient(circle at top right, rgba(173, 235, 255, 0.16) 0%, rgba(173, 235, 255, 0) 34%),
    linear-gradient(180deg, rgba(251, 254, 255, 0.96) 0%, rgba(248, 251, 253, 0.92) 100%);
  box-shadow:
    0 24px 36px -34px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.tools-page__hero::after {
  content: "";
  position: absolute;
  top: -34px;
  right: -26px;
  width: 136px;
  height: 136px;
  border-radius: 34px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.08) 100%);
  transform: rotate(14deg);
}

.tools-page__hero-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 16px;
}

.tools-page__eyebrow,
.tools-page__rail-eyebrow {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tools-page__hero-topline {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.tools-page__hero-main {
  display: grid;
  gap: 8px;
}

.tools-page__title {
  margin: 0;
  color: var(--color-ink, #24324a);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(2rem, 4vw, 2.8rem);
  line-height: 1.02;
}

.tools-page__summary,
.tools-page__rail-text,
.tools-page__status {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.96rem;
  line-height: 1.6;
}

.tools-page__hero-actions {
  display: flex;
  justify-content: flex-end;
}

.tools-page__back-button {
  min-height: 42px;
  padding: 10px 16px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-ink, #24324a);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.tools-page__back-button:hover,
.tools-page__back-button:focus-visible {
  border-color: rgba(124, 216, 184, 0.42);
  background: rgba(247, 252, 249, 0.98);
  box-shadow: 0 16px 24px -24px rgba(36, 50, 74, 0.42);
  transform: translateY(-1px);
  outline: none;
}

.tools-page__hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tools-page__hero-chip {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 8px 12px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink, #24324a);
  font-size: 0.86rem;
  font-weight: 700;
}

.tools-page__layout {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.tools-page__rail {
  position: sticky;
  top: 20px;
  display: grid;
  gap: 16px;
}

.tools-page__rail-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 18px 30px -30px rgba(36, 50, 74, 0.32);
}

.tools-page__rail-title {
  margin: 0;
  color: var(--color-ink, #24324a);
  font-size: 1rem;
  line-height: 1.35;
}

.tools-page__rail-caption {
  margin: -2px 0 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.84rem;
  line-height: 1.5;
}

.tools-page__nav {
  display: grid;
  gap: 8px;
}

.tools-page__nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  padding: 9px 12px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 14px;
  background: rgba(248, 251, 253, 0.9);
  color: var(--color-ink, #24324a);
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.tools-page__nav-link:hover,
.tools-page__nav-link:focus-visible {
  border-color: rgba(124, 216, 184, 0.4);
  background: rgba(245, 252, 248, 0.96);
  box-shadow: 0 14px 22px -22px rgba(36, 50, 74, 0.36);
  outline: none;
  transform: translateY(-1px);
}

.tools-page__nav-link--active {
  border-color: rgba(124, 216, 184, 0.48);
  background: linear-gradient(180deg, rgba(184, 242, 223, 0.92) 0%, rgba(255, 255, 255, 0.94) 100%);
  color: var(--color-ink, #24324a);
  box-shadow:
    0 16px 26px -24px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.tools-page__nav-link-label {
  min-width: 0;
}

.tools-page__content {
  min-width: 0;
}

.tools-page__section-stage {
  display: grid;
  gap: 16px;
}

.tools-page__visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.tools-page-swap-enter-active,
.tools-page-swap-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.tools-page-swap-enter-from,
.tools-page-swap-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 1080px) {
  .tools-page__layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .tools-page__rail {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .tools-page__hero {
    padding: 20px;
    border-radius: 26px;
  }

  .tools-page__hero-topline {
    flex-direction: column;
    align-items: stretch;
  }

  .tools-page__hero-actions {
    justify-content: flex-start;
  }

  .tools-page__rail {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
