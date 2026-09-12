<script>
import { onMounted, ref } from "vue";
import ResultScoreCard from "../components/ResultScoreCard.vue";
import BalloonOption from "../components/BalloonOption.vue";
import AnswerOption from "../components/AnswerOption.vue";
import { useQuizView } from "../composables/useQuizView";

export default {
  components: { ResultScoreCard, BalloonOption, AnswerOption },
  props: {
    questions: {
      type: Array,
      default: () => []
    },
    questionTimeLimitSeconds: {
      type: Number,
      default: 0
    },
    pointsPerCorrect: {
      type: Number,
      default: 10
    },
    playMode: {
      type: String,
      default: "free"
    },
    stageTitle: {
      type: String,
      default: ""
    },
    challengeStage: {
      type: Object,
      default: null
    },
    challengeResult: {
      type: Object,
      default: null
    },
    autoAdvanceDelay: {
      type: Number,
      default: 1500
    },
    globalStarsEarned: {
      type: Number,
      default: 0
    }
  },
  emits: ["finished", "restart", "next-stage", "question-resolved", "open-wrong-review", "practice-knowledge"],
  setup(props, { emit }) {
    const isMounted = ref(false);
    onMounted(() => {
      isMounted.value = true;
    });
    return {
      ...useQuizView(props, emit),
      isMounted
    };
  }
};
</script>

<template>
  <section :class="['quiz-view', quizThemeClass]" :style="quizThemeStyle">
    <Teleport to="#adventure-bar-actions" v-if="isMounted">
      <div class="quiz-card__journey-star-badge" :class="{ 'star-pulse': showCorrectStarAnimation }">
        <span class="star-icon">⭐</span>
        <span class="star-value">{{ globalStarsEarned + correctCount }}</span>
      </div>
    </Teleport>

    <div class="quiz-view__ornaments" aria-hidden="true">
      <span class="quiz-view__leaf quiz-view__leaf--left"></span>
      <span class="quiz-view__leaf quiz-view__leaf--right"></span>
      <span class="quiz-view__star quiz-view__star--1">✦</span>
      <span class="quiz-view__star quiz-view__star--2">✦</span>
      <span class="quiz-view__bottle"></span>
    </div>

    <div class="quiz-view__board quiz-view__board--solo">
      <div class="quiz-view__content">
        <div v-if="!hasQuestions" class="quiz-view__empty">
          <h2 class="quiz-view__empty-title">暂时还没有题目</h2>
          <p class="quiz-view__empty-text">请先给 QuizView 传入题目数组，再开始答题。</p>
        </div>

        <Transition v-else name="question-swap" mode="out-in">
          <article
            v-if="currentQuestion"
            :key="currentQuestion.id"
            :class="[
              'quiz-card',
              {
                'quiz-card--has-image': currentQuestion.imageUrl,
                'quiz-card--showing-feedback': showExplanation && feedback
              }
            ]"
          >
            <section
              class="quiz-card__journey quiz-card__journey--glass"
              :aria-label="`答题进度 已答 ${answeredCount} / ${questions.length} 题`"
            >
              <div class="quiz-card__journey-header">
                <div class="quiz-card__journey-copy-main">
                  <h3 class="quiz-card__journey-heading">{{ journeyHeading }}</h3>
                </div>
                <div class="quiz-card__journey-stats">
                  <span v-if="challengeRewardLabel" class="quiz-card__challenge-chip quiz-card__challenge-chip--reward">
                    奖励 {{ challengeRewardLabel }}
                  </span>
                  <div class="quiz-card__journey-score-badge">
                    <span class="score-value">{{ currentScore }}</span>
                    <span class="score-label">分</span>
                  </div>
                </div>
              </div>

              <div
                v-if="playGoalState"
                :class="['quiz-card__play-goal', `quiz-card__play-goal--${playGoalState.key}`]"
                :style="{ '--play-goal-target': playGoalState.target }"
                aria-live="polite"
              >
                <div class="quiz-card__play-goal-copy">
                  <span class="quiz-card__play-goal-name">{{ playGoalState.title }}</span>
                  <strong>{{ playGoalLabel }}</strong>
                </div>
                <div class="quiz-card__play-goal-meter" :aria-label="`${playGoalState.title}进度 ${playGoalState.progress} / ${playGoalState.target}`">
                  <span
                    v-for="node in playGoalProgressNodes"
                    :key="node.id"
                    :class="['quiz-card__play-goal-node', { 'is-filled': node.filled }]"
                  >
                    {{ node.filled ? "★" : "" }}
                  </span>
                </div>
                <span class="quiz-card__play-goal-count">{{ playGoalCountLabel }}</span>
              </div>

              <div class="quiz-card__treasure-map" aria-hidden="true">
                <div class="treasure-map__track">
                  <div class="treasure-map__track-fill" :style="{ width: `${progressPercent}%` }"></div>
                </div>
                <div class="treasure-map__nodes">
                  <div
                    v-for="(_, index) in questions"
                    :key="`node-${index}`"
                    :class="['treasure-map__node', getProgressStarClass(index)]"
                  >
                    <div class="node-inner">
                      <span class="node-icon" v-if="questionResults[index] === 'correct'">★</span>
                      <span class="node-icon node-icon--wrong" v-else-if="questionResults[index] === 'wrong'">×</span>
                    </div>
                    <div v-if="index === currentQuestionIndex" class="node-pulse"></div>
                  </div>
                </div>
              </div>
            </section>

            <div class="quiz-card__prompt">
              <div class="quiz-card__prompt-copy">
                <div :class="['quiz-card__question-block', { 'quiz-card__question-block--compact': useCompactQuestionLead }]">
                  <h2 :class="['quiz-card__question', { 'quiz-card__question--compact': useCompactQuestionLead }]">
                    {{ questionLeadText }}
                  </h2>
                </div>
                <div v-if="showPromptScene" class="quiz-card__scene">
                  <div class="quiz-card__scene-head">
                    <span class="quiz-card__scene-badge">{{ promptSceneBadge }}</span>
                    <span class="quiz-card__scene-note">{{ promptSceneNote }}</span>
                  </div>
                  <div class="quiz-card__image-wrap">
                    <span class="quiz-card__scene-cloud quiz-card__scene-cloud--left" aria-hidden="true"></span>
                    <span class="quiz-card__scene-cloud quiz-card__scene-cloud--right" aria-hidden="true"></span>
                    <span class="quiz-card__scene-spark quiz-card__scene-spark--1" aria-hidden="true">✦</span>
                    <span class="quiz-card__scene-spark quiz-card__scene-spark--2" aria-hidden="true">✦</span>
                    <div class="quiz-card__scene-frame">
                      <img :src="currentQuestion.imageUrl" alt="题目配图" class="quiz-card__image" loading="lazy" />
                    </div>
                    <span class="quiz-card__scene-floor" aria-hidden="true"></span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="showCountdown" :class="['quiz-card__countdown', `quiz-card__countdown--${timerTone}`]">
              <div class="quiz-card__countdown-track" aria-hidden="true">
                <div class="quiz-card__countdown-fill" :style="{ width: `${timerPercent}%` }"></div>
              </div>
              <span class="quiz-card__countdown-text">{{ isSubmitting ? "答案已提交，正在判题" : `倒计时 ${timeRemainingSeconds} 秒` }}</span>
            </div>
            <div v-if="isSubmitting" class="quiz-card__submission-status" role="status" aria-live="polite" aria-atomic="true">
              <div class="quiz-card__submission-status-copy">
                <span class="quiz-card__submission-badge">{{ submissionStatusLabel }}</span>
                <p class="quiz-card__submission-text">{{ submissionStatusText }}</p>
              </div>
            </div>
            <p v-if="submitErrorMessage" class="quiz-card__error">{{ submitErrorMessage }}</p>

            <section v-if="useStrategyOptions" class="quiz-card__strategy" aria-label="本题得分策略">
              <div class="quiz-card__strategy-copy">
                <strong>本题怎么答？</strong>
                <span>冲刺分更高，答错会扣分</span>
              </div>
              <div class="quiz-card__strategy-control">
                <button
                  v-for="strategy in strategyOptions"
                  :key="strategy.value"
                  type="button"
                  :class="['quiz-card__strategy-option', { 'is-selected': selectedStrategyMode === strategy.value }]"
                  :aria-pressed="selectedStrategyMode === strategy.value"
                  :disabled="!canAnswer"
                  @click="selectAnswerStrategy(strategy.value)"
                >
                  <strong>{{ strategy.label }}</strong>
                  <span>{{ strategy.detail }}</span>
                </button>
              </div>
            </section>

            <div class="quiz-card__options-shell">
              <div :class="['quiz-card__options', { 'quiz-card__options--grid': usePlayfulOptionLayout, 'quiz-card__options--balloons': useBalloonOptions }]">
                <template v-for="(option, index) in currentQuestion.options" :key="option.key">
                  <BalloonOption
                    v-if="useBalloonOptions"
                    :option="option"
                    :is-selected="selectedOptionKey === option.key"
                    :is-correct="Boolean(feedback) && feedback.correctAnswer === option.key"
                    :is-wrong="answerState === 'wrong' && selectedOptionKey === option.key && feedback?.correctAnswer !== option.key"
                    :is-submitting="isSubmitting"
                    :disabled="!canAnswer"
                    :color-theme="['pink', 'blue', 'green', 'yellow'][index % 4]"
                    @select="handleOptionSelect"
                  />
                  <AnswerOption
                    v-else
                    :option="option"
                    :variant="answerOptionVariant"
                    :is-selected="selectedOptionKey === option.key"
                    :is-correct="Boolean(feedback) && feedback.correctAnswer === option.key"
                    :is-wrong="answerState === 'wrong' && selectedOptionKey === option.key && feedback?.correctAnswer !== option.key"
                    :is-submitting="isSubmitting"
                    :disabled="!canAnswer"
                    :show-option-key="shouldShowOptionKey"
                    :soft-option-key="useSoftOptionKey"
                    @select="handleOptionSelect"
                  />
                </template>
              </div>

            </div>

            <div
              v-if="showCorrectStarAnimation"
              class="flying-star-overlay"
              :style="{ '--correct-feedback-duration': `${correctFeedbackDelay}ms` }"
            >
              <div class="flying-star-icon" aria-hidden="true">{{ correctFeedbackIcon }}</div>
              <strong class="flying-star-text">{{ correctFeedbackTitle }}</strong>
              <span class="flying-star-detail">{{ correctFeedbackDetail }}</span>
            </div>

            <Transition name="answer-feedback">
              <section v-if="showResultModal" class="quiz-card__answer-feedback" role="status" aria-live="polite">
                <div class="quiz-card__answer-feedback-copy">
                  <span class="quiz-card__answer-feedback-mark" aria-hidden="true">↗</span>
                  <div>
                    <strong>{{ wrongFeedbackTitle }}</strong>
                    <p>{{ wrongFeedbackDetail }}</p>
                  </div>
                </div>
                <div class="quiz-card__answer-feedback-actions">
                  <button class="btn-cartoon btn-cartoon--mint quiz-card__continue" type="button" @click="handleModalAdvance">
                    我记住了，继续
                  </button>
                  <span>{{ resultAutoAdvanceTimer }} 秒后继续</span>
                </div>
              </section>
            </Transition>
          </article>

          <article v-else key="quiz-finished" class="quiz-card quiz-card--finished">
            <div class="quiz-card__finished-intro">
              <span class="quiz-card__finished-eyebrow">{{ finishEyebrow }}</span>
              <div class="quiz-card__finished-copy">
                <h2 class="quiz-card__finished-heading">{{ finishHeading }}</h2>
                <p class="quiz-card__finished-text">{{ finishSupportText }}</p>
              </div>
            </div>
            <ResultScoreCard
              :title="resultTitle"
              :summary="resultText"
              :score="currentScore"
              :correct-count="correctCount"
              :wrong-count="wrongCount"
              :accuracy-percent="accuracyPercent"
              :total-questions="questions.length"
              :play-mode="playMode"
              :challenge-ready="Boolean(challengeResult)"
              :is-passed="challengeResult?.isPassed ?? false"
              :star-count="challengeResult?.starCount ?? 0"
              :stage-title="stageTitle"
              :next-stage-title="challengeResult?.nextStageTitle ?? ''"
              :unlocked-next-stage="challengeResult?.unlockedNextStage ?? false"
              :challenge-outcome="challengeResult"
              :best-streak="bestCorrectStreak"
              :session-reward-count="sessionRewardCount"
              :session-reward-label="playRewardConfig?.rewardLabel || ''"
              :show-strategy-stats="useStrategyOptions"
              :sprint-attempt-count="sprintAttemptCount"
              :sprint-success-count="sprintSuccessCount"
              @replay="handleReplay"
              @next-stage="handleNextStage"
            />
            <section v-if="showQuizSummaryCard" :class="['quiz-card__session-summary', `quiz-card__session-summary--${quizSummaryTone}`]">
              <div class="quiz-card__session-summary-head">
                <div class="quiz-card__session-summary-copy">
                  <span class="quiz-card__session-summary-eyebrow">猫头鹰总结</span>
                  <h3 class="quiz-card__session-summary-title">{{ quizSummaryTitle }}</h3>
                  <p class="quiz-card__session-summary-subtitle">帮孩子和家长先抓住这轮最值得复盘的一点。</p>
                </div>
              </div>

              <p v-if="quizSummaryStatus === 'loading' || quizSummaryStatus === 'idle'" class="quiz-card__session-summary-loading">
                猫头鹰老师正在整理这一轮最值得先复盘的一点...
              </p>
              <p v-else-if="quizSummaryStatus === 'error'" class="quiz-card__session-summary-error">
                {{ quizSummaryErrorMessage }}
              </p>
              <div v-else-if="quizSummary" class="quiz-card__session-summary-body">
                <p class="quiz-card__session-summary-overview">{{ quizSummary.overview }}</p>

                <p class="quiz-card__session-summary-note">{{ quizSummaryFootnote }}</p>
              </div>
            </section>
            <div v-if="showWrongReviewAction || showKnowledgeFollowupAction" class="quiz-card__followup">
              <button
                v-if="showWrongReviewAction"
                class="btn-cartoon btn-cartoon--pink quiz-card__followup-button"
                type="button"
                @click="handleOpenWrongReview"
              >
                去错题温习
              </button>
              <button
                v-if="showKnowledgeFollowupAction"
                class="btn-cartoon btn-cartoon--mint quiz-card__followup-button"
                type="button"
                @click="handlePracticeKnowledge"
              >
                {{ knowledgeFollowupButtonLabel }}
              </button>
            </div>
          </article>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped src="./QuizView.css"></style>
