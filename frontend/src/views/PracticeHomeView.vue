<script setup>
import { computed, ref } from "vue";
import HomeAdventureCard from "../components/HomeAdventureCard.vue";
import HomeDailyTasks from "../components/HomeDailyTasks.vue";
import HomeExploreGrid from "../components/HomeExploreGrid.vue";
import HomeGrowthSummary from "../components/HomeGrowthSummary.vue";
import HomeTeacherTips from "../components/HomeTeacherTips.vue";
import HomeWelcomePanel from "../components/HomeWelcomePanel.vue";
import WeakPointPickerDialog from "../components/study/WeakPointPickerDialog.vue";

// 首页只负责把聚合好的 ViewModel 铺开，业务判断都在 utils/homeDashboard.js 和 useTriviaApp 里。
const gradePracticeGrade = defineModel("gradePracticeGrade", { default: "三年级" });
const gradePracticeSemester = defineModel("gradePracticeSemester", { default: "上册" });
const challengeGrade = defineModel("challengeGrade", { default: "三年级" });
const challengeSemester = defineModel("challengeSemester", { default: "上册" });
const subjectPracticeSubject = defineModel("subjectPracticeSubject", { default: "数学" });
const subjectPracticeGrade = defineModel("subjectPracticeGrade", { default: "全部年级" });
const subjectPracticeSemester = defineModel("subjectPracticeSemester", { default: "上册" });

const props = defineProps({
  homeDashboard: {
    type: Object,
    required: true
  },
  isChallengeLoading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  "start-challenge",
  "open-challenge-world",
  "start-grade-practice",
  "start-subject-practice",
  "start-free-practice",
  "open-knowledge-study",
  "open-wrong-review",
  "start-weak-point-practice",
  "open-backpack"
]);

const isWeakPointPickerOpen = ref(false);

const greeting = computed(() => props.homeDashboard.greeting || {});
const adventure = computed(() => props.homeDashboard.adventure || {});
const weakPoint = computed(() => props.homeDashboard.weakPoint || {});
const teacherTips = computed(() => props.homeDashboard.teacherTips || []);
const dailyTasks = computed(() => props.homeDashboard.dailyTasks || []);
const exploreItems = computed(() => props.homeDashboard.exploreItems || []);
const practiceScope = computed(() => props.homeDashboard.practiceScope || []);

// 专项强化面板只认纯年级：gradeLabel 是“三年级 · 上册”，不能当年级传进弹窗。
const weakPointPickerGrade = computed(() => String(weakPoint.value.grade || "").trim());
const weakPointPreferredGrade = computed(() => String(weakPoint.value.preferredGrade || "").trim());
const isWeakPointPreparing = computed(() => weakPoint.value.status === "preparing");

// 整章通关后 CTA 换成“回到大地图看看”，不能再打开最后一关。
const isChapterComplete = computed(() => Boolean(adventure.value.isChapterComplete));

function handleAdventureContinue() {
  if (isChapterComplete.value) {
    emit("open-challenge-world");
    return;
  }

  emit("start-challenge");
}

function openWeakPointPicker() {
  isWeakPointPickerOpen.value = true;
}

function handleWeakPointPractice(payload) {
  emit("start-weak-point-practice", payload);
}

function handleTaskSelect(task) {
  if (task?.id === "review") {
    emit("open-wrong-review");
    return;
  }

  if (task?.id === "study") {
    emit("open-knowledge-study");
    return;
  }

  emit("start-challenge");
}

function handleExploreSelect(item) {
  if (item?.target === "knowledge-study") {
    emit("open-knowledge-study");
    return;
  }

  if (item?.target === "wrong-review") {
    emit("open-wrong-review");
    return;
  }

  if (item?.target === "weak-point") {
    openWeakPointPicker();
    return;
  }

  emit("start-free-practice");
}

function handleTeacherTip(tip) {
  if (tip?.target === "wrong-review") {
    emit("open-wrong-review");
    return;
  }

  if (tip?.target === "knowledge-study") {
    emit("open-knowledge-study");
    return;
  }

  openWeakPointPicker();
}
</script>

<template>
  <section class="home-board">
    <HomeWelcomePanel
      :eyebrow="greeting.eyebrow"
      :title="greeting.title"
      :profile-chip="greeting.profileChip"
      :theme-tone="greeting.themeTone"
      :summary="greeting.summary"
      :summary-source="greeting.summarySource"
    />

    <HomeAdventureCard
      :adventure="adventure"
      :is-disabled="props.isChallengeLoading"
      @continue="handleAdventureContinue"
    />

    <div class="home-board__support">
      <HomeDailyTasks :tasks="dailyTasks" @select-task="handleTaskSelect" />

      <HomeGrowthSummary :growth="props.homeDashboard.growth" @open-backpack="emit('open-backpack')" />
    </div>

    <HomeTeacherTips :tips="teacherTips" @select-tip="handleTeacherTip" />

    <HomeExploreGrid
      :items="exploreItems"
      :practice-scope="practiceScope"
      @select-item="handleExploreSelect"
      @start-grade-practice="emit('start-grade-practice')"
      @start-subject-practice="emit('start-subject-practice')"
      @start-free-practice="emit('start-free-practice')"
    />
  </section>

  <WeakPointPickerDialog
    v-model="isWeakPointPickerOpen"
    :default-grade="weakPointPickerGrade"
    :preferred-grade="weakPointPreferredGrade"
    :is-preparing-for-preferred-grade="isWeakPointPreparing"
    @start-practice="handleWeakPointPractice"
  />
</template>

<style scoped>
:deep(.weak-point-modal) {
  width: min(760px, 100%);
}

.home-board {
  display: grid;
  gap: 14px;
  align-content: start;
  padding-bottom: 8px;
}

/* 今日小任务和我的成长是一组“今天的状态”，宽屏并排，窄屏落回单列。 */
.home-board__support {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 0.72fr);
  gap: 14px;
  align-items: start;
}

@media (max-width: 1040px) {
  .home-board__support {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .home-board {
    gap: 12px;
  }

  .home-board__support {
    gap: 12px;
  }
}
</style>
