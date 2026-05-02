<script setup>
import { computed, onMounted, ref } from "vue";
import {
  clearPersistentStudyNarrationCache,
  inspectPersistentStudyNarrationCacheSummary
} from "../audio/studyNarrationPackManager";
import { useStudyNarrationPackStore } from "../stores/useStudyNarrationPackStore";

const props = defineProps({
  selectedGrade: {
    type: String,
    default: ""
  },
  selectedLessonId: {
    type: String,
    default: ""
  },
  showAllPacks: {
    type: Boolean,
    default: false
  },
  allowBulkDelete: {
    type: Boolean,
    default: false
  },
  internalMode: {
    type: Boolean,
    default: false
  }
});

const packStore = useStudyNarrationPackStore();
const isBulkDeleting = ref(false);
const persistentCacheSummary = ref({
  cachedAssetCount: 0,
  totalBytes: 0
});

const GRADE_KEY_BY_LABEL = Object.freeze({
  "一年级": "grade1",
  "二年级": "grade2",
  "三年级": "grade3",
  "四年级": "grade4",
  "五年级": "grade5",
  "六年级": "grade6"
});

function formatPackSize(totalBytes) {
  const bytes = Number(totalBytes || 0);

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 1 : 2)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

function getPackStatusTone(status) {
  if (status === "downloaded") {
    return "downloaded";
  }

  if (status === "downloading") {
    return "loading";
  }

  if (status === "deleting") {
    return "warning";
  }

  if (status === "error" || status === "unsupported") {
    return "warning";
  }

  if (status === "partial") {
    return "partial";
  }

  return "idle";
}

function getPackStatusLabel(pack, runtime) {
  if (runtime.status === "downloading") {
    return `正在下载 ${runtime.readyCount}/${Math.max(runtime.requestedCount, pack.audioClipCount)} 条语音`;
  }

  if (runtime.status === "deleting") {
    return "正在删除本地缓存";
  }

  if (runtime.status === "downloaded") {
    return `这包语音已经下载到本机浏览器，只要先打开讲堂页面，就能离线播放 ${runtime.readyCount || pack.audioClipCount} 条。`;
  }

  if (runtime.status === "partial") {
    return `已经离线缓存 ${runtime.readyCount}/${Math.max(runtime.requestedCount, pack.audioClipCount)} 条，还能继续补齐。`;
  }

  if (runtime.status === "unsupported") {
    return "当前浏览器不支持持久离线缓存，只能在线播放。";
  }

  if (runtime.status === "error") {
    return runtime.errorMessage || "这包语音下载失败了，可以再试一次。";
  }

  if (pack.audioClipCount <= 0) {
    return "这包还没有现成语音，后续补齐后才能下载。";
  }

  return "点一下就会把这包现有语音下载到本机浏览器；以后重新进入讲堂时，会优先直接走本地缓存。";
}

function getDownloadActionLabel(pack, runtime) {
  if (runtime.status === "downloading") {
    return "下载中";
  }

  if (runtime.status === "deleting") {
    return "删除中";
  }

  if (runtime.status === "partial") {
    return "继续下载";
  }

  if (runtime.status === "error") {
    return "重新下载";
  }

  if (runtime.status === "downloaded") {
    return "重新下载";
  }

  return pack.audioCoveragePercent >= 100 ? "下载到本机" : "下载现有语音";
}

const gradePack = computed(() => {
  const packKey = GRADE_KEY_BY_LABEL[props.selectedGrade] || "";
  return packKey ? packStore.getPackByKey(packKey) : null;
});

const currentLessonPacks = computed(() =>
  packStore.packs
    .filter((pack) => pack.kind === "priority" && pack.lessonIds.includes(props.selectedLessonId))
    .slice(0, 2)
);

const allPacks = computed(() =>
  [...packStore.packs].sort((left, right) => {
    const leftReadyCount = Number(packStore.getPackRuntimeState(left.key).readyCount || 0);
    const rightReadyCount = Number(packStore.getPackRuntimeState(right.key).readyCount || 0);

    if ((leftReadyCount > 0) !== (rightReadyCount > 0)) {
      return rightReadyCount > 0 ? 1 : -1;
    }

    if (left.kind !== right.kind) {
      return left.kind === "grade" ? -1 : 1;
    }

    return String(left.label || "").localeCompare(String(right.label || ""), "zh-CN");
  })
);

const visiblePacks = computed(() => {
  if (props.showAllPacks) {
    return allPacks.value;
  }

  const dedupedPacks = [];
  const seenPackKeys = new Set();

  for (const pack of [gradePack.value, ...currentLessonPacks.value]) {
    if (!pack || seenPackKeys.has(pack.key)) {
      continue;
    }

    seenPackKeys.add(pack.key);
    dedupedPacks.push(pack);
  }

  return dedupedPacks;
});

const downloadedPackCount = computed(() =>
  packStore.packs.filter((pack) => packStore.getPackRuntimeState(pack.key).status === "downloaded").length
);
const cachedPackCount = computed(() =>
  packStore.packs.filter((pack) => Number(packStore.getPackRuntimeState(pack.key).readyCount || 0) > 0).length
);
const hasAnyLocalCache = computed(() => cachedPackCount.value > 0);
const panelEyebrow = computed(() => (props.internalMode ? "内部工具" : "讲堂音频"));
const panelTitle = computed(() => (props.internalMode ? "讲堂缓存管理" : "下载到本机浏览器"));
const panelHint = computed(() => (props.internalMode ? "仅供内部清理与排查" : "讲堂会优先走本地缓存"));

const panelSummary = computed(() => {
  if (props.internalMode) {
    if (!packStore.persistentCacheSupported) {
      return "当前环境不支持持久离线缓存，这里只能查看索引，讲堂语音不会长期保留在本机浏览器里。";
    }

    return `当前共识别 ${packStore.packs.length} 个讲堂音频包，本地已有 ${cachedPackCount.value} 包可直接命中，实际缓存 ${persistentCacheSummary.value.cachedAssetCount} 条语音、约 ${formatPackSize(persistentCacheSummary.value.totalBytes)}。`;
  }

  if (!packStore.persistentCacheSupported) {
    return "当前环境不支持把讲堂语音持久缓存到浏览器本地，进入讲堂时仍会按课在线加载。";
  }

  if (gradePack.value && currentLessonPacks.value.length) {
    return `当前可以下载 ${props.selectedGrade} 整包语音，也能只下载当前小站所在批次。已离线保存 ${downloadedPackCount.value} 包。`;
  }

  if (gradePack.value) {
    return `先下载 ${props.selectedGrade} 的整包语音，后面切到同年级小站时，讲堂会优先直接用本地语音。`;
  }

  if (currentLessonPacks.value.length) {
    return "当前小站已经命中可下载批次，先把这一批语音存到本机浏览器会更稳。";
  }

  return "进入讲堂时会按课准备当前 5 条语音，这里可以额外把更大的音频包长期存到本机浏览器。";
});

async function handleDownloadPack(packKey) {
  try {
    await packStore.downloadPack(packKey);
  } catch {
    // Runtime state already captures the error for the panel UI.
  }

  await refreshPersistentCacheSummary();
}

async function handleDeletePack(packKey) {
  try {
    await packStore.deletePack(packKey);
  } catch {
    // Runtime state already captures the error for the panel UI.
  }

  await refreshPersistentCacheSummary();
}

async function refreshPersistentCacheSummary() {
  if (!props.internalMode) {
    return;
  }

  try {
    const summary = await inspectPersistentStudyNarrationCacheSummary();
    persistentCacheSummary.value = {
      cachedAssetCount: Number(summary.cachedAssetCount || 0),
      totalBytes: Number(summary.totalBytes || 0)
    };
  } catch {
    persistentCacheSummary.value = {
      cachedAssetCount: 0,
      totalBytes: 0
    };
  }
}

async function handleDeleteAllPacks() {
  if (isBulkDeleting.value) {
    return;
  }

  if (!hasAnyLocalCache.value) {
    return;
  }

  isBulkDeleting.value = true;

  try {
    await clearPersistentStudyNarrationCache();
    await packStore.refreshPackRuntimeStates();
    await refreshPersistentCacheSummary();
  } finally {
    isBulkDeleting.value = false;
  }
}

onMounted(() => {
  void packStore.hydratePackIndex().catch(() => {
    // Load errors are surfaced through store state for the panel UI.
  });
  void refreshPersistentCacheSummary();
});
</script>

<template>
  <section class="study-audio-panel" aria-label="讲堂音频包">
    <div class="study-audio-panel__head">
      <div class="study-audio-panel__copy">
        <p class="study-audio-panel__eyebrow">{{ panelEyebrow }}</p>
        <h3 class="study-audio-panel__title">{{ panelTitle }}</h3>
      </div>
      <div class="study-audio-panel__head-actions">
        <span class="study-audio-panel__hint">{{ panelHint }}</span>
        <button
          v-if="internalMode && allowBulkDelete && hasAnyLocalCache"
          class="study-audio-panel__clear"
          type="button"
          :disabled="isBulkDeleting"
          :data-modal-primary="isBulkDeleting ? null : 'true'"
          @click="handleDeleteAllPacks"
        >
          {{ isBulkDeleting ? "清理中" : "一键清理全部缓存" }}
        </button>
      </div>
    </div>

    <p class="study-audio-panel__summary">{{ panelSummary }}</p>

    <div v-if="internalMode && packStore.persistentCacheSupported" class="study-audio-panel__stats" aria-label="缓存概览">
      <article class="study-audio-panel__stat">
        <span class="study-audio-panel__stat-label">已缓存包</span>
        <strong class="study-audio-panel__stat-value">{{ cachedPackCount }}</strong>
      </article>
      <article class="study-audio-panel__stat">
        <span class="study-audio-panel__stat-label">实际语音</span>
        <strong class="study-audio-panel__stat-value">{{ persistentCacheSummary.cachedAssetCount }}</strong>
      </article>
      <article class="study-audio-panel__stat">
        <span class="study-audio-panel__stat-label">预估占用</span>
        <strong class="study-audio-panel__stat-value">{{ formatPackSize(persistentCacheSummary.totalBytes) }}</strong>
      </article>
      <article class="study-audio-panel__stat">
        <span class="study-audio-panel__stat-label">满量包</span>
        <strong class="study-audio-panel__stat-value">{{ downloadedPackCount }}</strong>
      </article>
    </div>

    <p v-if="packStore.loadError" class="study-audio-panel__notice study-audio-panel__notice--warning">
      {{ packStore.loadError }}
    </p>

    <p
      v-else-if="!packStore.persistentCacheSupported"
      class="study-audio-panel__notice study-audio-panel__notice--warning"
    >
      当前浏览器或运行环境不支持持久离线缓存，只能保留当前会话内的临时准备效果。
    </p>

    <div v-else-if="packStore.isLoadingIndex && !visiblePacks.length" class="study-audio-panel__loading">
      正在读取可下载语音包...
    </div>

    <div v-else-if="visiblePacks.length" class="study-audio-panel__grid">
      <article v-for="pack in visiblePacks" :key="pack.key" class="study-audio-pack">
        <div class="study-audio-pack__topline">
          <span class="study-audio-pack__kind">{{ pack.kind === "grade" ? "整年级" : "当前批次" }}</span>
          <span
            :class="[
              'study-audio-pack__status',
              `study-audio-pack__status--${getPackStatusTone(packStore.getPackRuntimeState(pack.key).status)}`
            ]"
          >
            {{ packStore.getPackRuntimeState(pack.key).readyCount || 0 }}/{{ pack.audioClipCount }} 已离线
          </span>
        </div>

        <div class="study-audio-pack__copy">
          <strong class="study-audio-pack__title">{{ pack.label }}</strong>
          <p class="study-audio-pack__text">{{ pack.description }}</p>
        </div>

        <div class="study-audio-pack__meta" aria-label="语音包信息">
          <div class="study-audio-pack__meta-item">
            <span class="study-audio-pack__meta-label">现有语音</span>
            <strong class="study-audio-pack__meta-value">{{ pack.audioClipCount }}/{{ pack.clipCount }}</strong>
          </div>
          <div class="study-audio-pack__meta-item">
            <span class="study-audio-pack__meta-label">预计大小</span>
            <strong class="study-audio-pack__meta-value">{{ formatPackSize(pack.totalBytes) }}</strong>
          </div>
        </div>

        <p class="study-audio-pack__runtime">
          {{ getPackStatusLabel(pack, packStore.getPackRuntimeState(pack.key)) }}
        </p>

        <div class="study-audio-pack__actions">
          <button
            class="study-audio-pack__action"
            type="button"
            :disabled="
              !packStore.persistentCacheSupported ||
              packStore.getPackRuntimeState(pack.key).status === 'downloading' ||
              packStore.getPackRuntimeState(pack.key).status === 'deleting' ||
              pack.audioClipCount <= 0
            "
            @click="handleDownloadPack(pack.key)"
          >
            {{ getDownloadActionLabel(pack, packStore.getPackRuntimeState(pack.key)) }}
          </button>

          <button
            v-if="packStore.getPackRuntimeState(pack.key).readyCount > 0"
            class="study-audio-pack__secondary"
            type="button"
            :disabled="
              packStore.getPackRuntimeState(pack.key).status === 'downloading' ||
              packStore.getPackRuntimeState(pack.key).status === 'deleting'
            "
            @click="handleDeletePack(pack.key)"
          >
            删除本地缓存
          </button>
        </div>
      </article>
    </div>

    <p v-else class="study-audio-panel__empty">
      {{
        internalMode
          ? "当前还没有读取到可管理的讲堂音频包。"
          : "当前筛选下还没有合适的语音包入口，进入讲堂后会按课自动准备这一站的语音。"
      }}
    </p>
  </section>
</template>

<style scoped>
.study-audio-panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 26px;
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.24), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(247, 251, 254, 0.86) 100%);
  box-shadow:
    0 20px 30px -30px rgba(36, 50, 74, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.study-audio-panel__head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.study-audio-panel__head-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.study-audio-panel__copy {
  display: grid;
  gap: 6px;
}

.study-audio-panel__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.study-audio-panel__title {
  margin: 0;
  color: var(--color-ink);
  font-size: 1.08rem;
  line-height: 1.3;
}

.study-audio-panel__hint,
.study-audio-pack__kind,
.study-audio-pack__status {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
}

.study-audio-panel__hint,
.study-audio-pack__kind {
  border: 1px solid rgba(36, 50, 74, 0.08);
  background: rgba(255, 255, 255, 0.84);
  color: var(--color-ink-soft);
}

.study-audio-panel__clear {
  min-height: 34px;
  padding: 6px 12px;
  border: 1.5px solid rgba(87, 125, 167, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink);
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;
}

.study-audio-panel__clear:hover {
  transform: translateY(-1px);
  border-color: rgba(86, 173, 255, 0.44);
  box-shadow: 0 18px 24px -24px rgba(36, 50, 74, 0.34);
}

.study-audio-panel__clear:focus-visible {
  outline: none;
  border-color: rgba(86, 173, 255, 0.72);
  box-shadow: 0 0 0 3px rgba(86, 173, 255, 0.16);
}

.study-audio-panel__clear:disabled {
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
  box-shadow: none;
}

.study-audio-panel__summary,
.study-audio-pack__text,
.study-audio-pack__runtime,
.study-audio-panel__empty,
.study-audio-panel__loading,
.study-audio-panel__notice {
  margin: 0;
  color: rgba(52, 74, 98, 0.92);
  font-size: 0.92rem;
  line-height: 1.6;
}

.study-audio-panel__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.study-audio-panel__stat {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
}

.study-audio-panel__stat-label {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.study-audio-panel__stat-value {
  color: var(--color-ink);
  font-size: 1rem;
}

.study-audio-panel__notice--warning {
  padding: 12px 14px;
  border: 1px solid rgba(255, 188, 96, 0.34);
  border-radius: 18px;
  background: rgba(255, 245, 219, 0.72);
}

.study-audio-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 14px;
}

.study-audio-pack {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 22px;
  background:
    radial-gradient(circle at top left, rgba(173, 235, 255, 0.14), transparent 32%),
    rgba(255, 255, 255, 0.8);
}

.study-audio-pack__topline,
.study-audio-pack__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.study-audio-pack__status--idle {
  background: rgba(219, 234, 254, 0.74);
  color: #264966;
}

.study-audio-pack__status--loading {
  background: rgba(190, 240, 255, 0.76);
  color: #17384b;
}

.study-audio-pack__status--downloaded {
  background: rgba(184, 242, 223, 0.78);
  color: #214539;
}

.study-audio-pack__status--partial {
  background: rgba(255, 231, 156, 0.78);
  color: #5d4a12;
}

.study-audio-pack__status--warning {
  background: rgba(255, 214, 179, 0.84);
  color: #6a3b1f;
}

.study-audio-pack__copy {
  display: grid;
  gap: 8px;
}

.study-audio-pack__title {
  color: var(--color-ink);
  font-size: 1rem;
  line-height: 1.4;
}

.study-audio-pack__meta-item {
  display: grid;
  gap: 4px;
}

.study-audio-pack__meta-label {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.study-audio-pack__meta-value {
  color: var(--color-ink);
  font-size: 0.94rem;
}

.study-audio-pack__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.study-audio-pack__action,
.study-audio-pack__secondary {
  min-height: 42px;
  padding: 9px 14px;
  border-radius: 16px;
  font-weight: 900;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    filter 160ms ease,
    border-color 160ms ease;
}

.study-audio-pack__action {
  border: 1.5px solid rgba(87, 125, 167, 0.14);
  background: linear-gradient(135deg, rgba(124, 216, 184, 0.96), rgba(86, 173, 255, 0.92));
  color: #143044;
}

.study-audio-pack__secondary {
  border: 1.5px solid rgba(87, 125, 167, 0.16);
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink);
}

.study-audio-pack__action:hover,
.study-audio-pack__secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 24px -24px rgba(36, 50, 74, 0.34);
  filter: saturate(1.04);
}

.study-audio-pack__action:focus-visible,
.study-audio-pack__secondary:focus-visible {
  outline: none;
  box-shadow:
    0 18px 24px -24px rgba(36, 50, 74, 0.34),
    0 0 0 3px rgba(86, 173, 255, 0.16);
}

.study-audio-pack__action:disabled,
.study-audio-pack__secondary:disabled {
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
  box-shadow: none;
  filter: none;
}

@media (max-width: 720px) {
  .study-audio-panel {
    padding: 16px;
  }

  .study-audio-panel__head,
  .study-audio-panel__head-actions,
  .study-audio-pack__topline,
  .study-audio-pack__meta,
  .study-audio-pack__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .study-audio-pack__action,
  .study-audio-pack__secondary {
    width: 100%;
  }
}
</style>
