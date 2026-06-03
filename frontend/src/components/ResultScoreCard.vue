<script setup>
import { computed, ref } from "vue";

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
</script>

<template>
  <section class="result-bento">
    <div class="result-bento__decor" aria-hidden="true">
      <span class="decor-spark spark-1">✦</span>
      <span class="decor-spark spark-2">✦</span>
      <div v-if="showCelebration" class="celebration-container">
        <span
          v-for="burst in celebrationBursts"
          :key="burst.id"
          :class="['burst', burst.className]"
        >
          {{ burst.symbol }}
        </span>
      </div>
    </div>

    <div class="bento-grid">
      <!-- Hero Card -->
      <div class="bento-card bento-card--hero" :class="{'is-passed': isPassed && isChallengeMode}">
        <div class="hero-content">
          <span class="brand-chip">Wonder Trivia Island</span>
          <p class="passport-label">{{ passportLabel }}</p>
          <h3 class="hero-title">{{ title }}</h3>
          <p class="hero-summary">{{ summary }}</p>
          <p v-if="unlockCalloutText" class="unlock-callout">{{ unlockCalloutText }}</p>
        </div>

        <div v-if="isChallengeMode" class="hero-status">
          <div class="star-display">
            <span v-for="star in challengeStars" :key="star.id" :class="['star', { 'star--filled': star.filled }]">
              {{ star.filled ? "★" : "☆" }}
            </span>
          </div>
          <p class="status-text">{{ challengeStatusText }}</p>
          <p class="status-note">{{ challengeStatusNote }}</p>
        </div>
      </div>

      <!-- Rewards Card -->
      <div v-if="isChallengeMode && (challengeMissionLabel || challengeRewardStatus || newAchievements.length > 0)" class="bento-card bento-card--rewards">
        <div class="rewards-grid">
          <div v-if="challengeMissionLabel" class="reward-item">
            <span class="reward-label">本关目标</span>
            <strong class="reward-value">{{ challengeMissionLabel }}</strong>
            <span class="reward-note">{{ challengeMissionStatus }}</span>
          </div>
          <div v-if="challengeRewardStatus" class="reward-item">
            <span class="reward-label">航海收藏</span>
            <strong class="reward-value">{{ challengeOutcome?.rewardGlyph }} {{ challengeOutcome?.rewardName }}</strong>
            <span class="reward-note">{{ challengeRewardStatus }}</span>
          </div>
          <div v-if="newAchievements.length > 0" class="reward-item">
            <span class="reward-label">本次成就</span>
            <strong class="reward-value">{{ newAchievements.map((a) => `${a.glyph} ${a.name}`).join(" · ") }}</strong>
          </div>
        </div>
      </div>

    </div>

    <!-- Footer Actions -->
    <div class="result-footer">
      <div class="footer-actions">
        <div class="primary-actions">
          <button class="btn-cartoon btn-cartoon--yellow result-action-btn" @click="emit('replay')">
            {{ replayLabel }}
          </button>
          <button v-if="showNextStageAction" class="btn-cartoon btn-cartoon--mint result-action-btn" @click="emit('next-stage')">
            {{ nextStageButtonLabel }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.result-bento {
  position: relative;
  overflow: hidden;
  padding: 24px;
  background: transparent;
  text-align: left;
}

.bento-grid {
  display: grid;
  gap: 16px;
  position: relative;
  z-index: 2;
}

/* Base Card Style */
.bento-card {
  border-radius: 24px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 12px 24px rgba(36, 50, 74, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  animation: bento-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.bento-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(36, 50, 74, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1);
}

@keyframes bento-pop {
  0% { opacity: 0; transform: translateY(20px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* Hero Card */
.bento-card--hero {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(244,249,252,0.9) 100%);
}

.bento-card--hero.is-passed {
  background: linear-gradient(135deg, rgba(242, 253, 249, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  border-color: rgba(184, 242, 223, 0.6);
}

.hero-content {
  flex: 1;
  min-width: 240px;
}

.brand-chip {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 231, 238, 0.86);
  color: #a23b56;
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.passport-label {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  margin: 0 0 4px 0;
}

.hero-title {
  font-family: "ZCOOL KuaiLe", "Baloo 2", sans-serif;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  color: var(--color-ink, #24324a);
  margin: 0 0 8px 0;
  line-height: 1.1;
}

.hero-summary {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0;
}

.unlock-callout {
  display: inline-block;
  margin-top: 12px;
  padding: 6px 14px;
  background: rgba(255, 244, 208, 0.9);
  border-radius: 12px;
  color: #b77211;
  font-weight: 700;
  font-size: 0.85rem;
  animation: unlock-pulse 2s infinite;
}

@keyframes unlock-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 184, 42, 0.2); }
  50% { box-shadow: 0 0 0 6px rgba(255, 184, 42, 0); }
}

.hero-status {
  text-align: center;
  padding: 16px 24px;
  background: rgba(255,255,255,0.6);
  border-radius: 20px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}

.star-display {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.star {
  font-size: 2rem;
  color: rgba(36,50,74,0.1);
  line-height: 1;
}

.star--filled {
  color: #f59e0b;
  animation: star-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.star:nth-child(2).star--filled { animation-delay: 0.1s; }
.star:nth-child(3).star--filled { animation-delay: 0.2s; }

@keyframes star-pop {
  0% { transform: scale(0) rotate(-15deg); opacity: 0; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.status-text {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--color-ink, #24324a);
  margin: 0 0 4px 0;
}

.status-note {
  font-size: 0.8rem;
  color: var(--color-ink-soft, #5b6984);
  margin: 0;
}

/* Rewards Card */
.bento-card--rewards {
  background: linear-gradient(135deg, rgba(255, 249, 225, 0.9) 0%, rgba(255, 255, 255, 0.9) 100%);
  animation-delay: 0.1s;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.reward-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reward-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-ink-soft, #5b6984);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.reward-value {
  font-size: 1.1rem;
  color: var(--color-ink, #24324a);
  font-weight: 800;
}

.reward-note {
  font-size: 0.85rem;
  color: var(--color-ink-soft, #5b6984);
}

/* Stats Grid */
.bento-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.bento-card--stat {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 24px 16px;
  animation-delay: 0.2s;
}

.bento-card--primary-stat {
  background: linear-gradient(135deg, var(--quiz-theme-accent-warm-soft) 0%, #fff 100%);
  border-color: rgba(255, 174, 66, 0.3);
}

.bento-stats .bento-card:nth-child(2) { animation-delay: 0.25s; }
.bento-stats .bento-card:nth-child(3) { animation-delay: 0.3s; }

.stat-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-ink-soft, #5b6984);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 900;
  color: var(--color-ink, #24324a);
  font-family: "Baloo 2", sans-serif;
  line-height: 1;
}

.stat-value small {
  font-size: 1rem;
  font-weight: 700;
  margin-left: 4px;
}

/* Footer Actions */
.result-footer {
  margin-top: 24px;
  display: grid;
  gap: 16px;
  position: relative;
  z-index: 2;
  animation: bento-pop 0.5s ease both;
  animation-delay: 0.4s;
}

.footer-copy-section {
  text-align: center;
}

.footer-caption {
  color: var(--color-ink, #24324a);
  font-weight: 700;
  margin: 0 0 4px 0;
}

.copy-note {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.85rem;
  margin: 0;
}

.copy-note--copied { color: #1f6b51; }
.copy-note--failed, .copy-note--unsupported { color: #9e3b57; }

.footer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.primary-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.result-action-btn {
  min-width: 140px;
  padding: 12px 24px;
  font-size: 1rem;
}

/* Decorations */
.result-bento__decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.decor-spark {
  position: absolute;
  color: rgba(255, 184, 42, 0.6);
  font-size: 1.2rem;
}

.spark-1 { top: 10%; right: 5%; }
.spark-2 { bottom: 20%; left: 5%; font-size: 0.9rem; }

.celebration-container {
  position: absolute;
  inset: 0;
}

.burst {
  position: absolute;
  color: rgba(255, 184, 42, 0.8);
  animation: burst-float 2s ease-out both;
}

.result-score-card__burst--1 { top: 5%; left: 15%; font-size: 1rem; }
.result-score-card__burst--2 { top: 15%; right: 10%; font-size: 1.2rem; animation-delay: 0.1s; }
.result-score-card__burst--3 { bottom: 40%; left: 8%; font-size: 0.9rem; animation-delay: 0.2s; }
.result-score-card__burst--4 { bottom: 10%; right: 15%; font-size: 1.1rem; animation-delay: 0.3s; }

@keyframes burst-float {
  0% { transform: translateY(20px) scale(0.5); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(-40px) scale(1.2) rotate(20deg); opacity: 0; }
}

@media (max-width: 640px) {
  .hero-status {
    width: 100%;
  }
  .bento-stats {
    grid-template-columns: 1fr;
  }
  .footer-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .primary-actions {
    flex-direction: column;
  }
  .result-action-btn {
    width: 100%;
  }
}
</style>
