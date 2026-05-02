<script setup>
import { computed, onBeforeUnmount, ref } from "vue";

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  correctCount: {
    type: Number,
    required: true
  },
  wrongCount: {
    type: Number,
    required: true
  },
  accuracyPercent: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  playMode: {
    type: String,
    default: "free"
  },
  challengeReady: {
    type: Boolean,
    default: true
  },
  isPassed: {
    type: Boolean,
    default: false
  },
  starCount: {
    type: Number,
    default: 0
  },
  stageTitle: {
    type: String,
    default: ""
  },
  nextStageTitle: {
    type: String,
    default: ""
  },
  unlockedNextStage: {
    type: Boolean,
    default: false
  },
  challengeOutcome: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(["replay", "next-stage"]);
const copyState = ref("idle");
let copyResetTimerId = 0;
const isChallengeMode = computed(() => props.playMode === "challenge");
const passportTitle = computed(() => {
  if (isChallengeMode.value) {
    if (!props.challengeReady) {
      return "成绩整理中";
    }

    if (props.starCount >= 3) {
      return "满星通关";
    }

    if (props.isPassed) {
      return "成功过关";
    }

    return "继续挑战";
  }

  if (props.accuracyPercent >= 100) {
    return "满星岛民";
  }

  if (props.accuracyPercent >= 67) {
    return "通关勇者";
  }

  return "继续探险";
});
const passportLabel = computed(() => {
  if (!isChallengeMode.value) {
    return "知识岛通关卡";
  }

  return props.stageTitle ? `${props.stageTitle} 结算卡` : "挑战结算卡";
});
const challengeStatusText = computed(() => {
  if (!isChallengeMode.value) {
    return "";
  }

  if (!props.challengeReady) {
    return "正在计算关卡成绩";
  }

  return props.isPassed ? `获得 ${props.starCount} 星` : "本关未过关";
});
const challengeStatusNote = computed(() => {
  if (!isChallengeMode.value) {
    return "";
  }

  if (!props.challengeReady) {
    return "咕咕老师正在整理这关的成绩。";
  }

  if (!props.isPassed) {
    return "回看解析后再试一轮，会更稳。";
  }

  if (!props.nextStageTitle) {
    return "整条挑战路线已经全部完成。";
  }

  return props.unlockedNextStage ? `已解锁下一关 ${props.nextStageTitle}` : `下一关 ${props.nextStageTitle}`;
});
const challengeStars = computed(() =>
  Array.from({ length: 3 }, (_, index) => ({
    id: index + 1,
    filled: props.challengeReady && index < props.starCount
  }))
);
const challengeStarSummary = computed(() => {
  if (!isChallengeMode.value) {
    return "";
  }

  if (!props.challengeReady) {
    return "正在结算星级";
  }

  if (!props.isPassed) {
    return "再次挑战可点亮星星";
  }

  return `本关获得 ${props.starCount} / 3 星`;
});
const showCelebration = computed(() => isChallengeMode.value && props.challengeReady && props.isPassed);
const celebrationBursts = Object.freeze([
  { id: "burst-1", symbol: "✦", className: "result-score-card__burst--1" },
  { id: "burst-2", symbol: "★", className: "result-score-card__burst--2" },
  { id: "burst-3", symbol: "✦", className: "result-score-card__burst--3" },
  { id: "burst-4", symbol: "★", className: "result-score-card__burst--4" },
  { id: "burst-5", symbol: "✦", className: "result-score-card__burst--5" },
  { id: "burst-6", symbol: "★", className: "result-score-card__burst--6" }
]);
const unlockCalloutText = computed(() => {
  if (!isChallengeMode.value || !props.challengeReady || !props.isPassed || !props.nextStageTitle) {
    return "";
  }

  return props.unlockedNextStage ? `${props.nextStageTitle} 已解锁` : `下一关：${props.nextStageTitle}`;
});
const challengeMissionLabel = computed(() => props.challengeOutcome?.missionLabel || "");
const challengeMissionStatus = computed(() => {
  if (!isChallengeMode.value || !props.challengeReady || !challengeMissionLabel.value) {
    return "";
  }

  if (props.challengeOutcome?.missionCompleted) {
    return "任务已完成";
  }

  return props.challengeOutcome?.missionProgressText || challengeMissionLabel.value;
});
const challengeRewardStatus = computed(() => {
  if (!isChallengeMode.value || !props.challengeReady || !props.challengeOutcome?.rewardName) {
    return "";
  }

  if (props.challengeOutcome.rewardUnlocked) {
    return `已收下 ${props.challengeOutcome.rewardGlyph} ${props.challengeOutcome.rewardName}`;
  }

  if (props.challengeOutcome.rewardAlreadyOwned) {
    return `${props.challengeOutcome.rewardGlyph} ${props.challengeOutcome.rewardName} 已在航海册`;
  }

  if (props.challengeOutcome.missionCompleted && !props.isPassed) {
    return "目标达成了，再过关就能收下收藏";
  }

  return `还差：${props.challengeOutcome.missionProgressText || props.challengeOutcome.missionLabel}`;
});
const newAchievements = computed(() =>
  Array.isArray(props.challengeOutcome?.newAchievements) ? props.challengeOutcome.newAchievements : []
);
const footerCaption = computed(() => {
  if (!isChallengeMode.value) {
    return `本轮共完成 ${props.totalQuestions} 题。`;
  }

  if (!props.stageTitle) {
    return props.challengeReady ? "本轮挑战成绩已经生成。" : "挑战成绩正在整理。";
  }

  if (!props.challengeReady) {
    return "正在整理关卡成绩。";
  }

  if (!props.isPassed) {
    return `${props.stageTitle} 还没通过。`;
  }

  if (!props.nextStageTitle) {
    return `${props.stageTitle} 已完成，整条挑战路线已经通关。`;
  }

  return props.unlockedNextStage
    ? `${props.stageTitle} 已通关，${props.nextStageTitle} 已解锁。`
    : `${props.stageTitle} 已通关，可以继续挑战 ${props.nextStageTitle}。`;
});
const replayLabel = computed(() => (isChallengeMode.value ? "重玩本关" : "再玩一次"));
const showNextStageAction = computed(
  () => isChallengeMode.value && props.challengeReady && props.isPassed && Boolean(props.nextStageTitle)
);
const nextStageButtonLabel = computed(() => {
  if (!showNextStageAction.value) {
    return "";
  }

  return `前往 ${props.nextStageTitle}`;
});
const journeyActionLabel = computed(() => (isChallengeMode.value ? "关卡操作" : "继续练习"));
const isCopyPending = computed(() => copyState.value === "pending");
const copyButtonLabel = computed(() => {
  if (copyState.value === "pending") {
    return "复制中";
  }

  if (copyState.value === "copied") {
    return "已复制";
  }

  if (copyState.value === "unsupported") {
    return "复制不可用";
  }

  if (copyState.value === "failed") {
    return "重试复制";
  }

  return "复制成绩卡";
});
const copyStatusText = computed(() => {
  if (copyState.value === "pending") {
    return "正在复制成绩卡文本。";
  }

  if (copyState.value === "copied") {
    return "成绩卡文本已复制，可直接粘贴分享。";
  }

  if (copyState.value === "failed") {
    return "复制失败，请检查浏览器权限后重试。";
  }

  if (copyState.value === "unsupported") {
    return "当前环境不支持自动复制，请手动选择文本分享。";
  }

  return "可复制为文本成绩卡，适合直接粘贴分享。";
});

const shareText = computed(() => {
  const lines = [
    "奇妙知识岛 Wonder Trivia Island",
    `${props.title}`,
    `总得分：${props.score} 分`,
    `答对：${props.correctCount} 题 / 答错：${props.wrongCount} 题`,
    `正确率：${props.accuracyPercent}%`,
    `总题数：${props.totalQuestions} 题`,
    props.summary
  ];

  if (isChallengeMode.value) {
    if (props.stageTitle) {
      lines.splice(2, 0, `挑战关卡：${props.stageTitle}`);
    }

    lines.push(
      `关卡结果：${
        !props.challengeReady ? "结算中" : props.isPassed ? `${props.starCount} 星过关` : "未过关"
      }`
    );

    if (props.nextStageTitle && props.isPassed) {
      lines.push(`下一关：${props.nextStageTitle}`);
    }

    if (props.challengeOutcome?.rewardName) {
      lines.push(`航海收藏：${props.challengeOutcome.rewardName}`);
    }

    if (newAchievements.value.length > 0) {
      lines.push(`新成就：${newAchievements.value.map((achievement) => achievement.name).join("、")}`);
    }
  }

  return lines.join("\n");
});

function clearCopyResetTimer() {
  if (!copyResetTimerId) {
    return;
  }

  window.clearTimeout(copyResetTimerId);
  copyResetTimerId = 0;
}

function scheduleCopyReset() {
  clearCopyResetTimer();
  copyResetTimerId = window.setTimeout(() => {
    copyState.value = "idle";
    copyResetTimerId = 0;
  }, 1600);
}

function fallbackCopyText(text) {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") {
    return "unsupported";
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand("copy") ? "success" : "failed";
  } catch {
    return "failed";
  } finally {
    document.body.removeChild(textarea);
  }
}

async function writeShareText(text) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return "success";
    } catch {
      return fallbackCopyText(text);
    }
  }

  return fallbackCopyText(text);
}

async function copySummary() {
  if (isCopyPending.value) {
    return;
  }

  clearCopyResetTimer();
  copyState.value = "pending";

  const copyResult = await writeShareText(shareText.value);

  if (copyResult === "success") {
    copyState.value = "copied";
    scheduleCopyReset();
    return;
  }

  copyState.value = copyResult === "unsupported" ? "unsupported" : "failed";
}

onBeforeUnmount(() => {
  clearCopyResetTimer();
});
</script>

<template>
  <section class="result-score-card">
    <div class="result-score-card__decor" aria-hidden="true">
      <span class="result-score-card__spark result-score-card__spark--1">✦</span>
      <span class="result-score-card__spark result-score-card__spark--2">✦</span>
      <span class="result-score-card__leaf result-score-card__leaf--1"></span>
      <span class="result-score-card__leaf result-score-card__leaf--2"></span>
      <div v-if="showCelebration" class="result-score-card__celebration">
        <span
          v-for="burst in celebrationBursts"
          :key="burst.id"
          :class="['result-score-card__burst', burst.className]"
        >
          {{ burst.symbol }}
        </span>
      </div>
    </div>

    <div class="result-score-card__hero">
      <div class="result-score-card__header">
        <span class="result-score-card__brand">Wonder Trivia Island</span>
        <p class="result-score-card__passport">{{ passportLabel }}</p>
        <h3 class="result-score-card__title">{{ title }}</h3>
        <p class="result-score-card__summary">{{ summary }}</p>
      </div>

      <div class="result-score-card__seal" aria-label="本轮正确率">
        <span class="result-score-card__seal-label">正确率</span>
        <strong class="result-score-card__seal-value">{{ accuracyPercent }}%</strong>
        <span class="result-score-card__seal-caption">{{ passportTitle }}</span>
      </div>
    </div>

    <div
      v-if="isChallengeMode"
      :class="[
        'result-score-card__challenge-banner',
        { 'result-score-card__challenge-banner--passed': isPassed, 'result-score-card__challenge-banner--retry': !isPassed }
      ]"
    >
      <div class="result-score-card__challenge-head">
        <div class="result-score-card__challenge-copy">
          <div class="result-score-card__challenge-topline">
            <span class="result-score-card__challenge-chip">{{ stageTitle || "挑战关卡" }}</span>
            <p
              v-if="unlockCalloutText"
              :class="[
                'result-score-card__unlock-callout',
                { 'result-score-card__unlock-callout--fresh': unlockedNextStage }
              ]"
            >
              {{ unlockCalloutText }}
            </p>
          </div>
          <strong class="result-score-card__challenge-value">{{ challengeStatusText }}</strong>
          <span class="result-score-card__challenge-note">{{ challengeStatusNote }}</span>
        </div>

        <div class="result-score-card__challenge-progress">
          <span class="result-score-card__challenge-progress-label">关卡星级</span>
          <div class="result-score-card__star-strip" aria-label="关卡星级">
            <span
              v-for="star in challengeStars"
              :key="star.id"
              :class="['result-score-card__star', { 'result-score-card__star--filled': star.filled }]"
            >
              {{ star.filled ? "★" : "☆" }}
            </span>
          </div>
          <span class="result-score-card__star-summary">{{ challengeStarSummary }}</span>
        </div>
      </div>

      <div
        v-if="challengeMissionLabel || challengeRewardStatus || newAchievements.length > 0"
        class="result-score-card__challenge-collection"
        aria-label="关卡任务与收藏"
      >
        <div v-if="challengeMissionLabel" class="result-score-card__challenge-collection-item">
          <span class="result-score-card__challenge-collection-label">本关目标</span>
          <strong class="result-score-card__challenge-collection-value">{{ challengeMissionLabel }}</strong>
          <span class="result-score-card__challenge-collection-note">{{ challengeMissionStatus }}</span>
        </div>
        <div v-if="challengeRewardStatus" class="result-score-card__challenge-collection-item">
          <span class="result-score-card__challenge-collection-label">航海收藏</span>
          <strong class="result-score-card__challenge-collection-value">
            {{ challengeOutcome?.rewardGlyph }} {{ challengeOutcome?.rewardName }}
          </strong>
          <span class="result-score-card__challenge-collection-note">{{ challengeRewardStatus }}</span>
        </div>
        <div v-if="newAchievements.length > 0" class="result-score-card__challenge-collection-item">
          <span class="result-score-card__challenge-collection-label">本次成就</span>
          <strong class="result-score-card__challenge-collection-value">
            {{ newAchievements.map((achievement) => `${achievement.glyph} ${achievement.name}`).join(" · ") }}
          </strong>
          <span class="result-score-card__challenge-collection-note">这次新点亮了 {{ newAchievements.length }} 项章节成就。</span>
        </div>
      </div>
    </div>

    <div class="result-score-card__grid">
      <div class="result-score-card__item result-score-card__item--primary">
        <span class="result-score-card__label">总得分</span>
        <strong class="result-score-card__value">{{ score }} 分</strong>
      </div>
      <div class="result-score-card__item">
        <span class="result-score-card__label">答对题数</span>
        <strong class="result-score-card__value">{{ correctCount }} 题</strong>
      </div>
      <div class="result-score-card__item">
        <span class="result-score-card__label">答错题数</span>
        <strong class="result-score-card__value">{{ wrongCount }} 题</strong>
      </div>
      <div class="result-score-card__item">
        <span class="result-score-card__label">正确率</span>
        <strong class="result-score-card__value">{{ accuracyPercent }}%</strong>
      </div>
    </div>

    <div class="result-score-card__footer">
      <div class="result-score-card__footer-copy">
        <p class="result-score-card__caption">{{ footerCaption }}</p>
        <p
          :class="['result-score-card__copy-note', `result-score-card__copy-note--${copyState}`]"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {{ copyStatusText }}
        </p>
      </div>

      <div class="result-score-card__footer-actions">
        <div class="result-score-card__action-cluster">
          <span class="result-score-card__action-label">分享成绩</span>
          <div class="result-score-card__utility-actions">
            <button
              class="btn-cartoon result-score-card__action-button"
              type="button"
              :disabled="isCopyPending"
              @click="copySummary"
            >
              {{ copyButtonLabel }}
            </button>
          </div>
        </div>

        <div class="result-score-card__action-cluster result-score-card__action-cluster--journey">
          <span class="result-score-card__action-label">{{ journeyActionLabel }}</span>
          <div class="result-score-card__journey-actions">
            <button
              class="btn-cartoon btn-cartoon--yellow result-score-card__action-button"
              type="button"
              @click="emit('replay')"
            >
              {{ replayLabel }}
            </button>
            <button
              v-if="showNextStageAction"
              class="btn-cartoon btn-cartoon--mint result-score-card__action-button"
              type="button"
              @click="emit('next-stage')"
            >
              {{ nextStageButtonLabel }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.result-score-card {
  position: relative;
  overflow: hidden;
  padding: 24px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.28) 0%, rgba(255, 231, 156, 0) 24%),
    radial-gradient(circle at bottom left, rgba(184, 242, 223, 0.24) 0%, rgba(184, 242, 223, 0) 28%),
    linear-gradient(180deg, rgba(251, 254, 255, 0.97) 0%, rgba(244, 249, 252, 0.92) 100%);
  box-shadow: 0 26px 40px -32px rgba(36, 50, 74, 0.38);
  text-align: left;
}

.result-score-card__decor,
.result-score-card__hero,
.result-score-card__challenge-banner,
.result-score-card__grid,
.result-score-card__footer {
  position: relative;
  z-index: 1;
}

.result-score-card__decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.result-score-card__spark,
.result-score-card__leaf {
  position: absolute;
}

.result-score-card__spark {
  color: rgba(255, 184, 42, 0.58);
  line-height: 1;
}

.result-score-card__spark--1 {
  top: 22px;
  right: 28px;
  font-size: 1rem;
}

.result-score-card__spark--2 {
  left: 16px;
  bottom: 112px;
  font-size: 0.88rem;
}

.result-score-card__celebration {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.result-score-card__burst {
  position: absolute;
  color: rgba(255, 184, 42, 0.72);
  line-height: 1;
  animation: result-score-card-burst-float 1.6s ease-out both;
}

.result-score-card__burst--1 {
  top: 18px;
  left: 20px;
  font-size: 0.94rem;
}

.result-score-card__burst--2 {
  top: 52px;
  right: 44px;
  font-size: 1.1rem;
  animation-delay: 90ms;
}

.result-score-card__burst--3 {
  top: 110px;
  left: 12%;
  font-size: 0.82rem;
  animation-delay: 180ms;
}

.result-score-card__burst--4 {
  right: 16%;
  bottom: 132px;
  font-size: 0.94rem;
  animation-delay: 260ms;
}

.result-score-card__burst--5 {
  left: 24%;
  bottom: 48px;
  font-size: 0.88rem;
  animation-delay: 340ms;
}

.result-score-card__burst--6 {
  right: 22px;
  bottom: 28px;
  font-size: 0.98rem;
  animation-delay: 420ms;
}

.result-score-card__leaf {
  width: 28px;
  height: 12px;
  border-radius: 88% 12% 78% 22%;
  background: linear-gradient(135deg, rgba(124, 216, 184, 0.74) 0%, rgba(184, 242, 223, 0.46) 100%);
  opacity: 0.6;
}

.result-score-card__leaf--1 {
  top: 66px;
  right: 108px;
  transform: rotate(-28deg);
}

.result-score-card__leaf--2 {
  left: 28px;
  bottom: 54px;
  transform: rotate(18deg);
}

.result-score-card__hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 18px;
  align-items: start;
}

.result-score-card__header {
  min-width: 0;
}

.result-score-card__brand,
.result-score-card__challenge-chip,
.result-score-card__unlock-callout {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 34px;
  padding: 6px 12px;
  border: 1px solid rgba(36, 50, 74, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink, #24324a);
  font-size: 0.84rem;
}

.result-score-card__brand {
  background: rgba(255, 231, 238, 0.86);
}

.result-score-card__passport {
  margin: 12px 0 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.result-score-card__title {
  margin: 8px 0 10px;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: clamp(1.7rem, 3vw, 2.45rem);
  line-height: 1.08;
  color: var(--color-ink, #24324a);
}

.result-score-card__summary,
.result-score-card__caption {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.98rem;
  line-height: 1.55;
}

.result-score-card__seal {
  display: grid;
  align-content: center;
  justify-items: center;
  min-height: 132px;
  padding: 16px 12px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 249, 225, 0.96) 0%, rgba(255, 255, 255, 0.94) 100%);
  text-align: center;
}

.result-score-card__seal-label,
.result-score-card__seal-caption {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.8rem;
}

.result-score-card__seal-value {
  margin: 6px 0;
  color: var(--color-ink, #24324a);
  font-size: 2rem;
  line-height: 1;
}

.result-score-card__challenge-banner {
  display: grid;
  gap: 14px;
  margin-top: 20px;
  padding: 16px 18px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.86);
}

.result-score-card__challenge-banner--passed {
  background: linear-gradient(180deg, rgba(242, 253, 249, 0.96) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.result-score-card__challenge-banner--retry {
  background: linear-gradient(180deg, rgba(255, 241, 245, 0.96) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.result-score-card__challenge-chip {
  background: rgba(248, 251, 253, 0.96);
}

.result-score-card__challenge-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
}

.result-score-card__challenge-copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.result-score-card__challenge-topline {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.result-score-card__challenge-value {
  color: var(--color-ink, #24324a);
  font-size: 1.16rem;
  line-height: 1.24;
}

.result-score-card__challenge-note {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.94rem;
  line-height: 1.5;
}

.result-score-card__star-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.result-score-card__challenge-progress {
  display: grid;
  gap: 8px;
  justify-items: end;
  min-width: 160px;
}

.result-score-card__challenge-progress-label {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.result-score-card__star {
  color: rgba(91, 105, 132, 0.42);
  font-size: 1.45rem;
  line-height: 1;
  transform: translateY(0) scale(1);
}

.result-score-card__star--filled {
  color: #d79716;
  animation: result-score-card-star-pop 420ms ease both;
}

.result-score-card__star:nth-child(2).result-score-card__star--filled {
  animation-delay: 80ms;
}

.result-score-card__star:nth-child(3).result-score-card__star--filled {
  animation-delay: 160ms;
}

.result-score-card__star-summary {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.9rem;
  line-height: 1.45;
}

.result-score-card__unlock-callout {
  margin: 0;
}

.result-score-card__unlock-callout--fresh {
  background: rgba(255, 244, 208, 0.96);
  animation: result-score-card-unlock-pulse 1.8s ease-in-out infinite;
}

.result-score-card__challenge-collection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.result-score-card__challenge-collection-item {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.76);
}

.result-score-card__challenge-collection-label {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.result-score-card__challenge-collection-value {
  color: var(--color-ink, #24324a);
  font-size: 1rem;
  line-height: 1.35;
}

.result-score-card__challenge-collection-note {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.88rem;
  line-height: 1.45;
}

.result-score-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.result-score-card__item {
  padding: 18px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
}

.result-score-card__item--primary {
  background: linear-gradient(180deg, rgba(242, 253, 249, 0.98) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.result-score-card__label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.9rem;
}

.result-score-card__value {
  display: block;
  color: var(--color-ink, #24324a);
  font-size: 1.45rem;
  line-height: 1.1;
}

.result-score-card__footer {
  display: grid;
  gap: 14px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid rgba(36, 50, 74, 0.08);
}

.result-score-card__footer-copy {
  display: grid;
  gap: 8px;
}

.result-score-card__copy-note {
  margin: 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.86rem;
  line-height: 1.5;
}

.result-score-card__copy-note--copied {
  color: #1f6b51;
}

.result-score-card__copy-note--failed,
.result-score-card__copy-note--unsupported {
  color: #9e3b57;
}

.result-score-card__footer-actions {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px 14px;
  align-items: start;
}

.result-score-card__action-cluster {
  display: grid;
  gap: 8px;
  align-content: start;
}

.result-score-card__action-cluster--journey {
  justify-items: end;
}

.result-score-card__action-label {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.result-score-card__utility-actions,
.result-score-card__journey-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.result-score-card__journey-actions {
  justify-content: flex-end;
}

.result-score-card__action-button {
  min-width: 132px;
}

@keyframes result-score-card-star-pop {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.72);
  }

  65% {
    opacity: 1;
    transform: translateY(-2px) scale(1.08);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes result-score-card-unlock-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(255, 184, 42, 0.1);
  }

  50% {
    box-shadow: 0 0 0 8px rgba(255, 184, 42, 0);
  }
}

@keyframes result-score-card-burst-float {
  0% {
    opacity: 0;
    transform: translateY(12px) scale(0.74) rotate(-10deg);
  }

  30% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateY(-18px) scale(1.04) rotate(12deg);
  }
}

@media (max-width: 720px) {
  .result-score-card {
    padding: 20px;
    border-radius: 24px;
  }

  .result-score-card__hero {
    grid-template-columns: 1fr;
  }

  .result-score-card__seal {
    min-height: 118px;
    max-width: 190px;
  }

  .result-score-card__challenge-head,
  .result-score-card__footer-actions {
    grid-template-columns: 1fr;
  }

  .result-score-card__challenge-progress,
  .result-score-card__challenge-collection,
  .result-score-card__action-cluster--journey,
  .result-score-card__journey-actions {
    justify-items: start;
    justify-content: flex-start;
  }

  .result-score-card__challenge-collection {
    grid-template-columns: 1fr;
  }

  .result-score-card__grid {
    grid-template-columns: 1fr;
  }

  .result-score-card__utility-actions,
  .result-score-card__journey-actions {
    flex-direction: column;
  }

  .result-score-card__action-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .result-score-card__burst,
  .result-score-card__star--filled,
  .result-score-card__unlock-callout--fresh {
    animation: none;
  }
}
</style>
