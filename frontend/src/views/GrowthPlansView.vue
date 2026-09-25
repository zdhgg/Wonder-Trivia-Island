<script setup>
// 下次我们一起做什么（Phase 2D-B1）
//
// 一页里只有两件事：
//   「我们想一起做」——还没发生的清单（可加、可自己写、可拿掉）
//   「已经一起做过」——完成的瞬间就变成纪念册里一条真实足迹，不用再填一遍
//
// 刻意不做成任务系统：没有到期日、没有完成率、没有积分 / 等级 / 排行榜，
// 也没有「今天必须做几件」。做完一件事只是多了一条真实记录。
//
// 数据两条线都由服务端负责：/api/growth-plans（清单）与完成时由服务端写出的
// /api/growth-footprints 记录；页面只负责交互与排版。
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useGrowthPlans } from "../composables/growth/useGrowthPlans.js";
import { APP_ROUTE_NAME } from "../router/routes.js";
import {
  FOOTPRINT_CATEGORIES,
  FOOTPRINT_CATEGORY_IDS,
  FOOTPRINT_TAGS,
  MAX_FOOTPRINT_NOTE_LENGTH,
  getLocalDateKey,
  getFootprintCategoryMeta
} from "../utils/growthFootprints.js";
import {
  GROWTH_ACTIVITY_GROUPS,
  MAX_GROWTH_PLAN_TITLE_LENGTH,
  buildGrowthPlanEmptyText,
  formatActivityMinutes,
  isRecommendationPlanned
} from "../utils/growthActivities.js";

const router = useRouter();
const growthPlans = useGrowthPlans();
const {
  plans,
  isEmpty,
  plannedSourceIds,
  isLoading,
  isSaving,
  isCompleting,
  errorMessage,
  completionIssues,
  load,
  addPlan,
  removePlan,
  completePlan,
  clearCompletionIssues,
  clearErrorMessage
} = growthPlans;

const activeGroupId = ref(GROWTH_ACTIVITY_GROUPS[0]?.id ?? "");
const isCustomFormOpen = ref(false);
const customDraft = ref(createEmptyCustomDraft());
const customIssues = ref([]);
const customTitleRef = ref(null);

// 正在「完成啦」的那一条；null = 没打开完成表单。
const completingPlan = ref(null);
const completionDraft = ref(createEmptyCompletionDraft());
const completionNoteRef = ref(null);
const completionAnchorRef = ref(null);
// 刚收进纪念册的那一条：完成表单会关掉，但需要告诉人去哪儿找它。
const justCompletedPlan = ref(null);

const todayDateKey = getLocalDateKey();
const noteLimit = MAX_FOOTPRINT_NOTE_LENGTH;
const planTitleLimit = MAX_GROWTH_PLAN_TITLE_LENGTH;
const activeGroup = computed(
  () => GROWTH_ACTIVITY_GROUPS.find((group) => group.id === activeGroupId.value) ?? GROWTH_ACTIVITY_GROUPS[0]
);
const completionNoteLength = computed(() => String(completionDraft.value.note ?? "").trim().length);
const completionDateIssue = computed(() => issueMessageFor(completionIssues.value, "occurredOn"));
const completionTitleIssue = computed(() => issueMessageFor(completionIssues.value, "title"));
const completionNoteIssue = computed(() => issueMessageFor(completionIssues.value, "note"));
const completionTagsIssue = computed(() => issueMessageFor(completionIssues.value, "tags"));
const customTitleIssue = computed(() => issueMessageFor(customIssues.value, "title"));
const customCategoryIssue = computed(() => issueMessageFor(customIssues.value, "category"));

let abortController = null;

function issueMessageFor(issues, field) {
  return [...(Array.isArray(issues) ? issues : [])].find((issue) => issue.field === field)?.message || "";
}

function createEmptyCustomDraft() {
  return {
    title: "",
    category: FOOTPRINT_CATEGORY_IDS[0],
    note: ""
  };
}

function createEmptyCompletionDraft(plan = null) {
  return {
    occurredOn: getLocalDateKey(),
    category: plan?.category && FOOTPRINT_CATEGORY_IDS.includes(plan.category) ? plan.category : FOOTPRINT_CATEGORY_IDS[0],
    note: "",
    tags: []
  };
}

function categoryLabelFor(plan) {
  return getFootprintCategoryMeta(plan?.category).displayLabel;
}

function durationLabelFor(plan) {
  return formatActivityMinutes(plan?.durationMinutes);
}

function isPlanned(activityId) {
  return isRecommendationPlanned(activityId, plans.value);
}

async function addFromRecommendation(activity) {
  if (isSaving.value || isPlanned(activity.id)) {
    return;
  }

  // 嵌套在分组里的 activity 本身不带 category，组级字段由当前分组给出。
  await addPlan({
    sourceId: activity.id,
    title: activity.title,
    note: activity.summary,
    category: activity.category ?? activeGroup.value.category,
    durationMinutes: activity.minutes
  });
}

async function openCustomForm() {
  customDraft.value = createEmptyCustomDraft();
  customIssues.value = [];
  isCustomFormOpen.value = true;

  await nextTick();
  customTitleRef.value?.focus?.();
}

function closeCustomForm() {
  isCustomFormOpen.value = false;
  customDraft.value = createEmptyCustomDraft();
  customIssues.value = [];
}

async function submitCustomPlan() {
  if (isSaving.value) {
    return;
  }

  const title = String(customDraft.value.title ?? "").trim();

  // 自己写的一件事只需要一个标题：类别在「完成啦」那一步还能改，这里不折腾。
  customIssues.value = title
    ? []
    : [{ field: "title", message: "给这件事写一个标题吧。" }];

  if (customIssues.value.length) {
    return;
  }

  const didAdd = await addPlan({
    title,
    note: String(customDraft.value.note ?? "").trim(),
    category: customDraft.value.category
  });

  if (didAdd) {
    closeCustomForm();
  }
}

async function openCompletion(plan) {
  completingPlan.value = plan;
  completionDraft.value = createEmptyCompletionDraft(plan);
  clearCompletionIssues();

  await nextTick();
  completionAnchorRef.value?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  // 日期和类别都已经有合理的默认值，光标直接落在唯一需要手写的地方。
  completionNoteRef.value?.focus?.();
}

function closeCompletion() {
  completingPlan.value = null;
  completionDraft.value = createEmptyCompletionDraft();
  clearCompletionIssues();
}

function toggleCompletionTag(tagId) {
  const tags = completionDraft.value.tags.includes(tagId)
    ? completionDraft.value.tags.filter((tag) => tag !== tagId)
    : [...completionDraft.value.tags, tagId];

  completionDraft.value = { ...completionDraft.value, tags };
}

async function submitCompletion() {
  const plan = completingPlan.value;

  if (!plan || isCompleting.value) {
    return;
  }

  const footprint = await completePlan(plan, completionDraft.value);

  if (footprint) {
    justCompletedPlan.value = plan;
    closeCompletion();
  }
}

async function dropPlan(plan) {
  if (isSaving.value) {
    return;
  }

  // 只是「不想做了」，不写足迹、不做二次确认：清单本来就应该随时能动。
  const didRemove = await removePlan(plan.id);

  if (didRemove && completingPlan.value?.id === plan.id) {
    closeCompletion();
  }
}

function openMemoryBook() {
  void router.push({ name: APP_ROUTE_NAME.GROWTH_BOOK });
}

function goHome() {
  void router.push({ name: APP_ROUTE_NAME.HOME });
}

onMounted(async () => {
  abortController = typeof AbortController === "function" ? new AbortController() : null;
  await load(abortController?.signal);
});

onBeforeUnmount(() => {
  abortController?.abort?.();
});
</script>

<template>
  <section class="growth-plans">
    <header class="growth-plans__hero">
      <div class="growth-plans__hero-copy">
        <p class="growth-plans__eyebrow">想一起做的事</p>
        <h1 class="growth-plans__title">下次我们一起做什么</h1>
        <p class="growth-plans__lead">
          挑一件想一起做的放进来，等真的做了，点一下「完成啦」，它就变成纪念册里的一页。
        </p>
      </div>

      <div class="growth-plans__hero-actions">
        <button class="growth-plans__button growth-plans__button--primary" type="button" @click="openCustomForm">
          ✏️ 我想做一件别的事
        </button>
        <button class="growth-plans__button" type="button" @click="openMemoryBook">📖 成长纪念册</button>
        <button class="growth-plans__button" type="button" @click="goHome">返回首页</button>
      </div>
    </header>

    <p v-if="errorMessage" class="growth-plans__alert" role="alert">
      <span>{{ errorMessage }}</span>
      <button class="growth-plans__alert-action" type="button" @click="clearErrorMessage">知道了</button>
    </p>

    <!-- 自己新增：只写一件事的名字，类别 / 时长都可以留到「完成啦」那一步再说。 -->
    <section v-if="isCustomFormOpen" class="growth-plans__form" aria-labelledby="growth-plans-custom-title">
      <header class="growth-plans__form-head">
        <h2 id="growth-plans-custom-title" class="growth-plans__form-title">我想做一件别的事</h2>
        <button class="growth-plans__form-close" type="button" :disabled="isSaving" @click="closeCustomForm">收起</button>
      </header>

      <div class="growth-plans__field">
        <label class="growth-plans__label" for="growth-plans-custom-title-input">想一起做什么</label>
        <input
          id="growth-plans-custom-title-input"
          ref="customTitleRef"
          v-model="customDraft.title"
          class="growth-plans__input"
          type="text"
          :maxlength="planTitleLimit"
          placeholder="例如：一起去看一次海"
        />
        <p v-if="customTitleIssue" class="growth-plans__field-issue">{{ customTitleIssue }}</p>
      </div>

      <fieldset class="growth-plans__field growth-plans__fieldset">
        <legend class="growth-plans__label">大概算哪一类（以后还能改）</legend>
        <div class="growth-plans__chips">
          <label
            v-for="category in FOOTPRINT_CATEGORIES"
            :key="category.id"
            :class="['growth-plans__chip', { 'growth-plans__chip--active': customDraft.category === category.id }]"
          >
            <input
              v-model="customDraft.category"
              class="growth-plans__chip-input"
              type="radio"
              name="growth-plans-custom-category"
              :value="category.id"
            />
            <span>{{ category.displayLabel }}</span>
          </label>
        </div>
        <p v-if="customCategoryIssue" class="growth-plans__field-issue">{{ customCategoryIssue }}</p>
      </fieldset>

      <div class="growth-plans__field">
        <label class="growth-plans__label" for="growth-plans-custom-note">想怎么做（可以不写）</label>
        <textarea
          id="growth-plans-custom-note"
          v-model="customDraft.note"
          class="growth-plans__input growth-plans__textarea"
          rows="2"
          placeholder="比如：要带什么东西、去哪里做"
        ></textarea>
      </div>

      <div class="growth-plans__form-actions">
        <button class="growth-plans__button" type="button" :disabled="isSaving" @click="closeCustomForm">先不写了</button>
        <button class="growth-plans__button growth-plans__button--primary" type="button" :disabled="isSaving" @click="submitCustomPlan">
          放进想一起做
        </button>
      </div>
    </section>

    <!-- 完成啦：只需要补日期 / 类别 / 标签 / 一句记录，标题不用再写一遍。 -->
    <section v-if="completingPlan" ref="completionAnchorRef" class="growth-plans__complete" aria-labelledby="growth-plans-complete-title">
      <header class="growth-plans__form-head">
        <div class="growth-plans__complete-copy">
          <p class="growth-plans__eyebrow">完成啦</p>
          <h2 id="growth-plans-complete-title" class="growth-plans__form-title">{{ completingPlan.title }}</h2>
        </div>
        <button class="growth-plans__form-close" type="button" :disabled="isCompleting" @click="closeCompletion">收起</button>
      </header>

      <p class="growth-plans__complete-hint">
        补上哪一天、算哪一类，再写一句当时的样子，它就会收进成长纪念册。
      </p>

      <div class="growth-plans__complete-grid">
        <div class="growth-plans__field">
          <label class="growth-plans__label" for="growth-plans-complete-date">哪一天做的</label>
          <input
            id="growth-plans-complete-date"
            v-model="completionDraft.occurredOn"
            class="growth-plans__input growth-plans__input--date"
            type="date"
            :max="todayDateKey"
          />
          <p v-if="completionDateIssue" class="growth-plans__field-issue">{{ completionDateIssue }}</p>
        </div>

        <fieldset class="growth-plans__field growth-plans__fieldset growth-plans__fieldset--wide">
          <legend class="growth-plans__label">这是一件什么样的事</legend>
          <div class="growth-plans__chips">
            <label
              v-for="category in FOOTPRINT_CATEGORIES"
              :key="category.id"
              :class="['growth-plans__chip', { 'growth-plans__chip--active': completionDraft.category === category.id }]"
            >
              <input
                v-model="completionDraft.category"
                class="growth-plans__chip-input"
                type="radio"
                name="growth-plans-complete-category"
                :value="category.id"
              />
              <span>{{ category.displayLabel }}</span>
            </label>
          </div>
        </fieldset>

        <fieldset class="growth-plans__field growth-plans__fieldset growth-plans__fieldset--wide">
          <legend class="growth-plans__label">想标记的话（可以不选）</legend>
          <div class="growth-plans__chips">
            <button
              v-for="tag in FOOTPRINT_TAGS"
              :key="tag.id"
              :class="['growth-plans__chip', 'growth-plans__chip--button', { 'growth-plans__chip--active': completionDraft.tags.includes(tag.id) }]"
              type="button"
              :aria-pressed="completionDraft.tags.includes(tag.id)"
              @click="toggleCompletionTag(tag.id)"
            >
              {{ tag.displayLabel }}
            </button>
          </div>
          <p v-if="completionTagsIssue" class="growth-plans__field-issue">{{ completionTagsIssue }}</p>
        </fieldset>

        <div class="growth-plans__field growth-plans__fieldset--wide">
          <label class="growth-plans__label" for="growth-plans-complete-note">一句记录</label>
          <textarea
            id="growth-plans-complete-note"
            ref="completionNoteRef"
            v-model="completionDraft.note"
            class="growth-plans__input growth-plans__textarea"
            rows="3"
            :maxlength="noteLimit"
            placeholder="那天发生了什么？写一句就够。"
          ></textarea>
          <p class="growth-plans__field-meta">{{ completionNoteLength }} / {{ noteLimit }} 字</p>
          <p v-if="completionNoteIssue" class="growth-plans__field-issue">{{ completionNoteIssue }}</p>
          <p v-if="completionTitleIssue" class="growth-plans__field-issue">{{ completionTitleIssue }}</p>
        </div>
      </div>

      <div class="growth-plans__form-actions">
        <button class="growth-plans__button" type="button" :disabled="isCompleting" @click="closeCompletion">还没做呢</button>
        <button
          class="growth-plans__button growth-plans__button--primary"
          type="button"
          :disabled="isCompleting"
          @click="submitCompletion"
        >
          {{ isCompleting ? "正在收进纪念册…" : "收进成长纪念册" }}
        </button>
      </div>
    </section>

    <!-- 想一起做：还没发生的事 -->
    <section class="growth-plans__wishlist" aria-labelledby="growth-plans-wishlist-title">
      <header class="growth-plans__section-head">
        <h2 id="growth-plans-wishlist-title" class="growth-plans__section-title">我们想一起做</h2>
        <span class="growth-plans__section-note">还没发生，随时可以改主意</span>
      </header>

      <!-- 完成后的去向提示：只说「收进纪念册了」，不庆祝、不计分。 -->
      <p v-if="justCompletedPlan" class="growth-plans__done" role="status">
        <span>「{{ justCompletedPlan.title }}」已经收进成长纪念册了，去翻一翻吧。</span>
        <span class="growth-plans__done-actions">
          <button class="growth-plans__link-button" type="button" @click="openMemoryBook">打开纪念册</button>
          <button class="growth-plans__link-button" type="button" @click="justCompletedPlan = null">知道了</button>
        </span>
      </p>

      <p v-if="isLoading && isEmpty" class="growth-plans__state">正在打开清单…</p>

      <p v-else-if="isEmpty" class="growth-plans__empty">{{ buildGrowthPlanEmptyText() }}</p>

      <ul v-else class="growth-plans__plan-list">
        <li v-for="plan in plans" :key="plan.id" class="growth-plans__plan">
          <div class="growth-plans__plan-copy">
            <strong class="growth-plans__plan-title">{{ plan.title }}</strong>
            <span class="growth-plans__plan-meta">
              <span>{{ categoryLabelFor(plan) }}</span>
              <span v-if="durationLabelFor(plan)">· {{ durationLabelFor(plan) }}</span>
            </span>
            <span v-if="plan.note" class="growth-plans__plan-note">{{ plan.note }}</span>
          </div>

          <div class="growth-plans__plan-actions">
            <button class="growth-plans__button growth-plans__button--small growth-plans__button--primary" type="button" @click="openCompletion(plan)">
              完成啦
            </button>
            <button class="growth-plans__link-button" type="button" :disabled="isSaving" @click="dropPlan(plan)">不做了</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 推荐的下一件事：按「一起探索 / 动手 / 出门 / 创作 / 生活 / 聊天」分组 -->
    <section class="growth-plans__recommend" aria-labelledby="growth-plans-recommend-title">
      <header class="growth-plans__section-head">
        <h2 id="growth-plans-recommend-title" class="growth-plans__section-title">可以一起做的事</h2>
        <span class="growth-plans__section-note">挑一件顺眼的就好</span>
      </header>

      <div class="growth-plans__tabs" role="tablist" aria-label="活动分类">
        <button
          v-for="group in GROWTH_ACTIVITY_GROUPS"
          :key="group.id"
          :class="['growth-plans__tab', { 'growth-plans__tab--active': activeGroup.id === group.id }]"
          type="button"
          role="tab"
          :aria-selected="activeGroup.id === group.id"
          @click="activeGroupId = group.id"
        >
          <span aria-hidden="true">{{ group.glyph }}</span> {{ group.label }}
        </button>
      </div>

      <ul class="growth-plans__activity-list">
        <li v-for="activity in activeGroup.activities" :key="activity.id" class="growth-plans__activity">
          <div class="growth-plans__activity-copy">
            <strong class="growth-plans__activity-title">{{ activity.title }}</strong>
            <span class="growth-plans__activity-summary">{{ activity.summary }}</span>
            <!-- 推荐本身不重复标类别：所属分组已经说明了这是哪一类事，
                 类别在「完成啦」那一步还可以改。 -->
            <span class="growth-plans__activity-meta">{{ formatActivityMinutes(activity.minutes) }}</span>
          </div>

          <button
            :class="['growth-plans__button', 'growth-plans__button--small', { 'growth-plans__button--done': isPlanned(activity.id) }]"
            type="button"
            :disabled="isSaving || isPlanned(activity.id)"
            @click="addFromRecommendation(activity)"
          >
            {{ isPlanned(activity.id) ? "已经在想一起做里" : "加入想一起做" }}
          </button>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.growth-plans {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.growth-plans__hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(173, 235, 255, 0.32) 0%, rgba(173, 235, 255, 0) 36%),
    linear-gradient(180deg, rgba(255, 253, 248, 0.96) 0%, rgba(255, 255, 255, 0.88) 100%);
  box-shadow:
    0 22px 34px -36px rgba(36, 50, 74, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.growth-plans__hero-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.growth-plans__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.growth-plans__title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.75rem;
  line-height: 1.15;
}

.growth-plans__lead {
  margin: 0;
  max-width: 48ch;
  color: var(--color-ink-soft);
  line-height: 1.65;
}

.growth-plans__hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.growth-plans__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 10px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.growth-plans__button:hover:not(:disabled),
.growth-plans__button:focus-visible:not(:disabled) {
  border-color: rgba(124, 216, 184, 0.5);
  background: rgba(247, 252, 249, 0.98);
  box-shadow: 0 16px 24px -24px rgba(36, 50, 74, 0.42);
  outline: none;
  transform: translateY(-1px);
}

.growth-plans__button:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.growth-plans__button--primary {
  border-color: rgba(124, 216, 184, 0.52);
  background: linear-gradient(180deg, rgba(184, 242, 223, 0.94) 0%, rgba(255, 255, 255, 0.94) 100%);
}

.growth-plans__button--small {
  min-height: 36px;
  padding: 7px 13px;
  border-radius: 14px;
  font-size: 0.88rem;
  white-space: nowrap;
}

.growth-plans__button--done {
  border-color: rgba(36, 50, 74, 0.1);
  background: rgba(244, 247, 250, 0.92);
  color: var(--color-ink-soft);
}

.growth-plans__alert {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0;
  padding: 12px 16px;
  border: 1.5px solid rgba(226, 118, 147, 0.3);
  border-radius: 18px;
  background: rgba(255, 236, 242, 0.9);
  color: #a23b56;
  line-height: 1.6;
}

.growth-plans__alert-action {
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}

.growth-plans__form,
.growth-plans__complete {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1.5px solid rgba(124, 216, 184, 0.42);
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(244, 253, 249, 0.96) 0%, rgba(255, 255, 255, 0.92) 100%);
  box-shadow:
    0 22px 34px -38px rgba(36, 50, 74, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.growth-plans__complete {
  border-color: rgba(255, 208, 104, 0.6);
  background: linear-gradient(180deg, rgba(255, 250, 235, 0.96) 0%, rgba(255, 255, 255, 0.92) 100%);
}

.growth-plans__form-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.growth-plans__form-title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.25rem;
}

.growth-plans__complete-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.growth-plans__complete-hint {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.6;
}

.growth-plans__form-close {
  border: 0;
  background: none;
  color: var(--color-ink-soft);
  font: inherit;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}

.growth-plans__complete-grid {
  display: grid;
  grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
  gap: 14px;
}

.growth-plans__field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.growth-plans__fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}

.growth-plans__fieldset--wide {
  grid-column: 1 / -1;
}

.growth-plans__label {
  padding: 0;
  color: var(--color-ink);
  font-size: 0.95rem;
  font-weight: 800;
}

.growth-plans__input {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--color-ink);
  font: inherit;
}

.growth-plans__input:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.7);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.22);
}

.growth-plans__textarea {
  resize: vertical;
  line-height: 1.65;
}

.growth-plans__field-meta {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
}

.growth-plans__field-issue {
  margin: 0;
  color: #a23b56;
  font-size: 0.88rem;
  font-weight: 700;
}

.growth-plans__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.growth-plans__chip {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 7px 13px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.growth-plans__chip:hover {
  border-color: rgba(124, 216, 184, 0.46);
}

.growth-plans__chip--active {
  border-color: rgba(124, 216, 184, 0.62);
  background: linear-gradient(180deg, rgba(184, 242, 223, 0.92) 0%, rgba(255, 255, 255, 0.94) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.growth-plans__chip-input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.growth-plans__chip:focus-within {
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.28);
}

.growth-plans__form-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.growth-plans__done {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0;
  padding: 12px 14px;
  border: 1.5px solid rgba(124, 216, 184, 0.46);
  border-radius: 18px;
  background: rgba(232, 252, 243, 0.9);
  color: #1f6b51;
  font-weight: 800;
  line-height: 1.6;
}

.growth-plans__done-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 14px;
}

.growth-plans__state,
.growth-plans__empty {
  margin: 0;
  padding: 18px;
  border: 1.5px dashed rgba(36, 50, 74, 0.16);
  border-radius: 22px;
  color: var(--color-ink-soft);
  line-height: 1.7;
}

.growth-plans__state {
  text-align: center;
}

.growth-plans__wishlist,
.growth-plans__recommend {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
  box-shadow: 0 20px 30px -36px rgba(36, 50, 74, 0.28);
}

.growth-plans__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 12px;
}

.growth-plans__section-title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.2rem;
}

.growth-plans__section-note {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 700;
}

.growth-plans__plan-list,
.growth-plans__activity-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.growth-plans__plan,
.growth-plans__activity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
}

.growth-plans__plan-copy,
.growth-plans__activity-copy {
  display: grid;
  gap: 4px;
  flex: 1 1 260px;
  min-width: 0;
}

.growth-plans__plan-title,
.growth-plans__activity-title {
  font-size: 1.02rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.growth-plans__plan-meta,
.growth-plans__activity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  font-weight: 700;
}

.growth-plans__plan-note,
.growth-plans__activity-summary {
  color: var(--color-ink-soft);
  font-size: 0.88rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.growth-plans__plan-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.growth-plans__link-button {
  border: 0;
  background: none;
  color: var(--color-ink-soft);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}

.growth-plans__link-button:hover:not(:disabled),
.growth-plans__link-button:focus-visible:not(:disabled) {
  color: #a23b56;
  outline: none;
}

.growth-plans__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.growth-plans__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 13px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink-soft);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.growth-plans__tab:hover {
  border-color: rgba(124, 216, 184, 0.46);
  color: var(--color-ink);
}

.growth-plans__tab:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.8);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.22);
}

.growth-plans__tab--active {
  border-color: rgba(124, 216, 184, 0.62);
  background: linear-gradient(180deg, rgba(184, 242, 223, 0.92) 0%, rgba(255, 255, 255, 0.94) 100%);
  color: var(--color-ink);
}

@media (max-width: 720px) {
  .growth-plans__hero {
    padding: 16px;
    border-radius: 22px;
  }

  .growth-plans__hero-actions {
    width: 100%;
  }

  .growth-plans__hero-actions .growth-plans__button {
    flex: 1 1 140px;
  }

  .growth-plans__form,
  .growth-plans__complete,
  .growth-plans__wishlist,
  .growth-plans__recommend {
    padding: 14px;
    border-radius: 20px;
  }

  .growth-plans__complete-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .growth-plans__form-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .growth-plans__form-actions .growth-plans__button {
    width: 100%;
  }

  /* 窄屏上动作按钮整行放下，避免卡片里出现被挤成两行的短按钮。 */
  .growth-plans__plan,
  .growth-plans__activity {
    align-items: stretch;
  }

  .growth-plans__plan-actions {
    width: 100%;
    justify-content: space-between;
  }

  .growth-plans__activity .growth-plans__button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .growth-plans__button,
  .growth-plans__chip,
  .growth-plans__tab {
    transition: none;
  }

  .growth-plans__button:hover:not(:disabled) {
    transform: none;
  }
}
</style>
