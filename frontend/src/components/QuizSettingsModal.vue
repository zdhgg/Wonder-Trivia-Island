<script setup>
import { computed } from "vue";
import ModalDialog from "./ModalDialog.vue";

const isOpen = defineModel({ default: false });
const selectedSubject = defineModel("selectedSubject", { default: "全部学科" });
const selectedGrade = defineModel("selectedGrade", { default: "全部年级" });
const selectedSemester = defineModel("selectedSemester", { default: "全部学期" });
const selectedQuestionCount = defineModel("selectedQuestionCount", { default: "3" });
const selectedDifficulty = defineModel("selectedDifficulty", { default: "" });
const selectedTimeLimitSeconds = defineModel("selectedTimeLimitSeconds", { default: "0" });
const selectedPointsPerCorrect = defineModel("selectedPointsPerCorrect", { default: "10" });

const props = defineProps({
  headingDescription: {
    type: String,
    default: ""
  },
  isChallengeMode: {
    type: Boolean,
    default: false
  },
  currentStage: {
    type: Object,
    required: true
  },
  draftShouldShowSemesterFilter: {
    type: Boolean,
    default: false
  },
  hasPendingQuizSettingsChanges: {
    type: Boolean,
    default: false
  },
  isUsingDefaultDraftQuizSettings: {
    type: Boolean,
    default: false
  },
  subjectOptions: {
    type: Array,
    default: () => []
  },
  gradeOptions: {
    type: Array,
    default: () => []
  },
  semesterOptions: {
    type: Array,
    default: () => []
  },
  questionCountOptions: {
    type: Array,
    default: () => []
  },
  difficultyOptions: {
    type: Array,
    default: () => []
  },
  timeLimitOptions: {
    type: Array,
    default: () => []
  },
  scoreOptions: {
    type: Array,
    default: () => []
  },
  getDifficultyLabel: {
    type: Function,
    required: true
  }
});

defineEmits(["grade-change", "apply", "reset"]);

const scopeSummaryItems = computed(() => [
  selectedSubject.value,
  selectedGrade.value,
  ...(props.draftShouldShowSemesterFilter ? [selectedSemester.value] : [])
]);
const stageQuestionCountLabel = computed(() => `${props.currentStage.questionCount} 题`);
const stageDifficultyLabel = computed(() => props.getDifficultyLabel(props.currentStage.difficulty));
const stageTimeLimitLabel = computed(() =>
  props.currentStage.timeLimitSeconds === 0 ? "不限时" : `每题 ${props.currentStage.timeLimitSeconds} 秒`
);
const stagePointsLabel = computed(() => `每题 ${props.currentStage.pointsPerCorrect} 分`);
const activeRuleSummaryItems = computed(() =>
  props.isChallengeMode
    ? [stageQuestionCountLabel.value, stageDifficultyLabel.value, stageTimeLimitLabel.value, stagePointsLabel.value]
    : [
        `${selectedQuestionCount.value} 题`,
        props.getDifficultyLabel(selectedDifficulty.value),
        selectedTimeLimitSeconds.value === "0" ? "不限时" : `每题 ${selectedTimeLimitSeconds.value} 秒`,
        `每题 ${selectedPointsPerCorrect.value} 分`
      ]
);
const lockedRuleItems = computed(() => [
  {
    label: "题数",
    value: stageQuestionCountLabel.value
  },
  {
    label: "难度",
    value: stageDifficultyLabel.value
  },
  {
    label: "限时",
    value: stageTimeLimitLabel.value
  },
  {
    label: "分值",
    value: stagePointsLabel.value
  }
]);
const draftStatusLabel = computed(() => {
  if (props.hasPendingQuizSettingsChanges) {
    return "有待应用的改动";
  }

  if (props.isUsingDefaultDraftQuizSettings) {
    return "当前草稿是默认配置";
  }

  return props.isChallengeMode ? "当前草稿已对齐关卡规则" : "当前草稿已同步到最近一次设置";
});
</script>

<template>
  <ModalDialog
    v-model="isOpen"
    title-id="quiz-settings-title"
    heading-eyebrow="Quiz Setup"
    heading-title="出题设置"
    :heading-description="headingDescription"
    close-label="关闭出题设置"
    panel-class="quiz-settings-modal__dialog"
    initial-focus-selector="[data-modal-primary]"
  >
    <div class="quiz-settings-panel">
      <div class="quiz-settings-panel__hero">
        <div class="quiz-settings-panel__hero-copy">
          <p class="quiz-settings-panel__hero-eyebrow">Draft Setup</p>
          <h3 class="quiz-settings-panel__hero-title">
            {{ isChallengeMode ? currentStage.title : "调整当前出题范围" }}
          </h3>
          <p class="quiz-settings-panel__hero-text">
            {{
              isChallengeMode
                ? "挑战闯关下，题数、难度、限时和分值由当前关卡决定；学科可调，但当前章节年级会锁定。"
                : "先调整题库范围和出题规则，再统一应用到当前答题页。"
            }}
          </p>
        </div>

        <div class="quiz-settings-panel__hero-grid">
          <section class="quiz-settings-panel__summary-block">
            <span class="quiz-settings-panel__summary-label">题库范围</span>
            <strong class="quiz-settings-panel__summary-value">当前会从这些题目里抽题</strong>
            <div class="quiz-settings-panel__summary">
              <span v-for="item in scopeSummaryItems" :key="item" class="quiz-settings-panel__summary-chip">
                {{ item }}
              </span>
            </div>
          </section>

          <section class="quiz-settings-panel__summary-block">
            <span class="quiz-settings-panel__summary-label">出题规则</span>
            <strong class="quiz-settings-panel__summary-value">
              {{ isChallengeMode ? "当前关卡规则已锁定" : draftStatusLabel }}
            </strong>
            <div class="quiz-settings-panel__summary">
              <span v-for="item in activeRuleSummaryItems" :key="item" class="quiz-settings-panel__summary-chip">
                {{ item }}
              </span>
              <span v-if="isChallengeMode" class="quiz-settings-panel__summary-chip">关卡规则已锁定</span>
            </div>
          </section>
        </div>
      </div>

      <div class="quiz-settings-panel__sections">
        <section class="quiz-settings-panel__section">
          <div class="quiz-settings-panel__section-head">
            <div>
              <p class="quiz-settings-panel__section-eyebrow">Question Pool</p>
              <h4 class="quiz-settings-panel__section-title">题库范围</h4>
            </div>
            <p class="quiz-settings-panel__section-note">决定从哪些学科、年级和学期中抽题。</p>
          </div>

          <div class="quiz-settings-panel__grid quiz-settings-panel__grid--scope">
            <label class="quiz-settings-panel__field">
              <span class="quiz-settings-panel__label">学科</span>
              <select
                v-model="selectedSubject"
                data-modal-primary
                class="quiz-toolbar__select"
              >
                <option v-for="subject in subjectOptions" :key="subject" :value="subject">
                  {{ subject }}
                </option>
              </select>
            </label>

            <label class="quiz-settings-panel__field">
              <span class="quiz-settings-panel__label">年级</span>
              <select
                v-model="selectedGrade"
                class="quiz-toolbar__select"
                :disabled="isChallengeMode"
                @change="$emit('grade-change')"
              >
                <option v-for="grade in gradeOptions" :key="grade" :value="grade">
                  {{ grade }}
                </option>
              </select>
            </label>

            <label v-if="draftShouldShowSemesterFilter" class="quiz-settings-panel__field">
              <span class="quiz-settings-panel__label">学期</span>
              <select v-model="selectedSemester" class="quiz-toolbar__select" :disabled="isChallengeMode">
                <option v-for="semester in semesterOptions" :key="semester" :value="semester">
                  {{ semester }}
                </option>
              </select>
            </label>
          </div>
        </section>

        <section class="quiz-settings-panel__section">
          <div class="quiz-settings-panel__section-head">
            <div>
              <p class="quiz-settings-panel__section-eyebrow">Question Rules</p>
              <h4 class="quiz-settings-panel__section-title">出题规则</h4>
            </div>
            <p class="quiz-settings-panel__section-note">
              {{ isChallengeMode ? "挑战模式下这部分会跟随关卡。" : "这些设置会直接影响当前这轮答题节奏。" }}
            </p>
          </div>

          <div v-if="isChallengeMode" class="quiz-settings-panel__locked-grid">
            <div v-for="item in lockedRuleItems" :key="item.label" class="quiz-settings-panel__locked-item">
              <span class="quiz-settings-panel__locked-label">{{ item.label }}</span>
              <strong class="quiz-settings-panel__locked-value">{{ item.value }}</strong>
            </div>
          </div>

          <div v-else class="quiz-settings-panel__grid quiz-settings-panel__grid--rules">
            <label class="quiz-settings-panel__field">
              <span class="quiz-settings-panel__label">题数</span>
              <select v-model="selectedQuestionCount" class="quiz-toolbar__select">
                <option v-for="option in questionCountOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="quiz-settings-panel__field">
              <span class="quiz-settings-panel__label">难度</span>
              <select v-model="selectedDifficulty" class="quiz-toolbar__select">
                <option v-for="option in difficultyOptions" :key="option.label" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="quiz-settings-panel__field">
              <span class="quiz-settings-panel__label">限时</span>
              <select v-model="selectedTimeLimitSeconds" class="quiz-toolbar__select">
                <option v-for="option in timeLimitOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="quiz-settings-panel__field">
              <span class="quiz-settings-panel__label">分值</span>
              <select v-model="selectedPointsPerCorrect" class="quiz-toolbar__select">
                <option v-for="option in scoreOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <div class="quiz-settings-panel__footer">
        <p class="quiz-settings-panel__footnote">
          {{
            isChallengeMode
              ? "挑战闯关只会应用学科、年级和学期范围，题数、难度、限时和分值由当前关卡决定。"
              : "只有点击“应用设置”才会切换当前出题条件。"
          }}
        </p>

        <div class="quiz-settings-panel__actions">
          <button
            class="btn-cartoon btn-cartoon--mint"
            type="button"
            :disabled="!hasPendingQuizSettingsChanges"
            @click="$emit('apply')"
          >
            应用设置
          </button>

          <button
            class="btn-cartoon btn-cartoon--yellow"
            type="button"
            :disabled="isUsingDefaultDraftQuizSettings"
            @click="$emit('reset')"
          >
            恢复默认
          </button>
        </div>
      </div>
    </div>
  </ModalDialog>
</template>
