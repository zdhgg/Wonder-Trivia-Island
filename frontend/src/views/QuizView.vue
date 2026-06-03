<script>
import { onMounted, ref } from "vue";
import OwlMascot from "../components/OwlMascot.vue";
import ResultScoreCard from "../components/ResultScoreCard.vue";
import ModalDialog from "../components/ModalDialog.vue";
import BalloonOption from "../components/BalloonOption.vue";
import { useQuizView } from "../composables/useQuizView";

export default {
  components: { OwlMascot, ResultScoreCard, ModalDialog, BalloonOption },
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

    <div class="quiz-view__board" :class="{ 'quiz-view__board--solo': !hasQuestions }">
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
            <section class="quiz-card__journey quiz-card__journey--glass" aria-label="答题进度">
              <div class="quiz-card__journey-header">
                <div class="quiz-card__journey-copy-main">
                  <h3 class="quiz-card__journey-heading">{{ journeyHeading }}</h3>
                  <span class="quiz-card__journey-title">{{ journeyTitle }} • {{ answeredCount }}/{{ questions.length }}题</span>
                </div>
                <div class="quiz-card__journey-stats">
                  <div class="quiz-card__journey-score-badge">
                    <span class="score-value">{{ currentScore }}</span>
                    <span class="score-label">分</span>
                  </div>
                </div>
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

            <div class="quiz-card__options-shell">
              <div :class="['quiz-card__options', { 'quiz-card__options--grid': usePlayfulOptionLayout }]">
                <BalloonOption
                  v-for="(option, index) in currentQuestion.options"
                  :key="option.key"
                  :option="option"
                  :is-selected="selectedOptionKey === option.key"
                  :is-correct="selectedOptionKey === option.key && answerState === 'correct'"
                  :is-submitting="isSubmitting"
                  :disabled="!canAnswer"
                  :color-theme="['pink', 'blue', 'green', 'yellow'][index % 4]"
                  @select="handleOptionSelect"
                />
              </div>

            </div>

            <div v-if="showCorrectStarAnimation" class="flying-star-overlay">
              <div class="flying-star-text">答对啦！</div>
              <div class="flying-star-icon">⭐</div>
            </div>

            <ModalDialog
              v-model="showResultModal"
              title-id="result-modal-title"
              :heading-title="resultModalIsCorrect ? '答对啦！' : '答错了哦'"
              :disable-close="true"
              panel-class="quiz-card__result-modal"
            >
              <div v-if="resultModalIsCorrect" class="quiz-card__celebration-panel">
                <div class="quiz-card__celebration-burst">
                  <span class="quiz-card__celebration-firework quiz-card__celebration-firework--left"></span>
                  <span class="quiz-card__celebration-firework quiz-card__celebration-firework--right"></span>
                  <span class="quiz-card__celebration-star quiz-card__celebration-star--1">★</span>
                  <span class="quiz-card__celebration-star quiz-card__celebration-star--2">✦</span>
                  <span class="quiz-card__celebration-star quiz-card__celebration-star--3">★</span>
                  <span class="quiz-card__celebration-star quiz-card__celebration-star--4">✦</span>
                </div>
                <span class="quiz-card__celebration-score">+{{ pointsPerCorrect }} 分</span>
                <p v-if="selectedAnswerLabel" class="quiz-card__result-answer-line">你点的是：{{ selectedAnswerLabel }}</p>
              </div>
              <div v-else class="quiz-card__wrong-panel">
                <p class="quiz-card__wrong-panel-title">已加入错题本，下次再努力！</p>
                <dl class="quiz-card__answer-summary">
                  <div class="quiz-card__answer-summary-row">
                    <dt>你点的是</dt>
                    <dd>{{ selectedAnswerLabel || "未作答" }}</dd>
                  </div>
                  <div class="quiz-card__answer-summary-row">
                    <dt>正确答案</dt>
                    <dd>{{ correctAnswerLabel }}</dd>
                  </div>
                </dl>
              </div>

              <div class="quiz-card__result-modal-actions">
                <button class="btn-cartoon btn-cartoon--mint quiz-card__continue" type="button" @click="handleModalAdvance">
                  继续下一题 ({{ resultAutoAdvanceTimer }}s)
                </button>
              </div>
            </ModalDialog>
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
        <div class="quiz-view__companion" :class="{ 'quiz-view__companion--active': currentQuestion }">
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
