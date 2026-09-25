<script setup>
// 我们的成长纪念册（Phase 2D-A2）：一个只需要「翻开就能看」的独立页面。
//
// 它刻意不做成任务 / 成就面板：
//   - 没有进度条、没有完成率、没有印章 / XP / 徽章；
//   - 唯一的动作是「记下今天一起做的事」，以及记错之后的改和删。
//
// 数据全部来自 /api/growth-footprints（服务端是唯一事实来源，刷新后仍在），
// 页面本身只负责表单交互与排版：分组 / 排序 / 校验都用 utils/growthFootprints 的纯函数。
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { useGrowthBook } from "../composables/growth/useGrowthBook.js";
import { APP_ROUTE_NAME } from "../router/routes.js";
import {
  FOOTPRINT_CATEGORIES,
  FOOTPRINT_CATEGORY_IDS,
  FOOTPRINT_TAGS,
  MAX_FOOTPRINT_NOTE_LENGTH,
  MAX_FOOTPRINT_TITLE_LENGTH,
  getLocalDateKey,
  normalizeFootprintText
} from "../utils/growthFootprints.js";

const router = useRouter();
const growthBook = useGrowthBook();
const {
  monthGroups,
  summary,
  isEmpty,
  isLoading,
  isSaving,
  isDeleting,
  errorMessage,
  load,
  createFootprint,
  updateFootprint,
  deleteFootprint,
  clearFormErrors,
  clearErrorMessage
} = growthBook;

const isFormOpen = ref(false);
// 空串 = 正在新增；数字 = 正在编辑哪一条。
const editingFootprintId = ref("");
const draft = ref(createEmptyDraft());
const draftIssues = ref([]);
const pendingDelete = ref(null);
const isDeleteConfirmOpen = ref(false);
const formAnchorRef = ref(null);
const dateInputRef = ref(null);

// 只有最新一个月默认展开。
// 这里刻意用「一次性记账」而不是 :open="index === 0"：后者是响应式绑定，
// 每次列表变化都会把 DOM 的 open 状态按表达式重写，用户手动展开/收起的月份会被弹回去。
const autoExpandedMonthKeys = new Set();

// 浏览器本地今天：既是日期默认值，也是「不能选到未来」的 max。
const todayDateKey = getLocalDateKey();
const titleLimit = MAX_FOOTPRINT_TITLE_LENGTH;
const noteLimit = MAX_FOOTPRINT_NOTE_LENGTH;
const isEditing = computed(() => editingFootprintId.value !== "");
const draftTitleLength = computed(() => normalizeFootprintText(draft.value.title).length);
const draftNoteLength = computed(() => normalizeFootprintText(draft.value.note).length);
const formHeading = computed(() => (isEditing.value ? "修改这条记录" : "记下一件一起做的事"));
const submitLabel = computed(() => {
  if (isSaving.value) {
    return "保存中…";
  }

  return isEditing.value ? "保存修改" : "收进纪念册";
});
const deleteDescription = computed(() =>
  pendingDelete.value ? `「${pendingDelete.value.title}」会从纪念册里移走，删掉就找不回来了。` : ""
);

let abortController = null;

function createEmptyDraft() {
  return {
    occurredOn: getLocalDateKey(),
    category: FOOTPRINT_CATEGORY_IDS[0],
    title: "",
    note: "",
    tags: []
  };
}

function issueMessageFor(field) {
  return [...draftIssues.value].find((issue) => issue.field === field)?.message || "";
}

// 表单逐字段提示直接复用 utils 的校验结果，和提交时的规则完全同一份。
const dateIssue = computed(() => issueMessageFor("occurredOn"));
const categoryIssue = computed(() => issueMessageFor("category"));
const titleIssue = computed(() => issueMessageFor("title"));
const noteIssue = computed(() => issueMessageFor("note"));
const tagsIssue = computed(() => issueMessageFor("tags"));

function resetDraft() {
  draft.value = createEmptyDraft();
  draftIssues.value = [];
  clearFormErrors();
}

async function openCreateForm() {
  resetDraft();
  editingFootprintId.value = "";
  isFormOpen.value = true;
  await focusForm();
}

async function openEditForm(footprint) {
  resetDraft();
  editingFootprintId.value = String(footprint.id);
  draft.value = {
    occurredOn: footprint.occurredOn || todayDateKey,
    category: footprint.category,
    title: footprint.title,
    note: footprint.note,
    tags: [...footprint.tags]
  };
  isFormOpen.value = true;
  await focusForm();
}

function closeForm() {
  if (isSaving.value) {
    return;
  }

  isFormOpen.value = false;
  editingFootprintId.value = "";
  resetDraft();
}

async function focusForm() {
  await nextTick();
  formAnchorRef.value?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  dateInputRef.value?.focus?.();
}

function toggleTag(tagId) {
  const selectedTags = draft.value.tags.includes(tagId)
    ? draft.value.tags.filter((tag) => tag !== tagId)
    : [...draft.value.tags, tagId];

  draft.value = { ...draft.value, tags: selectedTags };
}

// 提交前先本地校验一遍，只为了把 issues 逐字段显示出来；
// 真正的权威校验仍在 useGrowthBook（同一套纯函数）与服务端。
function collectDraftIssues() {
  const result = growthBook.validateDraft(draft.value);

  draftIssues.value = result.issues;
  return result.isValid;
}

async function handleSubmit() {
  if (isSaving.value || !collectDraftIssues()) {
    return;
  }

  const didSave = isEditing.value
    ? await updateFootprint(Number(editingFootprintId.value), draft.value)
    : await createFootprint(draft.value);

  if (didSave) {
    isFormOpen.value = false;
    editingFootprintId.value = "";
    resetDraft();
  }
}

function requestDelete(footprint) {
  pendingDelete.value = footprint;
  isDeleteConfirmOpen.value = true;
}

async function confirmDelete() {
  if (!pendingDelete.value) {
    return;
  }

  const targetId = pendingDelete.value.id;
  const didDelete = await deleteFootprint(targetId);

  if (didDelete && String(editingFootprintId.value) === String(targetId)) {
    closeForm();
  }

  isDeleteConfirmOpen.value = false;
  pendingDelete.value = null;
}

function cancelDelete() {
  isDeleteConfirmOpen.value = false;
  pendingDelete.value = null;
}

function goHome() {
  void router.push({ name: APP_ROUTE_NAME.HOME });
}

function formatDayLabel(dateKey) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);

  if (!matched) {
    return dateKey;
  }

  return `${Number.parseInt(matched[3], 10)} 日`;
}

// 每个月份组只在第一次渲染时被自动展开；之后 open 属性就交给用户自己控制。
function isMonthAutoExpanded(monthKey) {
  if (autoExpandedMonthKeys.has(monthKey)) {
    return true;
  }

  if (monthGroups.value[0]?.key !== monthKey) {
    return false;
  }

  autoExpandedMonthKeys.add(monthKey);
  return true;
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
  <section class="growth-book">
    <header class="growth-book__hero">
      <div class="growth-book__hero-copy">
        <p class="growth-book__eyebrow">共同成长足迹</p>
        <h1 class="growth-book__title">我们的成长纪念册</h1>
        <p class="growth-book__lead">
          把爸爸和女儿真正一起做过的事，按它发生的那一天收进来。以后翻回去看，都是真的。
        </p>
        <p class="growth-book__count">{{ summary.countText }}</p>
      </div>

      <div class="growth-book__hero-actions">
        <button class="growth-book__button growth-book__button--primary" type="button" @click="openCreateForm">
          ✏️ 记一件新的事
        </button>
        <button class="growth-book__button" type="button" @click="goHome">返回首页</button>
      </div>
    </header>

    <p v-if="errorMessage" class="growth-book__alert" role="alert">
      <span>{{ errorMessage }}</span>
      <button class="growth-book__alert-action" type="button" @click="clearErrorMessage">知道了</button>
    </p>

    <!-- 新增 / 编辑共用同一套表单：只有标题与提交文案不同。 -->
    <section v-if="isFormOpen" ref="formAnchorRef" class="growth-book__form" aria-labelledby="growth-book-form-title">
      <header class="growth-book__form-head">
        <h2 id="growth-book-form-title" class="growth-book__form-title">{{ formHeading }}</h2>
        <button class="growth-book__form-close" type="button" :disabled="isSaving" @click="closeForm">收起</button>
      </header>

      <!-- 校验不通过时逐字段提示（dateIssue / titleIssue …），这里不再重复一整条错误清单。 -->
      <form class="growth-book__form-body" novalidate @submit.prevent="handleSubmit">
        <div class="growth-book__field">
          <label class="growth-book__label" for="growth-book-date">哪一天</label>
          <input
            id="growth-book-date"
            ref="dateInputRef"
            v-model="draft.occurredOn"
            class="growth-book__input growth-book__input--date"
            type="date"
            :max="todayDateKey"
          />
          <p v-if="dateIssue" class="growth-book__field-issue">{{ dateIssue }}</p>
        </div>

        <fieldset class="growth-book__field growth-book__fieldset">
          <legend class="growth-book__label">这是一件什么样的事</legend>
          <div class="growth-book__chips">
            <label
              v-for="category in FOOTPRINT_CATEGORIES"
              :key="category.id"
              :class="['growth-book__chip', { 'growth-book__chip--active': draft.category === category.id }]"
            >
              <input v-model="draft.category" class="growth-book__chip-input" type="radio" name="growth-book-category" :value="category.id" />
              <span>{{ category.displayLabel }}</span>
            </label>
          </div>
          <p v-if="categoryIssue" class="growth-book__field-issue">{{ categoryIssue }}</p>
        </fieldset>

        <div class="growth-book__field">
          <label class="growth-book__label" for="growth-book-title">这件事的标题</label>
          <input
            id="growth-book-title"
            v-model="draft.title"
            class="growth-book__input"
            type="text"
            :maxlength="titleLimit"
            placeholder="例如：第一次一起做火山实验"
          />
          <p class="growth-book__field-meta">{{ draftTitleLength }} / {{ titleLimit }} 字</p>
          <p v-if="titleIssue" class="growth-book__field-issue">{{ titleIssue }}</p>
        </div>

        <fieldset class="growth-book__field growth-book__fieldset">
          <legend class="growth-book__label">想标记的话（可以不选）</legend>
          <div class="growth-book__chips">
            <button
              v-for="tag in FOOTPRINT_TAGS"
              :key="tag.id"
              :class="['growth-book__chip', 'growth-book__chip--button', { 'growth-book__chip--active': draft.tags.includes(tag.id) }]"
              type="button"
              :aria-pressed="draft.tags.includes(tag.id)"
              @click="toggleTag(tag.id)"
            >
              {{ tag.displayLabel }}
            </button>
          </div>
          <p v-if="tagsIssue" class="growth-book__field-issue">{{ tagsIssue }}</p>
        </fieldset>

        <div class="growth-book__field">
          <label class="growth-book__label" for="growth-book-note">那天发生了什么</label>
          <textarea
            id="growth-book-note"
            v-model="draft.note"
            class="growth-book__input growth-book__textarea"
            rows="4"
            :maxlength="noteLimit"
            placeholder="写了什么、笑了什么、后来怎么样了…"
          ></textarea>
          <p class="growth-book__field-meta">{{ draftNoteLength }} / {{ noteLimit }} 字</p>
          <p v-if="noteIssue" class="growth-book__field-issue">{{ noteIssue }}</p>
        </div>

        <div class="growth-book__form-actions">
          <button class="growth-book__button" type="button" :disabled="isSaving" @click="closeForm">先不记了</button>
          <button class="growth-book__button growth-book__button--primary" type="submit" :disabled="isSaving">
            {{ submitLabel }}
          </button>
        </div>
      </form>
    </section>

    <p v-if="isLoading && !monthGroups.length" class="growth-book__state">正在翻开纪念册…</p>

    <section v-else-if="isEmpty" class="growth-book__empty">
      <span class="growth-book__empty-glyph" aria-hidden="true">📖</span>
      <h2 class="growth-book__empty-title">纪念册还是空的</h2>
      <p class="growth-book__empty-text">
        不用特意准备什么，一起做过的一件小事就够记一笔。记下来，它就不会被忘掉了。
      </p>
      <button class="growth-book__button growth-book__button--primary" type="button" @click="openCreateForm">
        记下第一件事
      </button>
    </section>

    <div v-else class="growth-book__months">
      <section v-for="month in monthGroups" :key="month.key" class="growth-book__month">
        <details class="growth-book__month-details" :open="isMonthAutoExpanded(month.key)">
          <summary class="growth-book__month-summary">
            <span class="growth-book__month-label">{{ month.label }}</span>
            <span class="growth-book__month-count">{{ month.items.length }} 件事</span>
          </summary>

          <ol class="growth-book__entries">
            <li v-for="footprint in month.items" :key="footprint.id" class="growth-book__entry">
              <div class="growth-book__entry-head">
                <span class="growth-book__entry-date">{{ formatDayLabel(footprint.occurredOn) }}</span>
                <span class="growth-book__entry-category">{{ footprint.categoryMeta.displayLabel }}</span>
              </div>

              <h3 class="growth-book__entry-title">{{ footprint.title }}</h3>
              <p v-if="footprint.note" class="growth-book__entry-note">{{ footprint.note }}</p>

              <div v-if="footprint.tagMetas.length" class="growth-book__entry-tags">
                <span v-for="tag in footprint.tagMetas" :key="tag.id" class="growth-book__entry-tag">{{ tag.displayLabel }}</span>
              </div>

              <div class="growth-book__entry-actions">
                <button class="growth-book__link-button" type="button" @click="openEditForm(footprint)">改一改</button>
                <button class="growth-book__link-button growth-book__link-button--danger" type="button" @click="requestDelete(footprint)">
                  删掉
                </button>
              </div>
            </li>
          </ol>
        </details>
      </section>
    </div>

    <!-- 删除只要简单确认：说清楚删的是哪一条就够，不需要输入标题。 -->
    <ConfirmDialog
      v-model="isDeleteConfirmOpen"
      title-id="growth-book-delete-confirm-title"
      semantic-tone="danger"
      heading-title="要把这条记录删掉吗？"
      :heading-description="deleteDescription"
      close-label="关闭删除确认"
      confirm-text="删掉这条"
      confirm-loading-text="正在删除…"
      :confirm-loading="isDeleting"
      :cancel-disabled="isDeleting"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </section>
</template>

<style scoped>
.growth-book {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.growth-book__hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.32) 0%, rgba(255, 231, 156, 0) 34%),
    linear-gradient(180deg, rgba(255, 253, 248, 0.96) 0%, rgba(255, 255, 255, 0.88) 100%);
  box-shadow:
    0 22px 34px -36px rgba(36, 50, 74, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.growth-book__hero-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.growth-book__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.growth-book__title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.75rem;
  line-height: 1.15;
}

.growth-book__lead {
  margin: 0;
  max-width: 46ch;
  color: var(--color-ink-soft);
  line-height: 1.65;
}

.growth-book__count {
  margin: 2px 0 0;
  color: var(--color-ink);
  font-size: 0.92rem;
  font-weight: 800;
}

.growth-book__hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.growth-book__button {
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

.growth-book__button:hover:not(:disabled),
.growth-book__button:focus-visible:not(:disabled) {
  border-color: rgba(124, 216, 184, 0.5);
  background: rgba(247, 252, 249, 0.98);
  box-shadow: 0 16px 24px -24px rgba(36, 50, 74, 0.42);
  outline: none;
  transform: translateY(-1px);
}

.growth-book__button:disabled {
  cursor: progress;
  opacity: 0.72;
}

.growth-book__button--primary {
  border-color: rgba(124, 216, 184, 0.52);
  background: linear-gradient(180deg, rgba(184, 242, 223, 0.94) 0%, rgba(255, 255, 255, 0.94) 100%);
}

.growth-book__alert {
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

.growth-book__alert-action {
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}

.growth-book__form {
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

.growth-book__form-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.growth-book__form-title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.25rem;
}

.growth-book__form-close {
  border: 0;
  background: none;
  color: var(--color-ink-soft);
  font: inherit;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}

.growth-book__form-body {
  display: grid;
  gap: 14px;
}

.growth-book__field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.growth-book__fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}

.growth-book__label {
  padding: 0;
  color: var(--color-ink);
  font-size: 0.95rem;
  font-weight: 800;
}

.growth-book__input {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--color-ink);
  font: inherit;
}

.growth-book__input:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.7);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.22);
}

.growth-book__input--date {
  max-width: 220px;
}

.growth-book__textarea {
  resize: vertical;
  line-height: 1.65;
}

.growth-book__field-meta {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
}

.growth-book__field-issue {
  margin: 0;
  color: #a23b56;
  font-size: 0.88rem;
  font-weight: 700;
}

.growth-book__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.growth-book__chip {
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

.growth-book__chip:hover {
  border-color: rgba(124, 216, 184, 0.46);
}

.growth-book__chip--active {
  border-color: rgba(124, 216, 184, 0.62);
  background: linear-gradient(180deg, rgba(184, 242, 223, 0.92) 0%, rgba(255, 255, 255, 0.94) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* 单选框本体保留可聚焦性，但视觉上由外层 label 承担。 */
.growth-book__chip-input {
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

.growth-book__chip:focus-within {
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.28);
}

.growth-book__form-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.growth-book__state {
  margin: 0;
  padding: 18px;
  border: 1.5px dashed rgba(36, 50, 74, 0.16);
  border-radius: 22px;
  color: var(--color-ink-soft);
  text-align: center;
}

.growth-book__empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 34px 22px;
  border: 1.5px dashed rgba(36, 50, 74, 0.18);
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.9) 0%, rgba(255, 255, 255, 0.82) 100%);
  text-align: center;
}

.growth-book__empty-glyph {
  font-size: 2.2rem;
}

.growth-book__empty-title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.25rem;
}

.growth-book__empty-text {
  margin: 0;
  max-width: 40ch;
  color: var(--color-ink-soft);
  line-height: 1.7;
}

.growth-book__months {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.growth-book__month-details {
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.94) 0%, rgba(255, 255, 255, 0.88) 100%);
  box-shadow: 0 20px 30px -36px rgba(36, 50, 74, 0.28);
  overflow: hidden;
}

.growth-book__month-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 18px;
  cursor: pointer;
  list-style: none;
}

.growth-book__month-summary::-webkit-details-marker {
  display: none;
}

.growth-book__month-summary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.28);
}

.growth-book__month-label {
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.1rem;
}

.growth-book__month-count {
  color: var(--color-ink-soft);
  font-size: 0.85rem;
  font-weight: 700;
}

.growth-book__entries {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0 18px 18px;
  list-style: none;
}

.growth-book__entry {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 14px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
}

.growth-book__entry-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.growth-book__entry-date {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 231, 156, 0.5);
  color: var(--color-ink);
  font-size: 0.82rem;
  font-weight: 800;
}

.growth-book__entry-category {
  color: var(--color-ink-soft);
  font-size: 0.86rem;
  font-weight: 700;
}

.growth-book__entry-title {
  margin: 0;
  font-size: 1.08rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.growth-book__entry-note {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.7;
  /* 用户写的换行是内容的一部分，原样保留。 */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.growth-book__entry-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.growth-book__entry-tag {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 10px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 999px;
  background: rgba(248, 251, 253, 0.96);
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 700;
}

.growth-book__entry-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding-top: 2px;
}

.growth-book__link-button {
  border: 0;
  background: none;
  color: var(--color-ink);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}

.growth-book__link-button:hover,
.growth-book__link-button:focus-visible {
  color: #1f6b51;
  outline: none;
}

.growth-book__link-button--danger:hover,
.growth-book__link-button--danger:focus-visible {
  color: #a23b56;
}

@media (max-width: 720px) {
  .growth-book__hero {
    padding: 16px;
    border-radius: 22px;
  }

  .growth-book__hero-actions {
    width: 100%;
  }

  .growth-book__hero-actions .growth-book__button {
    flex: 1 1 140px;
  }

  .growth-book__form {
    padding: 14px;
    border-radius: 20px;
  }

  .growth-book__input--date {
    max-width: none;
  }

  .growth-book__form-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  /* 窄屏上取消/提交各占一整行，主操作放最下面：拇指自然落点更靠近它。 */
  .growth-book__form-actions .growth-book__button {
    width: 100%;
  }

  .growth-book__entries {
    padding: 0 12px 14px;
  }

  .growth-book__entry {
    padding: 12px 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .growth-book__button,
  .growth-book__chip {
    transition: none;
  }

  .growth-book__button:hover:not(:disabled) {
    transform: none;
  }
}
</style>
