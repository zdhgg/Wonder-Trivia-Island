<script setup>
import { computed, nextTick, ref, watch } from "vue";
import StudyNarrationPackPanel from "../components/StudyNarrationPackPanel.vue";
import { TOOL_DEFAULT_SECTION_ID, TOOL_SECTION_ID, TOOL_SECTIONS, getToolSectionById } from "../components/tools/toolSections";
import QuestionCatalogView from "./QuestionCatalogView.vue";
import QuestionImportView from "./QuestionImportView.vue";

const props = defineProps({
  adminKey: {
    type: String,
    default: ""
  },
  activeSectionId: {
    type: String,
    default: TOOL_DEFAULT_SECTION_ID
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
const adminModeLabel = computed(() => (props.adminKey ? "已输入管理口令" : "本机模式可直接访问"));
const catalogContextLabel = computed(() => String(props.catalogPrefill?.sourceLabel || "").trim());
const activeSectionComponent = computed(() => {
  switch (activeSectionModel.value) {
    case TOOL_SECTION_ID.IMPORT:
      return QuestionImportView;
    case TOOL_SECTION_ID.CACHE:
      return StudyNarrationPackPanel;
    case TOOL_SECTION_ID.CATALOG:
    default:
      return QuestionCatalogView;
  }
});
const activeSectionProps = computed(() => {
  switch (activeSectionModel.value) {
    case TOOL_SECTION_ID.IMPORT:
      return {
        adminKey: props.adminKey
      };
    case TOOL_SECTION_ID.CACHE:
      return {
        showAllPacks: true,
        allowBulkDelete: true,
        internalMode: true
      };
    case TOOL_SECTION_ID.CATALOG:
    default:
      return {
        adminKey: props.adminKey,
        initialFilters: props.catalogPrefill
      };
  }
});
const activeSectionListeners = computed(() => {
  switch (activeSectionModel.value) {
    case TOOL_SECTION_ID.IMPORT:
      return {
        imported: handleImported,
        "update:adminKey": handleAdminKeyUpdate
      };
    case TOOL_SECTION_ID.CATALOG:
      return {
        "update:adminKey": handleAdminKeyUpdate
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
  async () => {
    await nextTick();
    sectionHeadingRef.value?.focus();
  },
  { immediate: true }
);
</script>

<template>
  <section class="tools-page">
    <header class="tools-page__bar">
      <div class="tools-page__bar-main">
        <h1 class="tools-page__title">工具台</h1>
        <span class="tools-page__bar-divider" aria-hidden="true"></span>
        <h2 ref="sectionHeadingRef" tabindex="-1" class="tools-page__section-name">
          {{ activeSection.sectionTitle }}
        </h2>
        <span class="tools-page__bar-chip">{{ adminModeLabel }}</span>
        <span v-if="catalogContextLabel" class="tools-page__bar-chip">来源：{{ catalogContextLabel }}</span>
      </div>

      <div class="tools-page__bar-actions">
        <button class="tools-page__back-button" type="button" @click="$emit('back')">
          返回{{ returnLabel }}
        </button>
      </div>
    </header>

    <div class="tools-page__layout">
      <aside class="tools-page__rail" aria-label="工具导航">
        <nav class="tools-page__nav">
          <a
            v-for="item in quickLinks"
            :key="item.href"
            :class="['tools-page__nav-link', { 'tools-page__nav-link--active': activeSectionModel === item.id }]"
            :href="item.href"
            :aria-current="activeSectionModel === item.id ? 'location' : undefined"
            @click.prevent="handleQuickLinkClick(item)"
          >
            <span class="tools-page__nav-link-label">{{ item.label }}</span>
            <span class="tools-page__nav-link-desc">{{ item.description }}</span>
          </a>
        </nav>
      </aside>

      <div class="tools-page__content">
        <Transition name="tools-page-swap" mode="out-in">
          <section :key="activeSectionModel" class="tools-page__section-stage">
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
  gap: 14px;
}

.tools-page__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 18px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(251, 254, 255, 0.96) 0%, rgba(248, 251, 253, 0.92) 100%);
  box-shadow:
    0 18px 30px -30px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.tools-page__bar-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.tools-page__title {
  margin: 0;
  color: var(--color-ink, #24324a);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.5rem;
  line-height: 1.1;
}

.tools-page__bar-divider {
  width: 1px;
  height: 22px;
  background: rgba(36, 50, 74, 0.14);
}

.tools-page__section-name {
  margin: 0;
  color: var(--color-ink, #24324a);
  font-size: 1.05rem;
  line-height: 1.2;
}

.tools-page__section-name:focus-visible {
  outline: none;
  border-radius: 8px;
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.28);
}

.tools-page__bar-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 11px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.8rem;
  font-weight: 700;
}

.tools-page__bar-actions {
  display: flex;
  justify-content: flex-end;
}

.tools-page__back-button {
  min-height: 38px;
  padding: 8px 15px;
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

.tools-page__layout {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.tools-page__rail {
  min-width: 0;
}

.tools-page__nav {
  display: grid;
  gap: 8px;
}

.tools-page__nav-link {
  display: grid;
  gap: 4px;
  padding: 11px 13px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 16px;
  background: rgba(248, 251, 253, 0.9);
  color: var(--color-ink, #24324a);
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
  box-shadow:
    0 16px 26px -24px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.tools-page__nav-link-label {
  font-size: 0.94rem;
  font-weight: 800;
  line-height: 1.3;
}

.tools-page__nav-link-desc {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.78rem;
  line-height: 1.45;
}

.tools-page__content {
  min-width: 0;
}

.tools-page__section-stage {
  display: grid;
  /* 隐式列默认 auto，会被模块的 min-content 撑破内容列；显式允许收缩到 0。 */
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
}

/* 桌面两栏：框架一屏，左导航与右内容各自内部滚动（与设置页同一套约定）。 */
/* 195px = 24 外壳上边距 + 52 站点导航 + 14 导航下边距 + 67 工具栏 + 14 间距 + 24 外壳下边距 */
@media (min-width: 1081px) {
  .tools-page__layout {
    height: calc(100dvh - 195px);
    align-items: stretch;
  }

  /* 工具栏固定单行，来源标记过长时截断，避免高度变化让上面的计算失准。 */
  .tools-page__bar-main {
    flex-wrap: nowrap;
    overflow: hidden;
  }

  .tools-page__bar-chip {
    max-width: 260px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    display: block;
    line-height: 20px;
    padding-top: 5px;
    padding-bottom: 5px;
  }

  .tools-page__rail {
    align-self: stretch;
    overflow-y: auto;
    align-content: start;
    overscroll-behavior: contain;
    padding-right: 4px;
  }

  .tools-page__content {
    height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-right: 4px;
  }
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

  .tools-page__nav {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

@media (max-width: 720px) {
  .tools-page__bar {
    flex-direction: column;
    align-items: stretch;
    padding: 14px;
    border-radius: 18px;
  }

  .tools-page__bar-actions {
    justify-content: flex-start;
  }

  .tools-page__nav {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tools-page__nav-link,
  .tools-page__back-button {
    transition: none;
  }

  .tools-page__nav-link:hover,
  .tools-page__back-button:hover {
    transform: none;
  }

  .tools-page-swap-enter-active,
  .tools-page-swap-leave-active {
    transition: none;
  }

  .tools-page-swap-enter-from,
  .tools-page-swap-leave-to {
    transform: none;
  }
}
</style>
