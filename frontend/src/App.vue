<script>
import { computed, defineAsyncComponent } from "vue";
import PracticeHomeView from "./views/PracticeHomeView.vue";
import { useSettingsCenter } from "./composables/useSettingsCenter";
import { useToolsCenter } from "./composables/useToolsCenter";
import { useTriviaApp } from "./composables/useTriviaApp";

const QuizSettingsModal = defineAsyncComponent(() => import("./components/QuizSettingsModal.vue"));
const KnowledgeStudyView = defineAsyncComponent(() => import("./views/KnowledgeStudyView.vue"));
const QuizView = defineAsyncComponent(() => import("./views/QuizView.vue"));
const SettingsView = defineAsyncComponent(() => import("./views/SettingsView.vue"));
const StudyLessonPlayerView = defineAsyncComponent(() => import("./views/StudyLessonPlayerView.vue"));
const ToolsView = defineAsyncComponent(() => import("./views/ToolsView.vue"));
const WrongQuestionReviewView = defineAsyncComponent(() => import("./views/WrongQuestionReviewView.vue"));

export default {
  components: {
    PracticeHomeView,
    KnowledgeStudyView,
    QuizSettingsModal,
    QuizView,
    SettingsView,
    StudyLessonPlayerView,
    ToolsView,
    WrongQuestionReviewView
  },
  setup() {
    const app = useTriviaApp();
    const settingsCenter = useSettingsCenter(app);
    const toolsCenter = useToolsCenter(app);
    const isImmersiveView = computed(() => app.currentView.value === app.VIEW_MODE.STUDY_PLAYER);

    function handleHomeNavigation() {
      if (!settingsCenter.confirmLeaveSettings({ targetLabel: "首页" })) {
        return;
      }

      app.openHomeView();
    }

    function openToolsWorkspace(sectionId = "") {
      if (!settingsCenter.confirmLeaveSettings({ targetLabel: "工具台" })) {
        return;
      }

      toolsCenter.openToolsWorkspace(sectionId);
    }

    return {
      ...app,
      ...settingsCenter,
      ...toolsCenter,
      isImmersiveView,
      handleHomeNavigation,
      openToolsWorkspace
    };
  }
};
</script>

<template>
  <div
    :class="[
      'page-shell',
      {
        'page-shell--immersive': isImmersiveView,
        'page-shell--wide': [VIEW_MODE.SETTINGS, VIEW_MODE.TOOLS].includes(currentView)
      }
    ]"
  >
    <header v-if="!isImmersiveView" class="site-nav">
      <div class="site-nav__compact">
        <button class="site-brand__home" type="button" @click="handleHomeNavigation">
          <span class="site-brand__home-mark">奇妙知识岛</span>
        </button>

        <div class="site-nav__tools" aria-label="快捷入口">
          <button
            v-if="currentView !== VIEW_MODE.HOME"
            class="site-nav__quick-button"
            type="button"
            @click="handleHomeNavigation"
          >
            返回首页
          </button>
          <button
            :class="['site-nav__quick-button', 'site-nav__quick-button--manage', { 'site-nav__quick-button--active': isToolsActive }]"
            type="button"
            @click="openToolsWorkspace"
          >
            工具
          </button>
          <button
            :class="['site-nav__quick-button', 'site-nav__quick-button--settings', { 'site-nav__quick-button--active': isSettingsActive }]"
            type="button"
            @click="openSettingsView"
          >
            设置
          </button>
        </div>
      </div>
    </header>

    <main :class="['page-main', { 'page-main--immersive': isImmersiveView }]">
      <PracticeHomeView
        v-if="currentView === VIEW_MODE.HOME"
        v-model:challenge-grade="homeChallengeGrade"
        v-model:challenge-semester="homeChallengeSemester"
        v-model:grade-practice-grade="homeGradePracticeGrade"
        v-model:grade-practice-semester="homeGradePracticeSemester"
        v-model:subject-practice-subject="homeSubjectPracticeSubject"
        v-model:subject-practice-grade="homeSubjectPracticeGrade"
        v-model:subject-practice-semester="homeSubjectPracticeSemester"
        :challenge-current-stage-label="currentChallengeHomeLabel"
        :challenge-route-title="homeChallengeRouteTitle"
        :grade-options="homeGradeOptions"
        :subject-options="homeSubjectOptions"
        :semester-options="homeSemesterOptions"
        :subject-grade-options="homeSubjectPracticeGradeOptions"
        :knowledge-spotlight="homeKnowledgeSpotlight"
        :wrong-book-spotlight="homeWrongBookSpotlight"
        :welcome-panel="homeWelcomePanel"
        @play-welcome-voice="handlePlayHomeWelcomeVoice"
        @start-challenge="startHomeChallenge"
        @start-grade-practice="startHomeGradePractice"
        @start-subject-practice="startHomeSubjectPractice"
        @start-free-practice="startHomeFreePractice"
        @open-knowledge-study="openStudyView"
        @open-wrong-review="openWrongBookView"
      />

      <KnowledgeStudyView
        v-else-if="currentView === VIEW_MODE.STUDY"
        :overview="knowledgeStudyOverview"
        :is-loading="isKnowledgeRoutesLoading"
        :initial-grade-filter="studyInitialGradeFilter"
        :initial-lesson-id="selectedStudyLessonId"
        :systematic-sections="knowledgeSystematicSections"
        :knowledge-items="knowledgeStudyItems"
        @start-practice="startKnowledgeTagPractice"
        @open-study-lesson="openStudyLessonPlayer"
        @open-wrong-review="openWrongBookView"
      />

      <StudyLessonPlayerView
        v-else-if="currentView === VIEW_MODE.STUDY_PLAYER"
        :lesson="selectedStudyLesson"
        :next-lesson="nextStudyLesson"
        @close="closeStudyLessonPlayer"
        @complete="completeStudyLesson"
      />

      <WrongQuestionReviewView
        v-else-if="currentView === VIEW_MODE.WRONG_BOOK"
        :overview="wrongBookOverview"
        :wrong-questions="wrongQuestionItems"
        :focus-knowledge-tag="wrongBookFocusTag"
        @start-review="startWrongQuestionReview"
        @review-question="startSingleWrongQuestionReview"
        @practice-knowledge="startKnowledgeTagPractice"
      />

      <ToolsView
        v-else-if="currentView === VIEW_MODE.TOOLS"
        v-model:admin-key="adminKey"
        v-model:active-section-id="activeToolSectionId"
        :catalog-prefill="catalogPrefill"
        :return-label="toolsReturnLabel"
        @imported="handleImportFinished"
        @back="closeToolsView"
      />

      <SettingsView
        v-else-if="currentView === VIEW_MODE.SETTINGS"
        v-model:active-section-id="activeSettingsSectionId"
        :backup-status-message="backupStatusMessage"
        :is-backup-busy="isBackupBusy"
        :backup-stats="backupStats"
        :return-label="settingsReturnLabel"
        @back="closeSettingsView"
        @pending-state-change="handleSettingsPendingStateChange"
        @profile-saved="handleProfileSaved"
        @export-backup="exportBackup"
        @import-backup="importBackup"
      />

      <section v-else-if="currentView === VIEW_MODE.CHALLENGE" class="challenge-panel challenge-map">
        <section class="challenge-route" aria-label="闯关地图">
          <div class="challenge-route__rail" aria-hidden="true">
            <span class="challenge-route__rail-progress" :style="challengeRouteProgressStyle"></span>
          </div>

          <button
            v-for="stage in challengeStages"
            :key="stage.id"
            :class="getChallengeStageClass(stage)"
            :style="{ '--challenge-node-offset': stage.routeOffset }"
            type="button"
            :disabled="!stage.isUnlocked || isLoading"
            @click="selectChallengeStage(stage.id)"
          >
            <span class="challenge-node__halo" aria-hidden="true"></span>

            <div class="challenge-node__top">
              <span class="challenge-node__index">第 {{ stage.order }} 站</span>
              <div class="challenge-node__top-badges">
                <span :class="['challenge-node__badge', `challenge-node__badge--${stage.stateTone}`]">
                  {{ stage.stateLabel }}
                </span>
                <span
                  v-if="stage.rewardEarned"
                  class="challenge-node__reward-stamp"
                  :aria-label="`${stage.rewardLabel} 已收藏`"
                  :title="`${stage.rewardLabel} 已收藏`"
                >
                  {{ stage.rewardGlyph }}
                </span>
              </div>
            </div>

            <div class="challenge-node__body">
              <span class="challenge-node__glyph">{{ stage.glyph }}</span>
              <div class="challenge-node__copy">
                <span class="challenge-node__chapter">{{ stage.chapterLabel }}</span>
                <strong class="challenge-node__title">{{ stage.title }}</strong>
              </div>
            </div>

            <span :class="['challenge-node__status', `challenge-node__status--${stage.coverageTone}`]">
              {{ stage.coverageShortLabel }} · {{ stage.coverageCount }}/{{ stage.coverageRequiredCount }}
            </span>
          </button>
        </section>

        <div v-if="currentChallengeStage" class="challenge-launchbar">
          <div class="challenge-launchbar__selection">
            <span class="challenge-launchbar__label">当前关卡</span>
            <strong class="challenge-launchbar__title">{{ currentStageLabel }}</strong>
            <span class="challenge-launchbar__meta">
              {{ currentChallengeStage.questionCount }} 题 · {{ currentChallengeStage.timeLimitLabel }} · 过关线 {{ currentChallengeStage.passAccuracy }}%
            </span>
            <div class="challenge-launchbar__highlights" aria-label="关卡重点">
              <span class="challenge-launchbar__chip">
                {{ currentChallengeChapterLabel }}
              </span>
              <span class="challenge-launchbar__chip">
                {{ currentChallengeRouteTitle }}
              </span>
              <span :class="['challenge-launchbar__chip', `challenge-launchbar__chip--coverage-${currentChallengeStage.coverageTone}`]">
                {{ currentChallengeStage.coverageLabel }} · {{ currentChallengeStage.coverageCount }}/{{ currentChallengeStage.coverageRequiredCount }}
              </span>
            </div>
            <span :class="['challenge-launchbar__note', `challenge-launchbar__note--${currentChallengeStage.coverageTone}`]">
              {{ currentChallengeStage.coverageHint }}
            </span>
            <details class="challenge-launchbar__details">
              <summary class="challenge-launchbar__details-toggle">更多信息</summary>
              <div class="challenge-launchbar__chips" aria-label="关卡更多信息">
                <span class="challenge-launchbar__chip">
                  目标 {{ currentChallengeStage.missionLabel }}
                </span>
                <span class="challenge-launchbar__chip">
                  共 {{ challengeChapterOptions.length }} 个章节
                </span>
                <span v-if="currentChallengeStage.knowledgeTag" class="challenge-launchbar__chip">
                  标签 {{ currentChallengeStage.knowledgeTag }}
                </span>
                <span v-if="currentChallengeRouteFocus" class="challenge-launchbar__chip">
                  {{ currentChallengeRouteFocus }}
                </span>
                <span :class="['challenge-launchbar__chip', { 'challenge-launchbar__chip--earned': currentChallengeStage.rewardEarned }]">
                  {{ currentChallengeStage.rewardEarned ? "已收藏" : "奖励" }} {{ currentChallengeStage.rewardGlyph }}
                  {{ currentChallengeStage.rewardLabel }}
                </span>
                <span class="challenge-launchbar__chip">
                  {{ challengeRewardProgressLabel }}
                </span>
                <span class="challenge-launchbar__chip">
                  {{ challengeAchievementProgressLabel }}
                </span>
                <span class="challenge-launchbar__chip">
                  {{ challengeCoverageSummaryLabel }}
                </span>
              </div>
            </details>
          </div>

          <div class="challenge-launchbar__actions">
            <button
              class="btn-cartoon btn-cartoon--yellow challenge-launchbar__start"
              type="button"
              :disabled="isLoading"
              @click="openQuizView"
            >
              {{ challengeLaunchLabel }}
            </button>

            <div class="challenge-launchbar__subactions">
              <button
                v-if="shouldShowChallengeCatalogShortcut"
                class="challenge-launchbar__subaction challenge-launchbar__subaction--accent"
                type="button"
                @click="openCatalogForCurrentChallengeStage"
              >
                补本关题目
              </button>
              <button class="challenge-launchbar__subaction" type="button" @click="openQuizSettings">
                调整题库
              </button>
            </div>
          </div>
        </div>

        <section v-if="challengeAchievements.length" class="challenge-achievements" aria-label="章节成就">
          <details class="challenge-achievements__details" :open="challengeFreshAchievementCount > 0">
            <summary class="challenge-achievements__summary">
              <div class="challenge-achievements__summary-main">
                <strong class="challenge-achievements__summary-title">章节成就</strong>
                <span class="challenge-achievements__summary-caption">
                  {{ challengeAchievementCount }} / {{ challengeAchievements.length }} 已解锁
                </span>
              </div>
              <div class="challenge-achievements__summary-side">
                <span v-if="challengeFreshAchievementCount > 0" class="challenge-achievements__fresh">
                  新解锁 {{ challengeFreshAchievementCount }}
                </span>
                <span class="challenge-achievements__summary-action">
                  {{ challengeFreshAchievementCount > 0 ? "查看新成就" : "查看详情" }}
                </span>
              </div>
            </summary>

            <p class="challenge-achievements__text">当前章节的通关、收藏、满星和节奏记录都会在这里点亮。</p>

            <div class="challenge-achievements__grid">
              <article
                v-for="achievement in challengeAchievements"
                :key="achievement.id"
                :class="[
                  'challenge-achievement-card',
                  {
                    'challenge-achievement-card--unlocked': achievement.isUnlocked,
                    'challenge-achievement-card--fresh': achievement.fresh
                  }
                ]"
              >
                <div class="challenge-achievement-card__topline">
                  <span class="challenge-achievement-card__glyph">{{ achievement.glyph }}</span>
                  <span
                    :class="[
                      'challenge-achievement-card__status',
                      `challenge-achievement-card__status--${achievement.fresh ? 'fresh' : achievement.isUnlocked ? 'unlocked' : 'locked'}`
                    ]"
                  >
                    {{ achievement.fresh ? "新解锁" : achievement.isUnlocked ? "已达成" : "进行中" }}
                  </span>
                </div>

                <strong class="challenge-achievement-card__title">{{ achievement.name }}</strong>
                <p class="challenge-achievement-card__summary">{{ achievement.summary }}</p>
                <span class="challenge-achievement-card__progress">{{ achievement.progressText }}</span>
              </article>
            </div>
          </details>
        </section>

        <section
          v-if="challengeToast"
          :class="['challenge-toast', `challenge-toast--${challengeToast.tone}`]"
          aria-live="polite"
        >
          <strong class="challenge-toast__title">{{ challengeToast.title }}</strong>
          <p class="challenge-toast__text">{{ challengeToast.text }}</p>
        </section>
      </section>

      <section v-else class="quiz-workspace">
        <section class="quiz-workspace__summary">
          <div class="quiz-workspace__summary-copy">
            <div class="quiz-workspace__summary-topline">
              <p class="quiz-workspace__summary-eyebrow">练习台</p>
              <div :class="['quiz-workspace__mode-chip', `quiz-workspace__mode-chip--${isChallengeMode ? 'challenge' : 'free'}`]">
                {{ isChallengeMode ? "挑战闯关" : "自由练习" }}
              </div>
            </div>
            <h2 class="quiz-workspace__summary-title">{{ isChallengeMode ? currentStageLabel : "当前练习设置" }}</h2>
            <p class="quiz-workspace__summary-text">{{ quizSummaryLead }}</p>

            <div class="quiz-workspace__summary-chips" aria-label="当前练习摘要">
              <span class="quiz-workspace__summary-chip">
                <span class="quiz-workspace__summary-chip-label">题库</span>
                <strong class="quiz-workspace__summary-chip-value">{{ selectedScopeLabel }}</strong>
              </span>
              <span class="quiz-workspace__summary-chip">
                <span class="quiz-workspace__summary-chip-label">节奏</span>
                <strong class="quiz-workspace__summary-chip-value">{{ activeQuestionCountValue }} 题 · {{ activeTimeLimitLabel }}</strong>
              </span>
              <span class="quiz-workspace__summary-chip">
                <span class="quiz-workspace__summary-chip-label">规则</span>
                <strong class="quiz-workspace__summary-chip-value">{{ activeDifficultyLabel }} · 每题 {{ activePointsPerCorrectValue }} 分</strong>
              </span>
            </div>
          </div>

          <div class="quiz-workspace__summary-actions">
            <div class="quiz-workspace__control quiz-workspace__control--actions">
              <div class="quiz-workspace__control-copy">
                <p class="quiz-workspace__control-label">操作</p>
              </div>
              <div class="quiz-workspace__control-actions">
                <button
                  v-if="isChallengeMode"
                  class="btn-cartoon btn-cartoon--pink"
                  type="button"
                  @click="openChallengeView"
                >
                  返回地图
                </button>
                <button class="btn-cartoon" type="button" @click="openQuizSettings">
                  {{ settingsButtonText }}
                </button>

                <button
                  :class="refreshButtonClass"
                  type="button"
                  :disabled="isLoading"
                  @click="loadQuestions"
                >
                  {{ refreshButtonText }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div class="quiz-workspace__content">
          <section v-if="showQuizStateCard" :class="['app-state-card', `app-state-card--${quizStateTone}`]">
            <div class="app-state-card__shell">
              <div class="app-state-card__copy">
                <div class="app-state-card__topline">
                  <p class="app-state-card__eyebrow">{{ quizStateEyebrow }}</p>
                  <span class="app-state-card__state">{{ quizStateLabel }}</span>
                </div>
                <h2 class="app-state-card__title">{{ quizStateTitle }}</h2>
                <p class="app-state-card__text">{{ quizStateText }}</p>
              </div>

              <div class="app-state-card__stats">
                <div
                  v-for="item in quizStateStats"
                  :key="item.label"
                  class="app-state-card__stat"
                >
                  <span class="app-state-card__stat-label">{{ item.label }}</span>
                  <strong class="app-state-card__stat-value">{{ item.value }}</strong>
                </div>
              </div>

              <p class="app-state-card__hint">{{ quizStateHint }}</p>

              <div v-if="!isLoading" class="app-state-card__actions">
                <button
                  v-if="errorMessage"
                  class="btn-cartoon btn-cartoon--pink"
                  type="button"
                  @click="loadQuestions"
                >
                  重新加载
                </button>
                <button
                  v-if="shouldShowQuizSettingsButton"
                  class="btn-cartoon btn-cartoon--yellow"
                  type="button"
                  @click="openQuizSettings"
                >
                  {{ settingsButtonText }}
                </button>
                <button
                  class="btn-cartoon btn-cartoon--mint"
                  type="button"
                  @click="openImportView"
                >
                  去导入题库
                </button>
                <button
                  class="btn-cartoon"
                  type="button"
                  @click="openHomeView"
                >
                  返回首页
                </button>
              </div>
            </div>
          </section>

          <QuizView
            v-else
            :questions="questions"
            :question-time-limit-seconds="activeTimeLimitSecondsValue"
            :points-per-correct="activePointsPerCorrectValue"
            :play-mode="playMode"
            :stage-title="isChallengeMode ? currentStage.title : ''"
            :challenge-stage="isChallengeMode ? currentStage : null"
            :challenge-result="latestChallengeOutcome"
            @question-resolved="handleQuizQuestionResolved"
            @finished="handleQuizFinished"
            @restart="handleQuizRestart"
            @next-stage="handleNextStage"
            @open-wrong-review="openWrongBookView"
            @practice-knowledge="startKnowledgeTagPractice"
          />
        </div>
      </section>
    </main>

    <QuizSettingsModal
      v-model="isQuizSettingsOpen"
      v-model:selected-subject="draftSelectedSubject"
      v-model:selected-grade="draftSelectedGrade"
      v-model:selected-semester="draftSelectedSemester"
      v-model:selected-question-count="draftSelectedQuestionCount"
      v-model:selected-difficulty="draftSelectedDifficulty"
      v-model:selected-time-limit-seconds="draftSelectedTimeLimitSeconds"
      v-model:selected-points-per-correct="draftSelectedPointsPerCorrect"
      :heading-description="quizSettingsHeadingDescription"
      :is-challenge-mode="isChallengeMode"
      :current-stage="currentStage"
      :draft-should-show-semester-filter="draftShouldShowSemesterFilter"
      :has-pending-quiz-settings-changes="hasPendingQuizSettingsChanges"
      :is-using-default-draft-quiz-settings="isUsingDefaultDraftQuizSettings"
      :subject-options="SUBJECT_OPTIONS"
      :grade-options="GRADE_OPTIONS"
      :semester-options="SEMESTER_OPTIONS"
      :question-count-options="QUESTION_COUNT_OPTIONS"
      :difficulty-options="DIFFICULTY_OPTIONS"
      :time-limit-options="TIME_LIMIT_OPTIONS"
      :score-options="SCORE_OPTIONS"
      :get-difficulty-label="getDifficultyLabel"
      @grade-change="handleDraftGradeChange"
      @apply="applyDraftQuizSettings"
      @reset="resetDraftQuizSettings"
    />
  </div>
</template>
