<script>
import OwlMascot from "../components/OwlMascot.vue";
import ResultScoreCard from "../components/ResultScoreCard.vue";
import { useQuizView } from "../composables/useQuizView";

export default {
  components: { OwlMascot, ResultScoreCard },
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
    }
  },
  emits: ["finished", "restart", "next-stage", "question-resolved", "open-wrong-review", "practice-knowledge"],
  setup(props, { emit }) {
    return useQuizView(props, emit);
  }
};
</script>

<template>
  <section class="quiz-view">
    <div class="quiz-view__ornaments" aria-hidden="true">
      <span class="quiz-view__leaf quiz-view__leaf--left"></span>
      <span class="quiz-view__leaf quiz-view__leaf--right"></span>
      <span class="quiz-view__star quiz-view__star--1">✦</span>
      <span class="quiz-view__star quiz-view__star--2">✦</span>
      <span class="quiz-view__bottle"></span>
    </div>

    <div class="quiz-view__board" :class="{ 'quiz-view__board--solo': !hasQuestions }">
      <div class="quiz-view__content">
        <div v-if="!hasQuestions" class="quiz-view__empty">
          <h2 class="quiz-view__empty-title">暂时还没有题目</h2>
          <p class="quiz-view__empty-text">请先给 QuizView 传入题目数组，再开始答题。</p>
        </div>

        <Transition v-else name="question-swap" mode="out-in">
          <article v-if="currentQuestion" :key="currentQuestion.id" class="quiz-card">
            <section class="quiz-card__journey" aria-label="答题进度">
              <div class="quiz-card__journey-copy">
                <div class="quiz-card__journey-copy-main">
                  <span class="quiz-card__journey-title">{{ isChallengeMode ? "挑战进度" : "探索进度" }}</span>
                  <h3 class="quiz-card__journey-heading">
                    {{
                      isChallengeMode && stageTitle
                        ? `${stageTitle} · 第 ${currentQuestionIndex + 1} 题`
                        : `准备挑战第 ${currentQuestionIndex + 1} 道题`
                    }}
                  </h3>
                </div>

                <div class="quiz-card__journey-stats">
                  <span class="quiz-card__journey-pill">{{ answeredCount }} / {{ questions.length }} 题</span>
                  <span class="quiz-card__journey-pill">{{ currentScore }} 分</span>
                </div>
              </div>

              <div class="quiz-card__star-row" aria-hidden="true">
                <span v-for="(_, index) in questions" :key="`progress-${index}`" :class="getProgressStarClass(index)">★</span>
              </div>

              <div class="quiz-card__energy" aria-hidden="true">
                <div class="quiz-card__energy-fill" :style="{ width: `${progressPercent}%` }"></div>
              </div>
            </section>

            <div class="quiz-card__prompt">
              <div class="quiz-card__prompt-copy">
                <p v-if="currentQuestion.type" class="quiz-card__type">{{ currentQuestion.type }}</p>
                <h2 class="quiz-card__question">{{ currentQuestion.content }}</h2>
                <div v-if="currentQuestion.imageUrl" class="quiz-card__image-wrap">
                  <img :src="currentQuestion.imageUrl" alt="题目配图" class="quiz-card__image" loading="lazy" />
                </div>
              </div>
            </div>

            <div class="quiz-card__detail-row">
              <p class="quiz-card__rule">{{ ruleSummary }}</p>
            </div>
            <div v-if="isChallengeMode && challengeMissionLabel" class="quiz-card__challenge-strip" aria-label="本关任务">
              <span class="quiz-card__challenge-chip quiz-card__challenge-chip--goal">
                目标 {{ challengeMissionLabel }}
              </span>
              <span :class="['quiz-card__challenge-chip', `quiz-card__challenge-chip--${challengeMissionTone}`]">
                {{ challengeMissionProgress }}
              </span>
              <span v-if="challengeRewardLabel" class="quiz-card__challenge-chip quiz-card__challenge-chip--reward">
                奖励 {{ challengeRewardLabel }}
              </span>
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

            <div class="quiz-card__options">
              <button
                v-for="option in currentQuestion.options"
                :key="option.key"
                type="button"
                :class="getOptionClass(option.key)"
                :disabled="!canAnswer"
                @click="handleOptionSelect(option.key)"
              >
                <span class="quiz-view__option-key">{{ option.key }}</span>
                <span class="quiz-view__option-copy">
                  <span class="quiz-view__option-text">{{ option.text }}</span>
                  <span v-if="isSubmitting && selectedOptionKey === option.key" class="quiz-view__option-pending">判题中...</span>
                </span>
              </button>
            </div>

            <Transition name="feedback-slide">
              <div v-if="showExplanation && feedback" class="quiz-card__feedback">
                <div class="quiz-card__feedback-copy">
                  <div class="quiz-card__feedback-head">
                    <span class="quiz-card__feedback-badge">{{ feedbackBadge }}</span>
                    <span class="quiz-card__feedback-next">{{ feedbackNextStep }}</span>
                  </div>
                  <strong class="quiz-card__feedback-title">{{ feedbackTitle }}</strong>
                  <p v-if="timedOut" class="quiz-card__timeout-note">本题超时，系统已自动判错。</p>
                  <div class="quiz-card__feedback-answer-row">
                    <p v-if="!timedOut && selectedOptionKey" class="quiz-card__feedback-answer quiz-card__feedback-answer--muted">
                      你的选择：{{ selectedOptionKey }}
                    </p>
                    <p class="quiz-card__feedback-answer">
                      正确答案：{{ correctOption?.key }}{{ correctOption ? ` · ${correctOption.text}` : "" }}
                    </p>
                  </div>
                  <p class="quiz-card__feedback-text">{{ feedback.explanation }}</p>

                  <div
                    v-if="showAiReviewDisclosure && !isCorrectReviewFeedback"
                    class="quiz-card__ai-review-disclosure"
                  >
                    <span v-if="!isCorrectReviewFeedback" class="quiz-card__ai-review-badge">猫头鹰讲解</span>
                    <button
                      class="quiz-card__ai-review-toggle"
                      type="button"
                      :aria-expanded="showExpandedAiReview ? 'true' : 'false'"
                      @click="toggleAiReviewExpanded"
                    >
                      {{ aiReviewDisclosureButtonLabel }}
                    </button>
                  </div>

                  <Transition name="ai-review-fold">
                    <div
                      v-if="shouldRenderExpandedAiReview"
                      :class="['quiz-card__ai-review', { 'quiz-card__ai-review--collapsed': !showExpandedAiReview }]"
                      aria-live="polite"
                    >
                      <p v-if="aiReviewStatus === 'loading'" class="quiz-card__ai-review-loading">
                        猫头鹰老师正在整理完整讲解...
                      </p>
                      <p v-else-if="aiReviewStatus === 'error'" class="quiz-card__ai-review-error">
                        {{ aiReviewErrorMessage }}
                      </p>
                      <div v-else-if="aiReview" class="quiz-card__ai-review-body">
                        <strong class="quiz-card__ai-review-title">{{ aiReview.title }}</strong>
                        <div class="quiz-card__ai-review-grid">
                          <article class="quiz-card__ai-review-item quiz-card__ai-review-item--focus">
                            <span class="quiz-card__ai-review-label">这题关键</span>
                            <p class="quiz-card__ai-review-line">{{ aiReview.diagnosis }}</p>
                          </article>
                          <article class="quiz-card__ai-review-item">
                            <span class="quiz-card__ai-review-label">下一步</span>
                            <p class="quiz-card__ai-review-line">{{ aiReview.nextStep }}</p>
                          </article>
                        </div>
                        <p v-if="aiReview.encouragement" class="quiz-card__ai-review-encouragement">{{ aiReview.encouragement }}</p>
                      </div>
                    </div>
                  </Transition>
                </div>

                <div class="quiz-card__actions">
                  <button
                    v-if="showAiReviewDisclosure && isCorrectReviewFeedback"
                    class="quiz-card__ai-review-toggle quiz-card__ai-review-toggle--quiet quiz-card__ai-review-toggle--action"
                    type="button"
                    :aria-expanded="showExpandedAiReview ? 'true' : 'false'"
                    @click="toggleAiReviewExpanded"
                  >
                    {{ aiReviewDisclosureButtonLabel }}
                  </button>
                  <button class="btn-cartoon btn-cartoon--mint quiz-card__continue" type="button" @click="goToNextQuestion">
                    {{ continueButtonLabel }}
                  </button>
                </div>
              </div>
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

                <div class="quiz-card__session-summary-grid">
                  <article class="quiz-card__session-summary-item">
                    <span class="quiz-card__session-summary-label">已经稳住</span>
                    <p class="quiz-card__session-summary-text">{{ quizSummary.strengths }}</p>
                  </article>
                  <article class="quiz-card__session-summary-item">
                    <span class="quiz-card__session-summary-label">优先补这点</span>
                    <p class="quiz-card__session-summary-text">{{ quizSummary.focusPoint }}</p>
                  </article>
                  <article class="quiz-card__session-summary-item">
                    <span class="quiz-card__session-summary-label">下一步安排</span>
                    <p class="quiz-card__session-summary-text">{{ quizSummary.nextPlan }}</p>
                  </article>
                  <article class="quiz-card__session-summary-item">
                    <span class="quiz-card__session-summary-label">家长可这样陪</span>
                    <p class="quiz-card__session-summary-text">{{ quizSummary.parentTip }}</p>
                  </article>
                </div>

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

      <aside v-if="hasQuestions" class="quiz-view__sidebar">
        <div class="quiz-view__companion">
          <div class="quiz-view__companion-head">
            <span class="quiz-view__companion-tag">{{ companionPersonaName }}</span>
            <span :class="['quiz-view__companion-state', `quiz-view__companion-state--${companionTone}`]">
              {{ companionStateLabel }}
            </span>
          </div>

          <div class="quiz-view__companion-copy">
            <div class="quiz-view__companion-title-row">
              <h3 class="quiz-view__companion-title">{{ companionTitle }}</h3>
              <span :class="['quiz-view__companion-auto-state', `quiz-view__companion-auto-state--${companionAutoVoiceTone}`]">
                {{ companionAutoVoiceLabel }}
              </span>
            </div>
            <div v-if="showCompanionVoiceButton || companionVoiceErrorMessage" class="quiz-view__companion-actions">
              <button
                v-if="showCompanionVoiceButton"
                class="quiz-view__companion-voice"
                type="button"
                :disabled="aiSpeechStatus === 'loading' || quizSummarySpeechStatus === 'loading'"
                @click="handlePlayCompanionVoice"
              >
                {{ companionVoiceButtonLabel }}
              </button>
              <p v-if="companionVoiceErrorMessage" class="quiz-view__companion-error">{{ companionVoiceErrorMessage }}</p>
            </div>
          </div>

          <div class="quiz-view__companion-stats" aria-label="答题状态摘要">
            <div
              v-for="item in companionStats"
              :key="item.label"
              class="quiz-view__companion-stat"
            >
              <span class="quiz-view__companion-stat-label">{{ item.label }}</span>
              <strong class="quiz-view__companion-stat-value">{{ item.value }}</strong>
            </div>
          </div>

          <div class="quiz-view__companion-focus">
            <span class="quiz-view__companion-focus-label">{{ companionFocusLabel }}</span>
            <p class="quiz-view__companion-focus-text">{{ companionFocusText }}</p>
          </div>

          <div class="quiz-view__mascot-shell">
            <div :class="['quiz-view__mascot-dialog', { 'quiz-view__mascot-dialog--speaking': mascotStatus === 'speaking' }]" aria-live="polite">
              <span :class="['quiz-view__mascot-dialog-tag', { 'quiz-view__mascot-dialog-tag--speaking': mascotStatus === 'speaking' }]">
                {{ companionDialogTag }}
              </span>
              <p
                :class="[
                  'quiz-view__bubble',
                  'quiz-view__bubble--mascot',
                  `quiz-view__bubble--${companionTone}`,
                  { 'quiz-view__bubble--speaking': mascotStatus === 'speaking' }
                ]"
              >
                {{ mascotHint }}
              </p>
            </div>
            <div class="quiz-view__mascot">
              <OwlMascot :status="mascotStatus" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped src="./QuizView.css"></style>
