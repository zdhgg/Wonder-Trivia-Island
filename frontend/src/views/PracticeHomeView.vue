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
import { usePageEntryCue } from "../composables/usePageEntryCue";

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
  "open-island",
  "claim-daily-chest"
]);

const isWeakPointPickerOpen = ref(false);
const { playPageEntryCue } = usePageEntryCue();

// 这一页所有"进入另一个页面"的入口都在这里过一道，统一响一次轻短音效。
//
// 用一个 helper 收口，而不是每个 emit 上各写一遍，有两个实在的好处：
//   - 一次点击只可能响一次。HomeDailyTasks / HomeGrowthSummary / HomeExploreGrid
//     这些子组件都只是把点击往上抛，声音只有这一处负责，不会出现两层各响一声。
//   - 哪几个入口响、哪几个不响，一眼能在这个文件里数清楚，不用去每个子组件里找。
//
// "该不该响"（设备支不支持、音效通道有没有音量）由 usePageEntryCue 统一回答，
// 这一页不自己判断 —— 否则就会和 App.vue 里那些二级页面的入口出现两套静音判定。
//
// 不响的按钮是有意排除的：领取今日宝箱（是领奖励，不是进页面）、
// 教师建议（是提示，不是入口），以及本文件里所有非点击元素。
function cuePageEntry() {
  void playPageEntryCue();
}

const greeting = computed(() => props.homeDashboard.greeting || {});
const adventure = computed(() => props.homeDashboard.adventure || {});
const weakPoint = computed(() => props.homeDashboard.weakPoint || {});
const teacherTips = computed(() => props.homeDashboard.teacherTips || []);
const dailyTasks = computed(() => props.homeDashboard.dailyTasks || []);
const dailyChest = computed(() => props.homeDashboard.dailyChest || {});
const exploreItems = computed(() => props.homeDashboard.exploreItems || []);
const practiceScope = computed(() => props.homeDashboard.practiceScope || []);

// 专项强化面板只认纯年级：gradeLabel 是“三年级 · 上册”，不能当年级传进弹窗。
const weakPointPickerGrade = computed(() => String(weakPoint.value.grade || "").trim());
const weakPointPreferredGrade = computed(() => String(weakPoint.value.preferredGrade || "").trim());
const isWeakPointPreparing = computed(() => weakPoint.value.status === "preparing");

// 整章通关后 CTA 换成“回到大地图看看”，不能再打开最后一关。
const isChapterComplete = computed(() => Boolean(adventure.value.isChapterComplete));

function handleAdventureContinue() {
  cuePageEntry();

  if (isChapterComplete.value) {
    emit("open-challenge-world");
    return;
  }

  emit("start-challenge");
}

// 打开专项强化的选择弹窗。刻意不在这里响音效：
// 它被自由探索入口和教师建议共用，而两者的取舍不同 ——
// 前者是页面入口（声音已经在 handleExploreSelect 里响过了），
// 后者不是入口（有意不响）。所以声音留在调用方，这里只管开弹窗。
function openWeakPointPicker() {
  isWeakPointPickerOpen.value = true;
}

function handleWeakPointPractice(payload) {
  cuePageEntry();
  emit("start-weak-point-practice", payload);
}

function handleTaskSelect(task) {
  // 三个任务都是"点了就进另一个页面"，所以在这里统一响一次。
  cuePageEntry();

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
  // 自由探索的 4 个入口同样都是进页面。
  // 注意「随便练」不会走到这里：HomeExploreGrid 自己先展开选择面板再决定，
  // 所以这里响一次之后，面板里再选一种练法还会再响一次 —— 那是一次新的点击。
  cuePageEntry();

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

// 「我的成长」里那三行入口：收藏册、知识岛、成长记录/成长计划。
// 它们原本是模板里直接 emit 的，这里补一层只是为了让声音有唯一落点。
function handleOpenBackpack() {
  cuePageEntry();
  emit("open-backpack");
}

function handleOpenIsland() {
  cuePageEntry();
  emit("open-island");
}

function handleOpenGrowthEntry(entryId) {
  cuePageEntry();
  emit("open-entry", entryId);
}

// 「随便练」展开后的三种练法：各自都是一次独立的点击、一次独立的进页面。
function handlePracticeScopeSelect(optionId) {
  cuePageEntry();

  if (optionId === "grade-practice") {
    emit("start-grade-practice");
    return;
  }

  if (optionId === "subject-practice") {
    emit("start-subject-practice");
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
          @select-task="handleTaskSelect"
        >
          <!-- 今日宝箱跟着今日小任务走：放在任务列表上方的一条奖励状态条，
               3/3 才解锁，每个自然日只能领一次。 -->
          <template #chest>
            <HomeDailyChest
              :chest="dailyChest"
              :is-claiming="props.isDailyChestClaiming"
              :error-message="props.dailyChestErrorMessage"
              @claim="emit('claim-daily-chest')"
              @open-collection="emit('open-backpack')"
            />
          </template>
        </HomeDailyTasks>
      </div>

      <HomeGrowthSummary
        :growth="props.homeDashboard.growth"
        :growth-book-entry="props.homeDashboard.growthBookEntry"
        :growth-plans-entry="props.homeDashboard.growthPlansEntry"
        :milestone-entry="props.homeDashboard.milestoneEntry"
        @open-backpack="handleOpenBackpack"
        @open-entry="handleOpenGrowthEntry"
        @open-island="handleOpenIsland"
      />
    </div>

    <HomeTeacherTips :tips="teacherTips" @select-tip="handleTeacherTip" />

    <HomeExploreGrid
      :items="exploreItems"
      :practice-scope="practiceScope"
      @select-item="handleExploreSelect"
      @start-grade-practice="handlePracticeScopeSelect('grade-practice')"
      @start-subject-practice="handlePracticeScopeSelect('subject-practice')"
      @start-free-practice="handlePracticeScopeSelect('free-practice')"
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

/* 今日小任务 + 今日宝箱共用一个窄列（宝箱是任务卡里面的奖励状态条）。 */
.home-board__stack {
  display: grid;
  gap: 14px;
  align-content: start;
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
