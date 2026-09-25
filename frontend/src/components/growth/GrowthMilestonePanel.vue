<script setup>
// 「她的成长」面板（Phase 2D-D1）：纪念册里的第二条记录线。
//
// 只做一件事：把她自己经历过的成长瞬间记下来——上课的情况、校园活动、兴趣变化、
// 第一次做到某件事。**不评价她**：没有优良中差、没有分数、没有成长指数、没有排名。
//
// 它自己取数、自己管表单，和「我们一起」（GrowthBookView 里的足迹时间线）互不干扰；
// 两条线共用同一个页面骨架与照片选择器，所以看起来仍是一本纪念册。
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import ConfirmDialog from "../ConfirmDialog.vue";
import FootprintPhotoPicker from "./FootprintPhotoPicker.vue";
import { useFootprintPhotos } from "../../composables/growth/useFootprintPhotos.js";
import { useGrowthMilestones } from "../../composables/growth/useGrowthMilestones.js";
import {
  MAX_MILESTONE_NOTE_LENGTH,
  MAX_MILESTONE_TITLE_LENGTH,
  MILESTONE_CATEGORIES,
  MILESTONE_CATEGORY_IDS,
  MILESTONE_EMPTY_TEXT,
  getMilestoneDateLimit
} from "../../utils/growthMilestones.js";

const growthMilestones = useGrowthMilestones();
const {
  monthGroups,
  isEmpty,
  isLoading,
  isSaving,
  isDeleting,
  errorMessage,
  load,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  uploadMilestonePhoto,
  deleteMilestonePhoto,
  validateDraft,
  clearFormErrors,
  clearErrorMessage
} = growthMilestones;

// 浏览器本地今天：日期默认值与「不能选到未来」的上界（与「我们一起」同一口径）。
const todayDateKey = getMilestoneDateLimit();

const isFormOpen = ref(false);
// 空串 = 正在新增；数字 = 正在编辑哪一条。
const editingMilestoneId = ref("");
const draft = ref(createEmptyDraft());
const draftIssues = ref([]);
const pendingDelete = ref(null);
const isDeleteConfirmOpen = ref(false);
const formAnchorRef = ref(null);
const titleInputRef = ref(null);

// 只有最新一个月默认展开（与「我们一起」同一套一次性记账，避免和用户的手动开合打架）。
const autoExpandedMonthKeys = new Set();

const footprintPhotos = useFootprintPhotos();
const {
  photos: formPhotos,
  pendingDataUrls: pendingPhotos,
  photoError,
  isPhotoBusy,
  maxPhotos,
  reset: resetPhotos,
  addFiles: addPhotoFiles,
  detachPendingPhoto,
  attachPhoto,
  removePhoto
} = footprintPhotos;

const titleLimit = MAX_MILESTONE_TITLE_LENGTH;
const noteLimit = MAX_MILESTONE_NOTE_LENGTH;
const isEditing = computed(() => editingMilestoneId.value !== "");
const draftTitleLength = computed(() => String(draft.value.title ?? "").trim().length);
const draftNoteLength = computed(() => String(draft.value.note ?? "").trim().length);
const formHeading = computed(() => (isEditing.value ? "修改这条成长记录" : "记下她的一个成长瞬间"));
const submitLabel = computed(() => {
  if (isSaving.value) {
    return "保存中…";
  }

  return isEditing.value ? "保存修改" : "收进成长纪念册";
});
const deleteDescription = computed(() =>
  pendingDelete.value ? `「${pendingDelete.value.title}」会从纪念册里移走，删掉就找不回来了。` : ""
);
const emptyText = MILESTONE_EMPTY_TEXT;

let abortController = null;

function createEmptyDraft() {
  return {
    occurredOn: todayDateKey,
    category: MILESTONE_CATEGORY_IDS[0],
    title: "",
    note: ""
  };
}

function issueMessageFor(field) {
  return [...draftIssues.value].find((issue) => issue.field === field)?.message || "";
}

const dateIssue = computed(() => issueMessageFor("occurredOn"));
const categoryIssue = computed(() => issueMessageFor("category"));
const titleIssue = computed(() => issueMessageFor("title"));
const noteIssue = computed(() => issueMessageFor("note"));

async function openCreateForm() {
  resetDraft();
  editingMilestoneId.value = "";
  isFormOpen.value = true;
  await focusForm();
}

async function openEditForm(milestone) {
  resetDraft();
  editingMilestoneId.value = String(milestone.id);
  draft.value = {
    occurredOn: milestone.occurredOn || todayDateKey,
    category: milestone.category,
    title: milestone.title,
    note: milestone.note
  };
  // 编辑时照片已经是服务端上的东西：显示出来，选一张传一张。
  footprintPhotos.applyServerPhotos(milestone.photos);
  isFormOpen.value = true;
  await focusForm();
}

function closeForm() {
  if (isSaving.value) {
    return;
  }

  isFormOpen.value = false;
  editingMilestoneId.value = "";
  resetDraft();
}

function resetDraft() {
  draft.value = createEmptyDraft();
  draftIssues.value = [];
  resetPhotos();
  clearFormErrors();
}

async function focusForm() {
  await nextTick();
  formAnchorRef.value?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  titleInputRef.value?.focus?.();
}

// 新增：照片先攒着，随保存一起提交。编辑：记录已经有 id，选一张传一张。
async function handleAddPhotos(files) {
  if (!isEditing.value) {
    await addPhotoFiles(files);
    return;
  }

  const milestoneId = Number(editingMilestoneId.value);

  if (!milestoneId) {
    return;
  }

  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const accepted = await addPhotoFiles([file]);

    if (!accepted) {
      return;
    }

    const [dataUrl] = pendingPhotos.value;

    detachPendingPhoto(0);

    // eslint-disable-next-line no-await-in-loop
    const didUpload = await attachPhoto(dataUrl, (value) => uploadMilestonePhoto(milestoneId, value));

    if (!didUpload) {
      return;
    }
  }
}

async function handleRemovePhoto(photo) {
  const milestoneId = Number(editingMilestoneId.value);

  if (!milestoneId) {
    return;
  }

  await removePhoto(photo.id, (photoId) => deleteMilestonePhoto(milestoneId, photoId));
}

function collectDraftIssues() {
  const result = validateDraft(draft.value);

  draftIssues.value = result.issues;
  return result.isValid;
}

async function handleSubmit() {
  if (isSaving.value || !collectDraftIssues()) {
    return;
  }

  const didSave = isEditing.value
    ? await updateMilestone(Number(editingMilestoneId.value), draft.value)
    : await createMilestone({ ...draft.value, photos: [...pendingPhotos.value] });

  if (didSave) {
    isFormOpen.value = false;
    editingMilestoneId.value = "";
    resetDraft();
  }
}

function requestDelete(milestone) {
  pendingDelete.value = milestone;
  isDeleteConfirmOpen.value = true;
}

async function confirmDelete() {
  if (!pendingDelete.value) {
    return;
  }

  const targetId = pendingDelete.value.id;
  const didDelete = await deleteMilestone(targetId);

  if (didDelete && String(editingMilestoneId.value) === String(targetId)) {
    closeForm();
  }

  isDeleteConfirmOpen.value = false;
  pendingDelete.value = null;
}

function cancelDelete() {
  isDeleteConfirmOpen.value = false;
  pendingDelete.value = null;
}

function formatDayLabel(dateKey) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);

  if (!matched) {
    return dateKey;
  }

  return `${Number.parseInt(matched[3], 10)} 日`;
}

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

defineExpose({ openCreateForm });
</script>

<template>
  <section class="milestones">
    <!-- 每条记录线都有自己的「记一件」入口：位置一致、文案不同，
         这样从「我们一起」切过来时不用猜该点哪里。 -->
    <div class="milestones__section-head">
      <h2 class="milestones__section-title">她自己的成长瞬间</h2>
      <button class="milestones__button milestones__button--primary" type="button" @click="openCreateForm">
        ✏️ 记一件她的事
      </button>
    </div>

    <p v-if="errorMessage" class="milestones__alert" role="alert">
      <span>{{ errorMessage }}</span>
      <button class="milestones__alert-action" type="button" @click="clearErrorMessage">知道了</button>
    </p>

    <!-- 新增 / 编辑共用一套表单：日期 / 类别 / 标题 / 一段记录 / 可选照片 -->
    <section v-if="isFormOpen" ref="formAnchorRef" class="milestones__form" aria-labelledby="milestones-form-title">
      <header class="milestones__form-head">
        <h2 id="milestones-form-title" class="milestones__form-title">{{ formHeading }}</h2>
        <button class="milestones__form-close" type="button" :disabled="isSaving" @click="closeForm">收起</button>
      </header>

      <form class="milestones__form-body" novalidate @submit.prevent="handleSubmit">
        <div class="milestones__field">
          <label class="milestones__label" for="milestones-date">哪一天</label>
          <input
            id="milestones-date"
            v-model="draft.occurredOn"
            class="milestones__input milestones__input--date"
            type="date"
            :max="todayDateKey"
          />
          <p v-if="dateIssue" class="milestones__field-issue">{{ dateIssue }}</p>
        </div>

        <fieldset class="milestones__field milestones__fieldset">
          <legend class="milestones__label">这是哪一类经历</legend>
          <div class="milestones__chips">
            <label
              v-for="category in MILESTONE_CATEGORIES"
              :key="category.id"
              :class="['milestones__chip', { 'milestones__chip--active': draft.category === category.id }]"
            >
              <input
                v-model="draft.category"
                class="milestones__chip-input"
                type="radio"
                name="milestones-category"
                :value="category.id"
              />
              <span>{{ category.displayLabel }}</span>
            </label>
          </div>
          <p v-if="categoryIssue" class="milestones__field-issue">{{ categoryIssue }}</p>
        </fieldset>

        <div class="milestones__field">
          <label class="milestones__label" for="milestones-title">这件事的标题</label>
          <input
            id="milestones-title"
            ref="titleInputRef"
            v-model="draft.title"
            class="milestones__input"
            type="text"
            :maxlength="titleLimit"
            placeholder="例如：第一次自己举手回答问题"
          />
          <p class="milestones__field-meta">{{ draftTitleLength }} / {{ titleLimit }} 字</p>
          <p v-if="titleIssue" class="milestones__field-issue">{{ titleIssue }}</p>
        </div>

        <div class="milestones__field">
          <label class="milestones__label" for="milestones-note">那天发生了什么</label>
          <textarea
            id="milestones-note"
            v-model="draft.note"
            class="milestones__input milestones__textarea"
            rows="4"
            :maxlength="noteLimit"
            placeholder="她做了什么、说了什么、后来怎么样了…"
          ></textarea>
          <p class="milestones__field-meta">{{ draftNoteLength }} / {{ noteLimit }} 字</p>
          <p v-if="noteIssue" class="milestones__field-issue">{{ noteIssue }}</p>
        </div>

        <FootprintPhotoPicker
          label="照片"
          :photos="formPhotos"
          :pending-data-urls="pendingPhotos"
          :footprint-id="Number(editingMilestoneId) || 0"
          :max-photos="maxPhotos"
          :is-busy="isPhotoBusy || isSaving"
          :error-message="photoError"
          @add-file="handleAddPhotos"
          @remove-photo="handleRemovePhoto"
          @remove-pending="detachPendingPhoto"
        />

        <div class="milestones__form-actions">
          <button class="milestones__button" type="button" :disabled="isSaving" @click="closeForm">先不记了</button>
          <button class="milestones__button milestones__button--primary" type="submit" :disabled="isSaving">
            {{ submitLabel }}
          </button>
        </div>
      </form>
    </section>

    <p v-if="isLoading && !monthGroups.length" class="milestones__state">正在翻开这一页…</p>

    <section v-else-if="isEmpty" class="milestones__empty">
      <span class="milestones__empty-glyph" aria-hidden="true">🌱</span>
      <h2 class="milestones__empty-title">这一页还是空的</h2>
      <p class="milestones__empty-text">{{ emptyText }}</p>
      <button class="milestones__button milestones__button--primary" type="button" @click="openCreateForm">
        记下第一个瞬间
      </button>
    </section>

    <div v-else class="milestones__months">
      <section v-for="month in monthGroups" :key="month.key" class="milestones__month">
        <details class="milestones__month-details" :open="isMonthAutoExpanded(month.key)">
          <summary class="milestones__month-summary">
            <span class="milestones__month-label">{{ month.label }}</span>
            <span class="milestones__month-count">{{ month.items.length }} 件事</span>
          </summary>

          <ol class="milestones__entries">
            <li v-for="milestone in month.items" :key="milestone.id" class="milestones__entry">
              <div class="milestones__entry-head">
                <span class="milestones__entry-date">{{ formatDayLabel(milestone.occurredOn) }}</span>
                <span class="milestones__entry-category">{{ milestone.categoryMeta.displayLabel }}</span>
              </div>

              <h3 class="milestones__entry-title">{{ milestone.title }}</h3>
              <p v-if="milestone.note" class="milestones__entry-note">{{ milestone.note }}</p>

              <ul v-if="milestone.photos.length" class="milestones__entry-photos">
                <li v-for="photo in milestone.photos" :key="photo.id" class="milestones__entry-photo">
                  <img
                    class="milestones__entry-photo-image"
                    :src="photo.url"
                    :alt="`${milestone.title} 的照片`"
                    loading="lazy"
                  />
                </li>
              </ul>

              <div class="milestones__entry-actions">
                <button class="milestones__link-button" type="button" @click="openEditForm(milestone)">改一改</button>
                <button
                  class="milestones__link-button milestones__link-button--danger"
                  type="button"
                  @click="requestDelete(milestone)"
                >
                  删掉
                </button>
              </div>
            </li>
          </ol>
        </details>
      </section>
    </div>

    <!-- 删除只要简单确认：说清楚删的是哪一条就够。 -->
    <ConfirmDialog
      v-model="isDeleteConfirmOpen"
      title-id="milestones-delete-confirm-title"
      semantic-tone="danger"
      heading-title="要把这条成长记录删掉吗？"
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
/* 这一页和「我们一起」共用同一套排版语言（容器 / 圆角 / 字色），
   只把描边换成淡绿色，一眼能看出是另一条线，但不像是另一个系统。 */
.milestones {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.milestones__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.milestones__section-title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.15rem;
}

.milestones__alert {
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

.milestones__alert-action {
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}

.milestones__form {
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

.milestones__form-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.milestones__form-title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.25rem;
}

.milestones__form-close {
  border: 0;
  background: none;
  color: var(--color-ink-soft);
  font: inherit;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}

.milestones__form-body {
  display: grid;
  gap: 14px;
}

.milestones__field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.milestones__fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}

.milestones__label {
  padding: 0;
  color: var(--color-ink);
  font-size: 0.95rem;
  font-weight: 800;
}

.milestones__input {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--color-ink);
  font: inherit;
}

.milestones__input:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.7);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.22);
}

.milestones__input--date {
  max-width: 220px;
}

.milestones__textarea {
  resize: vertical;
  line-height: 1.65;
}

.milestones__field-meta {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
}

.milestones__field-issue {
  margin: 0;
  color: #a23b56;
  font-size: 0.88rem;
  font-weight: 700;
}

.milestones__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.milestones__chip {
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

.milestones__chip:hover {
  border-color: rgba(124, 216, 184, 0.46);
}

.milestones__chip--active {
  border-color: rgba(124, 216, 184, 0.62);
  background: linear-gradient(180deg, rgba(184, 242, 223, 0.92) 0%, rgba(255, 255, 255, 0.94) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.milestones__chip-input {
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

.milestones__chip:focus-within {
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.28);
}

.milestones__button {
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

.milestones__button:hover:not(:disabled),
.milestones__button:focus-visible:not(:disabled) {
  border-color: rgba(124, 216, 184, 0.5);
  background: rgba(247, 252, 249, 0.98);
  box-shadow: 0 16px 24px -24px rgba(36, 50, 74, 0.42);
  outline: none;
  transform: translateY(-1px);
}

.milestones__button:disabled {
  cursor: progress;
  opacity: 0.72;
}

.milestones__button--primary {
  border-color: rgba(124, 216, 184, 0.52);
  background: linear-gradient(180deg, rgba(184, 242, 223, 0.94) 0%, rgba(255, 255, 255, 0.94) 100%);
}

.milestones__form-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.milestones__state,
.milestones__empty {
  margin: 0;
  padding: 18px;
  border: 1.5px dashed rgba(124, 216, 184, 0.42);
  border-radius: 22px;
  background: rgba(244, 253, 249, 0.72);
  color: var(--color-ink-soft);
  line-height: 1.7;
}

.milestones__empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 34px 22px;
  text-align: center;
}

.milestones__state {
  text-align: center;
}

.milestones__empty-glyph {
  font-size: 2.2rem;
}

.milestones__empty-title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.25rem;
}

.milestones__empty-text {
  margin: 0;
  max-width: 42ch;
  color: var(--color-ink-soft);
}

.milestones__months {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.milestones__month-details {
  border: 1.5px solid rgba(124, 216, 184, 0.36);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(247, 253, 250, 0.94) 0%, rgba(255, 255, 255, 0.9) 100%);
  box-shadow: 0 20px 30px -36px rgba(36, 50, 74, 0.28);
  overflow: hidden;
}

.milestones__month-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 18px;
  cursor: pointer;
  list-style: none;
}

.milestones__month-summary::-webkit-details-marker {
  display: none;
}

.milestones__month-summary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.28);
}

.milestones__month-label {
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.1rem;
}

.milestones__month-count {
  color: var(--color-ink-soft);
  font-size: 0.85rem;
  font-weight: 700;
}

.milestones__entries {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0 18px 18px;
  list-style: none;
}

.milestones__entry {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 14px 16px;
  border: 1.5px solid rgba(124, 216, 184, 0.24);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
}

.milestones__entry-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.milestones__entry-date {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(184, 242, 223, 0.5);
  color: var(--color-ink);
  font-size: 0.82rem;
  font-weight: 800;
}

.milestones__entry-category {
  color: var(--color-ink-soft);
  font-size: 0.86rem;
  font-weight: 700;
}

.milestones__entry-title {
  margin: 0;
  color: var(--color-ink);
  font-size: 1.08rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.milestones__entry-note {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.milestones__entry-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.milestones__entry-photo {
  width: 116px;
  height: 116px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.9);
}

.milestones__entry-photo-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.milestones__entry-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding-top: 2px;
}

.milestones__link-button {
  border: 0;
  background: none;
  color: var(--color-ink);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}

.milestones__link-button:hover,
.milestones__link-button:focus-visible {
  color: #1f6b51;
  outline: none;
}

.milestones__link-button--danger:hover,
.milestones__link-button--danger:focus-visible {
  color: #a23b56;
}

@media (max-width: 720px) {
  .milestones__form,
  .milestones__empty {
    padding: 14px;
    border-radius: 20px;
  }

  .milestones__input--date {
    max-width: none;
  }

  .milestones__form-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .milestones__form-actions .milestones__button {
    width: 100%;
  }

  .milestones__entries {
    padding: 0 12px 14px;
  }

  .milestones__entry {
    padding: 12px 13px;
  }

  .milestones__section-head .milestones__button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .milestones__button,
  .milestones__chip {
    transition: none;
  }

  .milestones__button:hover:not(:disabled) {
    transform: none;
  }
}
</style>
