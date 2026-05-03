<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { fetchHealthStatus, fetchQuestionStats } from "../../services/questionsApi";
import { useAudioStore } from "../../stores/useAudioStore";
import { APP_META } from "../../constants/appMeta";

const audioStore = useAudioStore();
audioStore.hydratePreferences();

const isRefreshing = ref(false);
const serviceHealthStatus = ref("idle");
const serviceHealthMessage = ref("等待读取当前运行状态。");
const serviceCheckedAt = ref("");
const questionBankStatus = ref("idle");
const questionBankMessage = ref("等待读取当前题库信息。");
const totalQuestionCount = ref(null);
const storageAvailable = ref(checkStorageAvailability());
const networkOnline = ref(typeof navigator !== "undefined" ? navigator.onLine !== false : true);

let statusController = null;

const releaseSummary = computed(() => formatDateLabel(APP_META.releasedAt));
const buildModeLabel = computed(() => (import.meta.env.PROD ? "production" : import.meta.env.MODE || "development"));
const backendStatusLabel = computed(() => {
  if (serviceHealthStatus.value === "loading") {
    return "检测中";
  }

  if (serviceHealthStatus.value === "online") {
    return "在线";
  }

  if (serviceHealthStatus.value === "error") {
    return "未连接";
  }

  return "未检测";
});
const backendStatusTone = computed(() => {
  if (serviceHealthStatus.value === "online") {
    return "success";
  }

  if (serviceHealthStatus.value === "error") {
    return "error";
  }

  if (serviceHealthStatus.value === "loading") {
    return "info";
  }

  return "neutral";
});
const questionBankLabel = computed(() =>
  typeof totalQuestionCount.value === "number" ? `${totalQuestionCount.value} 题` : questionBankStatus.value === "loading" ? "读取中" : "暂未读取"
);
const questionBankTone = computed(() => {
  if (typeof totalQuestionCount.value === "number") {
    return "neutral";
  }

  if (questionBankStatus.value === "error") {
    return "warning";
  }

  if (questionBankStatus.value === "loading") {
    return "info";
  }

  return "info";
});
const localCapabilitySummary = computed(() => {
  const parts = [];

  parts.push(audioStore.isSupported ? "音频可用" : "音频受限");
  parts.push(storageAvailable.value ? "本机存储正常" : "本机存储不可写");
  parts.push(networkOnline.value ? "当前联网" : "当前离线");

  return parts.join(" · ");
});
const statusCards = computed(() => [
  {
    key: "release",
    label: "当前版本",
    value: APP_META.releaseTag,
    note: `${APP_META.releaseLabel} · ${releaseSummary.value}`,
    tone: "accent"
  },
  {
    key: "backend",
    label: "后端接口",
    value: backendStatusLabel.value,
    note: serviceHealthMessage.value,
    tone: backendStatusTone.value
  },
  {
    key: "question-bank",
    label: "题库状态",
    value: questionBankLabel.value,
    note: typeof totalQuestionCount.value === "number" ? "已从当前 API 读取题量。" : questionBankMessage.value,
    tone: questionBankTone.value
  },
  {
    key: "device",
    label: "本机能力",
    value: audioStore.isSupported ? "可以播音" : "音频受限",
    note: localCapabilitySummary.value,
    tone: storageAvailable.value ? "neutral" : "warning"
  }
]);
const stackGroups = computed(() => [
  {
    title: "前端",
    items: ["Vue 3", "Vite 8", "Pinia", "原生 Fetch"]
  },
  {
    title: "后端",
    items: ["Node.js 24", "Express 5", "SQLite", "OpenAI SDK"]
  },
  {
    title: "运行方式",
    items: [APP_META.dataModeLabel, "同源 /api 通信", `构建模式 ${buildModeLabel.value}`]
  }
]);
const timelineItems = computed(() =>
  APP_META.changelog.map((entry) => ({
    ...entry,
    dateLabel: formatDateLabel(entry.date)
  }))
);
const checkedAtLabel = computed(() => formatTimeLabel(serviceCheckedAt.value));

function checkStorageAvailability() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const probeKey = "__wonder-trivia-island-storage-probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function formatDateLabel(value = "") {
  if (!value) {
    return "待补充";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).format(date);
}

function formatTimeLabel(value = "") {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

async function refreshSystemStatus() {
  statusController?.abort();
  statusController = new AbortController();
  isRefreshing.value = true;
  serviceHealthStatus.value = "loading";
  serviceHealthMessage.value = "正在读取后端健康状态和题库信息。";
  questionBankStatus.value = "loading";
  questionBankMessage.value = "正在读取当前题库总量。";
  storageAvailable.value = checkStorageAvailability();
  networkOnline.value = typeof navigator !== "undefined" ? navigator.onLine !== false : true;

  try {
    const [healthResult, statsResult] = await Promise.allSettled([
      fetchHealthStatus(statusController.signal),
      fetchQuestionStats(statusController.signal)
    ]);

    serviceCheckedAt.value = new Date().toISOString();

    if (healthResult.status === "fulfilled") {
      serviceHealthStatus.value = "online";
      serviceHealthMessage.value = healthResult.value.message || "接口响应正常。";
    } else {
      serviceHealthStatus.value = "error";
      serviceHealthMessage.value = healthResult.reason?.message || "暂时无法读取后端健康状态。";
    }

    if (statsResult.status === "fulfilled") {
      questionBankStatus.value = "online";
      questionBankMessage.value = "题库统计读取成功。";
      totalQuestionCount.value = typeof statsResult.value.total === "number" ? statsResult.value.total : null;
    } else {
      questionBankStatus.value = "error";
      questionBankMessage.value = statsResult.reason?.message || "暂时无法读取当前题库信息。";
      totalQuestionCount.value = null;
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }

    serviceHealthStatus.value = "error";
    serviceHealthMessage.value = error?.message || "暂时无法读取当前运行状态。";
    questionBankStatus.value = "error";
    questionBankMessage.value = "这次系统状态刷新没有成功完成。";
    serviceCheckedAt.value = new Date().toISOString();
    totalQuestionCount.value = null;
  } finally {
    isRefreshing.value = false;
    statusController = null;
  }
}

function handleOnlineStatusChange() {
  networkOnline.value = typeof navigator !== "undefined" ? navigator.onLine !== false : true;
}

onMounted(() => {
  refreshSystemStatus();

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnlineStatusChange);
    window.addEventListener("offline", handleOnlineStatusChange);
  }
});

onBeforeUnmount(() => {
  statusController?.abort();

  if (typeof window !== "undefined") {
    window.removeEventListener("online", handleOnlineStatusChange);
    window.removeEventListener("offline", handleOnlineStatusChange);
  }
});
</script>

<template>
  <section id="settings-about" class="settings-card settings-card--stage settings-section-anchor settings-about">
    <div class="settings-card__head">
      <div>
        <p class="settings-card__eyebrow">About & Release</p>
        <h4 class="settings-card__title" tabindex="-1" data-settings-section-focus>关于与版本</h4>
      </div>
      <div class="settings-card__meta-group">
        <span class="settings-card__meta">{{ APP_META.releaseTag }}</span>
        <span class="settings-card__meta">{{ APP_META.releaseLabel }}</span>
      </div>
    </div>

    <section class="settings-about__hero">
      <div class="settings-about__hero-copy">
        <p class="settings-about__hero-eyebrow">Current Build</p>
        <h5 class="settings-about__hero-title">{{ APP_META.productName }} {{ APP_META.releaseTag }}</h5>
        <p class="settings-about__hero-text">
          这里集中查看当前版本、接口连通、本机能力和版本更新记录，不额外占首页一级导航。
        </p>
      </div>

      <div class="settings-about__hero-meta" aria-label="当前版本摘要">
        <span class="settings-about__hero-pill">{{ APP_META.releaseLabel }}</span>
        <span class="settings-about__hero-pill">{{ releaseSummary }}</span>
        <span class="settings-about__hero-pill">构建 {{ buildModeLabel }}</span>
      </div>

      <div class="settings-about__hero-actions">
        <button class="btn-cartoon btn-cartoon--mint" type="button" :disabled="isRefreshing" @click="refreshSystemStatus">
          {{ isRefreshing ? "刷新中..." : "刷新系统状态" }}
        </button>
        <a class="settings-about__link" :href="APP_META.releaseUrl" target="_blank" rel="noreferrer">查看 Release</a>
        <a class="settings-about__link" :href="APP_META.repositoryUrl" target="_blank" rel="noreferrer">查看仓库</a>
      </div>
    </section>

    <div class="settings-about__layout">
      <section class="settings-about__panel">
        <div class="settings-about__panel-head">
          <div>
            <p class="settings-about__panel-eyebrow">System Status</p>
            <h5 class="settings-about__panel-title">当前系统情况</h5>
          </div>
          <span class="settings-about__panel-meta">{{ checkedAtLabel || "刚进入页面" }}</span>
        </div>

        <div class="settings-about__status-grid">
          <article
            v-for="card in statusCards"
            :key="card.key"
            :class="['settings-about__status-card', `settings-about__status-card--${card.tone}`]"
          >
            <span class="settings-about__status-label">{{ card.label }}</span>
            <strong class="settings-about__status-value">{{ card.value }}</strong>
            <p class="settings-about__status-note">{{ card.note }}</p>
          </article>
        </div>

        <div class="settings-about__stack-grid">
          <article v-for="group in stackGroups" :key="group.title" class="settings-about__stack-card">
            <div class="settings-about__stack-head">
              <span class="settings-about__stack-title">{{ group.title }}</span>
            </div>
            <div class="settings-about__stack-tags">
              <span v-for="item in group.items" :key="item" class="settings-about__stack-tag">{{ item }}</span>
            </div>
          </article>
        </div>

        <article class="settings-about__architecture">
          <span class="settings-about__architecture-label">当前架构</span>
          <strong class="settings-about__architecture-value">{{ APP_META.architectureSummary }}</strong>
          <p class="settings-about__architecture-note">这部分只描述当前运行实例和当前设备，不会写入备份。</p>
        </article>
      </section>

      <section class="settings-about__panel settings-about__panel--timeline">
        <div class="settings-about__panel-head">
          <div>
            <p class="settings-about__panel-eyebrow">Changelog</p>
            <h5 class="settings-about__panel-title">版本更新记录</h5>
          </div>
          <span class="settings-about__panel-meta">{{ timelineItems.length }} 条</span>
        </div>

        <div class="settings-about__timeline">
          <article v-for="item in timelineItems" :key="item.version" class="settings-about__timeline-item">
            <div class="settings-about__timeline-topline">
              <div>
                <strong class="settings-about__timeline-version">{{ item.tag }}</strong>
                <p class="settings-about__timeline-title">{{ item.title }}</p>
              </div>
              <span class="settings-about__timeline-badge">{{ item.channel }}</span>
            </div>

            <p class="settings-about__timeline-meta">{{ item.dateLabel }}</p>
            <p class="settings-about__timeline-summary">{{ item.summary }}</p>

            <ul class="settings-about__timeline-list">
              <li v-for="highlight in item.highlights" :key="highlight">{{ highlight }}</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.settings-about {
  gap: 18px;
}

.settings-about__hero,
.settings-about__panel,
.settings-about__architecture,
.settings-about__status-card,
.settings-about__stack-card,
.settings-about__timeline-item {
  border: 1px solid rgba(36, 50, 74, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.68),
    0 16px 26px -30px rgba(36, 50, 74, 0.28);
}

.settings-about__hero {
  display: grid;
  gap: 14px;
  padding: 20px 22px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(168, 222, 255, 0.18) 0%, rgba(168, 222, 255, 0) 34%),
    linear-gradient(180deg, rgba(250, 253, 255, 0.96) 0%, rgba(245, 249, 253, 0.92) 100%);
}

.settings-about__hero-copy,
.settings-about__panel-head,
.settings-about__stack-head {
  display: grid;
  gap: 6px;
}

.settings-about__hero-eyebrow,
.settings-about__panel-eyebrow,
.settings-about__status-label {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-about__hero-title,
.settings-about__panel-title {
  margin: 0;
  color: var(--color-ink, #24324a);
  line-height: 1.2;
}

.settings-about__hero-title {
  font-size: 1.34rem;
}

.settings-about__panel-title {
  font-size: 1.02rem;
}

.settings-about__hero-text,
.settings-about__status-note,
.settings-about__architecture-note,
.settings-about__timeline-summary,
.settings-about__timeline-list {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  line-height: 1.6;
}

.settings-about__hero-meta,
.settings-about__hero-actions,
.settings-about__stack-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.settings-about__hero-pill,
.settings-about__stack-tag,
.settings-about__timeline-badge,
.settings-about__link {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 6px 12px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink, #24324a);
  font-size: 0.84rem;
  font-weight: 700;
  text-decoration: none;
}

.settings-about__link {
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.settings-about__link:hover,
.settings-about__link:focus-visible {
  border-color: rgba(124, 216, 184, 0.36);
  background: rgba(244, 252, 248, 0.96);
  outline: none;
  transform: translateY(-1px);
}

.settings-about__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
  gap: 16px;
  align-items: start;
}

.settings-about__panel {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(252, 254, 255, 0.96) 0%, rgba(247, 251, 254, 0.92) 100%);
}

.settings-about__panel--timeline {
  background:
    radial-gradient(circle at top right, rgba(255, 214, 130, 0.14) 0%, rgba(255, 214, 130, 0) 28%),
    linear-gradient(180deg, rgba(255, 253, 248, 0.96) 0%, rgba(248, 251, 254, 0.92) 100%);
}

.settings-about__panel-meta,
.settings-about__timeline-meta,
.settings-about__architecture-label,
.settings-about__stack-title {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.82rem;
  font-weight: 700;
}

.settings-about__status-grid,
.settings-about__stack-grid {
  display: grid;
  gap: 12px;
}

.settings-about__status-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.settings-about__status-card,
.settings-about__stack-card,
.settings-about__architecture,
.settings-about__timeline-item {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.86);
}

.settings-about__status-card--accent {
  border-color: rgba(142, 194, 255, 0.3);
  background: linear-gradient(180deg, rgba(241, 248, 255, 0.98) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.settings-about__status-card--success {
  border-color: rgba(124, 216, 184, 0.28);
  background: linear-gradient(180deg, rgba(243, 253, 248, 0.98) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.settings-about__status-card--warning {
  border-color: rgba(255, 186, 82, 0.22);
  background: linear-gradient(180deg, rgba(255, 251, 241, 0.98) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.settings-about__status-card--error {
  border-color: rgba(219, 94, 122, 0.18);
  background: linear-gradient(180deg, rgba(255, 244, 247, 0.98) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.settings-about__status-card--info {
  border-color: rgba(148, 182, 255, 0.18);
  background: linear-gradient(180deg, rgba(246, 249, 255, 0.98) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.settings-about__status-value,
.settings-about__architecture-value,
.settings-about__timeline-version {
  color: var(--color-ink, #24324a);
  font-weight: 800;
}

.settings-about__status-value {
  font-size: 1.02rem;
  line-height: 1.3;
}

.settings-about__architecture-value {
  font-size: 1rem;
  line-height: 1.5;
}

.settings-about__stack-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.settings-about__timeline {
  display: grid;
  gap: 12px;
}

.settings-about__timeline-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.settings-about__timeline-title {
  margin: 4px 0 0;
  color: var(--color-ink, #24324a);
  font-size: 0.98rem;
  line-height: 1.35;
}

.settings-about__timeline-badge {
  min-height: 28px;
  padding: 4px 10px;
  border-color: rgba(255, 186, 82, 0.24);
  background: rgba(255, 248, 230, 0.92);
  color: #9b641d;
  font-size: 0.76rem;
  font-weight: 800;
}

.settings-about__timeline-list {
  padding-left: 18px;
  font-size: 0.88rem;
}

.settings-about__timeline-list li + li {
  margin-top: 6px;
}

@media (max-width: 1080px) {
  .settings-about__layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 840px) {
  .settings-about__status-grid,
  .settings-about__stack-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .settings-about__timeline-topline {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
