<script setup>
import { computed, ref } from "vue";
import HomeAdventureCard from "../components/HomeAdventureCard.vue";
import HomeDailyChest from "../components/HomeDailyChest.vue";
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
  },
  isDailyChestClaiming: {
    type: Boolean,
    default: false
  },
  dailyChestErrorMessage: {
    type: String,
    default: ""
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
  "open-backpack",
  "open-entry",
  "claim-daily-chest"
]);

const isWeakPointPickerOpen = ref(false);
// 宝箱卡的原生 DOM 引用：由父组件负责滚动，HomeDailyTasks 只发信号、不查 DOM。
const chestSectionRef = ref(null);

const greeting = computed(() => props.homeDashboard.greeting || {});
const adventure = computed(() => props.homeDashboard.adventure || {});
const weakPoint = computed(() => props.homeDashboard.weakPoint || {});
const teacherTips = computed(() => props.homeDashboard.teacherTips || []);
const dailyTasks = computed(() => props.homeDashboard.dailyTasks || []);
const dailyChest = computed(() => props.homeDashboard.dailyChest || {});
const exploreItems = computed(() => props.homeDashboard.exploreItems || []);
const practiceScope = computed(() => props.homeDashboard.practiceScope || []);

// 3/3 且今天还没领 → 今日小任务标题区出现「宝箱可以打开啦」入口。
const isChestReady = computed(() => Boolean(dailyChest.value.canClaim));

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// 只有孩子点了「宝箱可以打开啦」才滚动，不自动抢视野；reduced motion 下不做平滑滚动。
function handleFocusChest() {
  const chestElement = chestSectionRef.value;

  if (!chestElement || typeof chestElement.scrollIntoView !== "function") {
    return;
  }

  chestElement.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "center"
  });
}

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
      <div class="home-board__stack">
        <HomeDailyTasks
          :tasks="dailyTasks"
          :is-chest-ready="isChestReady"
          @select-task="handleTaskSelect"
          @focus-chest="handleFocusChest"
        />

        <!-- 今日宝箱跟在今日小任务下方：3/3 才解锁，每个自然日只能领一次。
             ref 只用来在“宝箱可以打开啦”被点击时把这张卡滚进视野。 -->
        <div ref="chestSectionRef" class="home-board__chest-anchor">
          <HomeDailyChest
            :chest="dailyChest"
            :is-claiming="props.isDailyChestClaiming"
            :error-message="props.dailyChestErrorMessage"
            @claim="emit('claim-daily-chest')"
            @open-collection="emit('open-backpack')"
          />
        </div>
      </div>

      <HomeGrowthSummary
        :growth="props.homeDashboard.growth"
        :growth-book-entry="props.homeDashboard.growthBookEntry"
        :growth-plans-entry="props.homeDashboard.growthPlansEntry"
        :milestone-entry="props.homeDashboard.milestoneEntry"
        @open-backpack="emit('open-backpack')"
        @open-entry="emit('open-entry', $event)"
      />
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

/* 今日小任务和我的成长是一组“今天的状态”，宽屏并排，窄屏落回单列。
   断点取 920px：1024×800 的学生笔记本仍是双列（实测无文字挤压、无横向溢出），
   920 以下才落单列，720 以下继续沿用移动端阅读顺序。 */
.home-board__support {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 0.72fr);
  gap: 14px;
  align-items: start;
}

/* 今日宝箱紧跟在今日小任务下面，两者共用一个窄列。 */
.home-board__stack {
  display: grid;
  gap: 14px;
  align-content: start;
}

/* 宝箱卡的外层锚点：只用于 scrollIntoView，不参与视觉。 */
.home-board__chest-anchor {
  display: grid;
  scroll-margin-block: 16px;
}

@media (max-width: 920px) {
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

  .home-board__stack {
    gap: 12px;
  }
}
</style>
