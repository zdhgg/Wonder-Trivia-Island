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
    default: "settings-profile"
  }
});

const emit = defineEmits(["profile-saved", "export-backup", "import-backup", "pending-state-change", "update:activeSectionId"]);

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

const latestLog = computed(() => activityLogs.value[0] ?? null);
const dirtySectionItems = computed(() =>
  quickLinks.filter((item) => item.dirtyKey && sectionDirtyState.value[item.dirtyKey])
);
const dirtySectionCount = computed(() => dirtySectionItems.value.length);
const hasPendingChanges = computed(() => dirtySectionCount.value > 0);
const pageStatusLabel = computed(() => {
  if (props.isBackupBusy) {
    return "处理中";
  }

  if (hasPendingChanges.value) {
    return `有 ${dirtySectionCount.value} 处未保存`;
  }

  return "本机已保存";
});
const settingsUpdatedLabel = computed(() =>
  formatTimestamp(
    latestLog.value?.createdAt ||
      coachingPreferences.value.updatedAt ||
      aiPreferences.value.updatedAt ||
      profile.value.updatedAt
  )
);
const activeSectionLabel = computed(
  () => getSettingsSectionById(activeSectionModel.value)?.navLabel || quickLinks[0]?.label || "学习档案"
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
      <div class="settings-page__hero-topline">
        <h1 class="settings-page__title">设置</h1>
        <span :class="['settings-page__status-pill', { 'settings-page__status-pill--warning': hasPendingChanges }]">
          {{ pageStatusLabel }}<template v-if="!hasPendingChanges"> · {{ settingsUpdatedLabel }}</template>
        </span>
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
      </aside>

      <div class="settings-page__content">
        <SettingsCenterPanel
          :active-section-id="activeSectionModel"
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
  gap: 18px;
}

.settings-page__hero {
  position: relative;
  overflow: hidden;
  padding: 12px 18px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(173, 235, 255, 0.16) 0%, rgba(173, 235, 255, 0) 34%),
    linear-gradient(180deg, rgba(251, 254, 255, 0.96) 0%, rgba(248, 251, 253, 0.92) 100%);
  box-shadow:
    0 24px 36px -34px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.settings-page__hero-topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-page__title {
  margin: 0;
  color: var(--color-ink, #24324a);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.35rem;
  line-height: 1.1;
}

.settings-page__status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 12px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.8rem;
  font-weight: 700;
}

.settings-page__status-pill--warning {
  border-color: rgba(255, 186, 82, 0.32);
  background: rgba(255, 248, 229, 0.92);
  color: #7b5a28;
}

.settings-page__rail-eyebrow {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-page__layout {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

/* 桌面两栏：框架一屏，左导航与右内容各自内部滚动 */
@media (min-width: 1081px) {
  .settings-page__layout {
    height: calc(100dvh - 216px);
    align-items: stretch;
  }

  .settings-page__rail {
    align-self: stretch;
    overflow-y: auto;
    align-content: start;
  }

  .settings-page__content {
    height: 100%;
    overflow-y: auto;
  }
}

.settings-page__rail {
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
}
</style>
