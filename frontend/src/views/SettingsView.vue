<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import SettingsCenterPanel from "../components/SettingsCenterPanel.vue";
import { getSettingsSectionById, SETTINGS_SECTIONS } from "../components/settings/settingsSections";
import { useSettingsStore } from "../stores/useSettingsStore";

const props = defineProps({
  backupStatusMessage: {
    type: String,
    default: ""
  },
  isBackupBusy: {
    type: Boolean,
    default: false
  },
  backupStats: {
    type: Array,
    default: () => []
  },
  activeSectionId: {
    type: String,
    default: "settings-overview"
  },
  returnLabel: {
    type: String,
    default: "首页"
  }
});

const emit = defineEmits(["back", "profile-saved", "export-backup", "import-backup", "pending-state-change", "update:activeSectionId"]);

const settingsStore = useSettingsStore();
settingsStore.hydrate();

const { profile, aiPreferences, coachingPreferences, activityLogs } = storeToRefs(settingsStore);

const allSectionLinks = SETTINGS_SECTIONS.map((section) => ({
  label: section.navLabel,
  href: section.href,
  dirtyKey: section.dirtyKey,
  hidden: Boolean(section.hidden)
}));
const quickLinks = allSectionLinks.filter((section) => !section.hidden);
const sectionDirtyState = ref({
  profile: false,
  ai: false,
  coaching: false
});
const activeSectionModel = computed({
  get: () => getSettingsSectionById(props.activeSectionId).id,
  set: (value) => emit("update:activeSectionId", getSettingsSectionById(resolveSectionId(value)).id)
});

const accountSummary = computed(() => `${profile.value.displayName} · ${profile.value.grade} · ${profile.value.semester}`);
const latestLog = computed(() => activityLogs.value[0] ?? null);
const dirtySectionItems = computed(() =>
  quickLinks.filter((item) => item.dirtyKey && sectionDirtyState.value[item.dirtyKey])
);
const dirtySectionCount = computed(() => dirtySectionItems.value.length);
const hasPendingChanges = computed(() => dirtySectionCount.value > 0);
const pendingSectionSummary = computed(() =>
  dirtySectionItems.value.map((item) => item.label).join("、")
);
const latestActivityText = computed(() => {
  if (hasPendingChanges.value) {
    return `还有 ${pendingSectionSummary.value} 未保存。切换页面前，先处理这些分区更稳。`;
  }

  return props.backupStatusMessage || latestLog.value?.detail || latestLog.value?.title || "设置按分区保存到本机。";
});
const pageStatusLabel = computed(() => {
  if (props.isBackupBusy) {
    return "处理中";
  }

  if (hasPendingChanges.value) {
    return `有 ${dirtySectionCount.value} 处未保存`;
  }

  return "本机已保存";
});
const aiModelLabel = computed(() => settingsStore.aiConfigurationSummary);
const coachSummary = computed(() => {
  const modeText = coachingPreferences.value.autoAdvanceOnCorrect ? "答对自动继续" : "答对停留看反馈";
  const reviewText = coachingPreferences.value.autoPlayAiReviewOnWrong ? "答错自动播报" : "答错手动播报";
  return `${modeText} · ${reviewText}`;
});
const settingsUpdatedLabel = computed(() =>
  formatTimestamp(
    latestLog.value?.createdAt ||
      coachingPreferences.value.updatedAt ||
      aiPreferences.value.updatedAt ||
      profile.value.updatedAt
  )
);
const summaryStats = computed(() => props.backupStats.slice(0, 4));
const activeSectionLabel = computed(
  () => getSettingsSectionById(activeSectionModel.value)?.navLabel || quickLinks[0]?.label || "概览"
);

function resolveSectionId(href = "") {
  return String(href || "").replace(/^#/, "");
}

function handleQuickLinkClick(item) {
  activeSectionModel.value = resolveSectionId(item.href);
}

function handleSectionSelect(sectionId) {
  activeSectionModel.value = sectionId;
}

function handleDirtyStateChange(nextDirtyState = {}) {
  sectionDirtyState.value = {
    profile: Boolean(nextDirtyState.profile),
    ai: Boolean(nextDirtyState.ai),
    coaching: Boolean(nextDirtyState.coaching)
  };
}

function handleBeforeUnload(event) {
  if (!hasPendingChanges.value) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
}

function formatTimestamp(value) {
  if (!value) {
    return "刚刚";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "最近";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

onMounted(() => {
  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener("beforeunload", handleBeforeUnload);
});

onBeforeUnmount(() => {
  if (typeof window === "undefined") {
    return;
  }

  window.removeEventListener("beforeunload", handleBeforeUnload);
});

watch(
  hasPendingChanges,
  (nextValue) => {
    emit("pending-state-change", nextValue);
  },
  { immediate: true }
);
</script>

<template>
  <section class="settings-page">
    <header class="settings-page__hero">
      <div class="settings-page__hero-copy">
        <p class="settings-page__eyebrow">Preferences</p>
        <div class="settings-page__hero-topline">
          <div class="settings-page__hero-main">
            <h1 class="settings-page__title">设置</h1>
            <p class="settings-page__summary">账户档案、AI、声音、备份和日志都放在一个完整页面里处理。</p>
          </div>

          <div class="settings-page__hero-actions">
            <button class="settings-page__back-button" type="button" @click="$emit('back')">
              返回{{ returnLabel }}
            </button>
          </div>
        </div>

        <div class="settings-page__hero-chips" aria-label="设置页摘要">
          <span class="settings-page__hero-chip">{{ accountSummary }}</span>
          <span class="settings-page__hero-chip">AI：{{ aiModelLabel }}</span>
          <span class="settings-page__hero-chip">陪练：{{ coachSummary }}</span>
          <span class="settings-page__hero-chip">{{ pageStatusLabel }} · {{ settingsUpdatedLabel }}</span>
        </div>
      </div>
    </header>

    <div class="settings-page__layout">
      <aside class="settings-page__rail" aria-label="设置导航">
        <section class="settings-page__rail-card">
          <p class="settings-page__rail-eyebrow">Sections</p>
          <h2 class="settings-page__rail-title">快速定位</h2>
          <p class="settings-page__rail-caption">
            当前：{{ activeSectionLabel }}<span v-if="hasPendingChanges"> · {{ dirtySectionCount }} 处未保存</span>
          </p>
          <nav class="settings-page__nav">
            <a
              v-for="item in quickLinks"
              :key="item.href"
              :class="[
                'settings-page__nav-link',
                { 'settings-page__nav-link--active': activeSectionModel === resolveSectionId(item.href) }
              ]"
              :href="item.href"
              :aria-current="activeSectionModel === resolveSectionId(item.href) ? 'location' : undefined"
              @click.prevent="handleQuickLinkClick(item)"
            >
              <span class="settings-page__nav-link-label">{{ item.label }}</span>
              <span v-if="item.dirtyKey && sectionDirtyState[item.dirtyKey]" class="settings-page__nav-link-badge">未保存</span>
            </a>
          </nav>
        </section>

        <section class="settings-page__rail-card">
          <p class="settings-page__rail-eyebrow">Status</p>
          <h2 class="settings-page__rail-title">本页按分区保存</h2>
          <p class="settings-page__rail-text">
            档案、AI、陪练和声音会分别保存到本机。备份恢复和日志清理这类操作会单独确认。
          </p>
          <p :class="['settings-page__status', { 'settings-page__status--warning': hasPendingChanges }]">{{ latestActivityText }}</p>

          <div v-if="summaryStats.length" class="settings-page__stats">
            <article v-for="item in summaryStats" :key="item.label" class="settings-page__stat">
              <span class="settings-page__stat-label">{{ item.label }}</span>
              <strong class="settings-page__stat-value">{{ item.value }}</strong>
            </article>
          </div>
        </section>
      </aside>

      <div class="settings-page__content">
        <SettingsCenterPanel
          :active-section-id="activeSectionModel"
          :show-hero="false"
          :backup-status-message="backupStatusMessage"
          :is-backup-busy="isBackupBusy"
          :backup-stats="backupStats"
          @dirty-state-change="handleDirtyStateChange"
          @section-select="handleSectionSelect"
          @profile-saved="$emit('profile-saved', $event)"
          @export-backup="$emit('export-backup')"
          @import-backup="$emit('import-backup', $event)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.settings-page {
  display: grid;
  gap: 22px;
}

.settings-page__hero {
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

.settings-page__hero::after {
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

.settings-page__hero-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 16px;
}

.settings-page__eyebrow,
.settings-page__rail-eyebrow {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-page__hero-topline {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.settings-page__hero-main {
  display: grid;
  gap: 8px;
}

.settings-page__title {
  margin: 0;
  color: var(--color-ink, #24324a);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(2rem, 4vw, 2.8rem);
  line-height: 1.02;
}

.settings-page__summary,
.settings-page__rail-text,
.settings-page__status {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.96rem;
  line-height: 1.6;
}

.settings-page__hero-actions {
  display: flex;
  justify-content: flex-end;
}

.settings-page__back-button {
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

.settings-page__back-button:hover,
.settings-page__back-button:focus-visible {
  border-color: rgba(124, 216, 184, 0.42);
  background: rgba(247, 252, 249, 0.98);
  box-shadow: 0 16px 24px -24px rgba(36, 50, 74, 0.42);
  transform: translateY(-1px);
  outline: none;
}

.settings-page__hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.settings-page__hero-chip {
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

.settings-page__layout {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.settings-page__rail {
  position: sticky;
  top: 20px;
  display: grid;
  gap: 16px;
}

.settings-page__rail-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 18px 30px -30px rgba(36, 50, 74, 0.32);
}

.settings-page__rail-title {
  margin: 0;
  color: var(--color-ink, #24324a);
  font-size: 1rem;
  line-height: 1.35;
}

.settings-page__rail-caption {
  margin: -2px 0 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.84rem;
  line-height: 1.5;
}

.settings-page__nav {
  display: grid;
  gap: 8px;
}

.settings-page__nav-link {
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

.settings-page__nav-link:hover,
.settings-page__nav-link:focus-visible {
  border-color: rgba(124, 216, 184, 0.4);
  background: rgba(245, 252, 248, 0.96);
  box-shadow: 0 14px 22px -22px rgba(36, 50, 74, 0.36);
  outline: none;
  transform: translateY(-1px);
}

.settings-page__nav-link--active {
  border-color: rgba(124, 216, 184, 0.48);
  background: linear-gradient(180deg, rgba(184, 242, 223, 0.92) 0%, rgba(255, 255, 255, 0.94) 100%);
  color: var(--color-ink, #24324a);
  box-shadow:
    0 16px 26px -24px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.settings-page__nav-link-label {
  min-width: 0;
}

.settings-page__nav-link-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  margin-left: 10px;
  padding: 2px 8px;
  border: 1px solid rgba(255, 186, 82, 0.32);
  border-radius: 999px;
  background: rgba(255, 247, 225, 0.92);
  color: #9b641d;
  font-size: 0.75rem;
  font-weight: 800;
  flex-shrink: 0;
}

.settings-page__status {
  padding: 10px 12px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 16px;
  background: rgba(247, 251, 255, 0.86);
}

.settings-page__status--warning {
  border-color: rgba(255, 186, 82, 0.24);
  background: rgba(255, 248, 229, 0.9);
  color: #7b5a28;
}

.settings-page__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.settings-page__stat {
  display: grid;
  gap: 4px;
  min-height: 78px;
  padding: 12px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 251, 253, 0.84) 100%);
}

.settings-page__stat-label {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.8rem;
  font-weight: 700;
}

.settings-page__stat-value {
  color: var(--color-ink, #24324a);
  font-size: 0.94rem;
  line-height: 1.4;
}

.settings-page__content {
  min-width: 0;
}

@media (max-width: 1080px) {
  .settings-page__layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings-page__rail {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .settings-page__hero {
    padding: 20px;
    border-radius: 26px;
  }

  .settings-page__hero-topline {
    flex-direction: column;
    align-items: stretch;
  }

  .settings-page__hero-actions {
    justify-content: flex-start;
  }

  .settings-page__rail {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings-page__stats {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
