<script>
import { computed, defineAsyncComponent } from "vue";
import PracticeHomeView from "./views/PracticeHomeView.vue";
import { useSettingsCenter } from "./composables/useSettingsCenter";
import { useToolsCenter } from "./composables/useToolsCenter";
import { useTriviaApp } from "./composables/useTriviaApp";
import { useQuizStore } from "./stores/useQuizStore";
import { useAudioStore } from "./stores/useAudioStore";

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

    const quizStore = useQuizStore();
    const isQuizActive = computed(() => {
      return app.currentView.value === app.VIEW_MODE.QUIZ &&
             app.questions.value.length > 0 &&
             quizStore.currentQuestionIndex < app.questions.value.length;
    });

    const audioStore = useAudioStore();
    const isMuted = computed(() => {
      return audioStore.masterVolume <= 0 || (!audioStore.musicEnabled && !audioStore.sfxEnabled);
    });

    const globalStarsEarned = computed(() => {
      if (!app.challengeWorldData.value) return 0;
      return app.challengeWorldData.value.reduce((sum, chapter) => sum + (chapter.starsEarned || 0), 0);
    });

    async function toggleGlobalMute() {
      const currentlyMuted = isMuted.value;
      if (currentlyMuted) {
        audioStore.setMasterVolume(1);
        audioStore.setMusicEnabled(true);
        audioStore.setSfxEnabled(true);
        if (typeof app.ensureAudioReady === "function") {
          await app.ensureAudioReady();
        }
      } else {
        audioStore.setMasterVolume(0);
        audioStore.setMusicEnabled(false);
        audioStore.setSfxEnabled(false);
      }
    }

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
      isQuizActive,
      isMuted,
      globalStarsEarned,
      toggleGlobalMute,
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
          <!-- 🔊 Persistent Voice/Audio Controller 🔊 -->
          <button
            :class="['site-nav__quick-button', 'site-nav__quick-button--audio', { 'site-nav__quick-button--muted': isMuted }]"
            type="button"
            :title="isMuted ? '开启声音' : '静音'"
            @click="toggleGlobalMute"
          >
            {{ isMuted ? "🔇 静音" : "🔊 声音" }}
          </button>

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

      <section v-else-if="currentView === VIEW_MODE.CHALLENGE_WORLD" class="challenge-panel challenge-world-map">
        <!-- 🧭 Top World Toolbar -->
        <div class="challenge-route__header-toolbar">
          <div class="challenge-route__title-group">
            <span class="challenge-route__badge-tag" style="background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);">🗺️ 大世界</span>
            <h3 class="challenge-route__adventure-title">奇妙世界大地图</h3>
          </div>

          <div class="challenge-route__actions-group">
            <button class="btn-cartoon btn-cartoon--settings-float" type="button" @click="openSettingsView">
              ⚙️ 系统设置
            </button>
          </div>
        </div>

        <section class="challenge-world__continents">
          <article
            v-for="chapter in challengeWorldData"
            :key="chapter.id"
            class="challenge-world-card"
            @click="openChallengeView({ nextChallengeChapterId: chapter.id })"
          >
            <div class="challenge-world-card__icon">{{ chapter.emoji || '🏝️' }}</div>
            <div class="challenge-world-card__content">
              <h4 class="challenge-world-card__title">
                <span class="challenge-world-card__island-name">{{ chapter.islandName || '未知岛' }}</span>
                <span class="challenge-world-card__theme-title">{{ chapter.themeTitle || '未知区' }}</span>
              </h4>
              <div class="challenge-world-card__grade-tag">{{ chapter.grade }} · {{ chapter.semester }}</div>
              <div class="challenge-world-card__stats">
                <span class="challenge-world-card__progress">🌟 {{ chapter.starsEarned }} / {{ chapter.totalStars }}</span>
              </div>
              <div class="challenge-world-card__progress-bar">
                <div class="challenge-world-card__progress-fill" :style="{ width: chapter.progressPercent + '%' }"></div>
              </div>
            </div>
          </article>
        </section>
      </section>

      <section v-else-if="currentView === VIEW_MODE.CHALLENGE" class="challenge-panel challenge-map">
        <!-- 🧭 Top Adventure Toolbar -->
        <div class="challenge-route__header-toolbar">
          <div class="challenge-route__title-group">
            <button class="btn-cartoon btn-cartoon--ghost btn-cartoon--world-map" type="button" @click="openChallengeWorld" title="返回大地图">
              🗺️ 世界大地图
            </button>
            <span class="challenge-route__badge-tag">🌋 主线探险</span>
            <h3 class="challenge-route__adventure-title">奇妙海岛闯关</h3>
            <span class="challenge-route__grade-badge">{{ homeChallengeGrade }} · {{ homeChallengeSemester }}</span>
          </div>

          <div class="challenge-route__actions-group">
            <button class="btn-cartoon btn-cartoon--settings-float" type="button" @click="openQuizSettings">
              ⚙️ 关卡设置
            </button>
            <button v-if="challengeAchievements.length" class="btn-cartoon btn-cartoon--backpack-float" type="button" @click="openBackpack">
              🎒 我的探险背包
            </button>
          </div>
        </div>

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
            :disabled="isLoading"
            @click="selectChallengeStage(stage.id)"
          >
            <span class="challenge-node__halo" aria-hidden="true"></span>

            <div class="challenge-node__top">
              <span class="challenge-node__index">第 {{ stage.order }} 站</span>
              <div class="challenge-node__top-badges">
                <span :class="['challenge-node__badge', `challenge-node__badge--${stage.stateTone}`]">
                  {{ stage.isUnlocked ? "" : "🔒 " }}{{ stage.stateLabel }}
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

        <!-- 🔒 Locked Stage Modal 🔒 -->
        <div v-if="isLockedStageModalOpen && currentChallengeStage" class="adventure-modal-overlay animate-fade-in" @click.self="closeLockedStageModal">
          <div class="adventure-modal-card adventure-modal-card--cartoon animate-pop-in">
            <button class="adventure-modal-close" type="button" @click="closeLockedStageModal">×</button>
            <div class="adventure-modal-header">
              <span class="adventure-modal-icon">🔒</span>
              <h3 class="adventure-modal-title">这一站被浓雾笼罩着呢！</h3>
            </div>
            <div class="adventure-modal-body">
              <p class="adventure-modal-text">请先通关前面的关卡，这里的神秘面纱就会揭开哦~</p>
              <div class="adventure-modal-info">
                <div class="info-row"><strong>挑战关卡：</strong>第 {{ currentChallengeStage.order }} 关 · {{ currentChallengeStage.title }}</div>
                <div class="info-row"><strong>关卡要求：</strong>{{ currentChallengeStage.questionCount }} 题 · {{ currentChallengeStage.timeLimitLabel }} · 过关线 {{ currentChallengeStage.passAccuracy }}%</div>
                <div class="info-row" v-if="currentChallengeStage.rewardLabel">
                  <strong>通关奖励：</strong><span class="reward-glyph">{{ currentChallengeStage.rewardGlyph }}</span> {{ currentChallengeStage.rewardLabel }}
                </div>
              </div>
            </div>
            <div class="adventure-modal-footer">
              <button class="btn-cartoon btn-cartoon--yellow modal-confirm-btn" type="button" @click="closeLockedStageModal">
                好哒，我去闯关！
              </button>
            </div>
          </div>
        </div>

        <!-- 🎒 Achievements Backpack Modal 🎒 -->
        <div v-if="isBackpackOpen" class="adventure-modal-overlay animate-fade-in" @click.self="closeBackpack">
          <div class="adventure-modal-card adventure-modal-card--cartoon adventure-modal-card--backpack animate-pop-in">
            <button class="adventure-modal-close" type="button" @click="closeBackpack">×</button>
            <div class="adventure-modal-header">
              <span class="adventure-modal-icon">🎒</span>
              <h3 class="adventure-modal-title">我的探险背包</h3>
            </div>
            <div class="adventure-modal-body">
              <!-- Backpack overall progress bar -->
              <div class="backpack-progress-section">
                <div class="progress-info">
                  <strong>海岛总进度：</strong>
                  <span>已解锁 {{ challengeAchievementCount }} / {{ challengeAchievements.length }} 个成就</span>
                </div>
                <div class="progress-bar-container">
                  <div class="progress-bar-fill" :style="{ width: (challengeAchievementCount / challengeAchievements.length * 100) + '%' }"></div>
                </div>
              </div>

              <!-- Achievements Grid -->
              <div class="backpack-achievements-list">
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
              </div>
            </div>
          </div>
        </div>

        <section
          v-if="challengeToast"
          :class="['challenge-toast', `challenge-toast--${challengeToast.tone}`]"
          aria-live="polite"
        >
          <strong class="challenge-toast__title">{{ challengeToast.title }}</strong>
          <p class="challenge-toast__text">{{ challengeToast.text }}</p>
        </section>
      </section>

      <section v-else class="quiz-workspace" :class="{ 'quiz-workspace--active': isQuizActive }">
        <!-- Compact Adventure Bar during active play to reduce clutter and cognitive load -->
        <section v-if="isQuizActive" class="quiz-workspace__adventure-bar">
          <button
            class="btn-cartoon btn-cartoon--pink btn-cartoon--back"
            type="button"
            @click="isChallengeMode ? openChallengeView() : openHomeView()"
          >
            🔙 返回{{ isChallengeMode ? "地图" : "首页" }}
          </button>
          <div class="adventure-bar__title">
            <span class="adventure-bar__icon">🌟</span>
            <strong class="adventure-bar__heading">{{ isChallengeMode ? currentStageLabel : "自由探索挑战" }}</strong>
          </div>
          <div id="adventure-bar-actions" class="adventure-bar__actions">
            <button
              class="btn-cartoon btn-cartoon--mint btn-cartoon--quiet"
              type="button"
              :disabled="isLoading"
              @click="loadQuestions"
            >
              🔄 重开
            </button>
          </div>
        </section>

        <!-- Standard header shown only when quiz is not active (idle, finished, or loading) -->
        <section v-else class="quiz-workspace__summary">
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
            :global-stars-earned="globalStarsEarned"
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
