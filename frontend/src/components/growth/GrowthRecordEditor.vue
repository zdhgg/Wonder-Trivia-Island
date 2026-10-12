<script setup>
import { computed, nextTick, ref } from "vue";
import ModalDialog from "../ModalDialog.vue";
import FootprintPhotoPicker from "./FootprintPhotoPicker.vue";
import { useFootprintPhotos } from "../../composables/growth/useFootprintPhotos.js";
import { FOOTPRINT_CATEGORIES, FOOTPRINT_TAGS, getLocalDateKey, validateFootprintDraft } from "../../utils/growthFootprints.js";
import { MILESTONE_CATEGORIES, validateMilestoneDraft } from "../../utils/growthMilestones.js";

const props = defineProps({ saveRecord: { type: Function, required: true } });
const emit = defineEmits(["saved", "drafts-change"]);
const isOpen = ref(false);
const isSaving = ref(false);
const kind = ref("footprint");
const editingId = ref(0);
const draft = ref({ title: "", occurredOn: "", note: "", tags: [], category: "together" });
const moreOpen = ref(false);
const issues = ref([]);
const error = ref("");
const today = ref(getLocalDateKey());
const originalPhotoIds = ref([]);
const photos = useFootprintPhotos();
const { photos: savedPhotos, pendingDataUrls, photoError, isPhotoBusy, maxPhotos } = photos;
const drafts = new Map();
let currentKey = "new";
let originalDraft = "";
const isEditing = computed(() => editingId.value > 0);
const isBusy = computed(() => isSaving.value || isPhotoBusy.value);
const categories = computed(() => kind.value === "milestone" ? MILESTONE_CATEGORIES : FOOTPRINT_CATEGORIES);
const yesterday = computed(() => {
  const date = new Date(`${today.value}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return getLocalDateKey(date);
});
const heading = computed(() => isEditing.value ? "修改这条记录" : "记下一个瞬间");
const issueFor = (field) => issues.value.find((issue) => issue.field === field)?.message;

function reportDrafts() {
  emit("drafts-change", [...drafts.entries()].map(([key, value]) => ({ key, title: value.draft.title || "未写完的记录" })));
}
function snapshot() {
  return {
    draft: structuredClone({ ...draft.value, tags: [...draft.value.tags] }),
    kind: kind.value, editingId: editingId.value, moreOpen: moreOpen.value,
    photos: savedPhotos.value.map((photo) => ({ ...photo })), pending: [...pendingDataUrls.value],
    originalPhotoIds: [...originalPhotoIds.value], originalDraft
  };
}
function hasChanges() {
  if (!isEditing.value) return Boolean(draft.value.title.trim() || draft.value.note.trim() || pendingDataUrls.value.length);
  return JSON.stringify(draft.value) !== originalDraft || pendingDataUrls.value.length > 0 ||
    savedPhotos.value.length !== originalPhotoIds.value.length;
}
function close() {
  if (isBusy.value) return;
  if (hasChanges()) drafts.set(currentKey, snapshot());
  else drafts.delete(currentKey);
  isOpen.value = false;
  reportDrafts();
}
function restore(value) {
  draft.value = { ...value.draft, tags: [...value.draft.tags] };
  kind.value = value.kind;
  editingId.value = value.editingId;
  moreOpen.value = value.moreOpen;
  originalPhotoIds.value = [...value.originalPhotoIds];
  originalDraft = value.originalDraft;
  photos.reset(value.photos);
  pendingDataUrls.value = [...value.pending];
}
function open(record = null, preferredKind = "footprint") {
  today.value = getLocalDateKey();
  currentKey = record ? `${record.kind}-${record.id}` : "new";
  if (drafts.has(currentKey)) restore(drafts.get(currentKey));
  else {
    kind.value = record?.kind || preferredKind;
    editingId.value = record?.id || 0;
    draft.value = {
      title: record?.title || "", occurredOn: record?.occurredOn || today.value,
      note: record?.note || "", tags: [...(record?.tags || [])],
      category: record?.category || (kind.value === "milestone" ? "growth" : "together")
    };
    originalDraft = JSON.stringify(draft.value);
    originalPhotoIds.value = (record?.photos || []).map((photo) => photo.id);
    photos.reset(record?.photos || []);
    moreOpen.value = Boolean(record?.note || record?.tags?.length);
  }
  issues.value = [];
  error.value = "";
  isOpen.value = true;
}
function resume(key) {
  const cached = drafts.get(key);
  if (!cached) return;
  currentKey = key;
  today.value = getLocalDateKey();
  restore(cached);
  issues.value = [];
  error.value = "";
  isOpen.value = true;
}
function forget(key) {
  drafts.delete(key);
  reportDrafts();
}
function discard() {
  if (isBusy.value) return;
  forget(currentKey);
  isOpen.value = false;
}
function changeKind(value) {
  if (isEditing.value || kind.value === value) return;
  kind.value = value;
  draft.value.category = value === "milestone" ? "growth" : "together";
  issues.value = [];
}
function toggleTag(id) {
  draft.value.tags = draft.value.tags.includes(id) ? draft.value.tags.filter((tag) => tag !== id) : [...draft.value.tags, id];
}
async function submit() {
  if (isBusy.value) return;
  const validate = kind.value === "milestone" ? validateMilestoneDraft : validateFootprintDraft;
  const result = validate(draft.value);
  issues.value = result.issues.map((issue) => issue.field === "title" && !draft.value.title.trim()
    ? { ...issue, message: "写一句想记住的事吧。" } : issue);
  error.value = "";
  if (!result.isValid) {
    if (issues.value.some((issue) => ["category", "note", "tags"].includes(issue.field))) moreOpen.value = true;
    await nextTick();
    document.querySelector(".record-editor [aria-invalid='true']")?.focus();
    return;
  }
  isSaving.value = true;
  try {
    const record = await props.saveRecord(kind.value, editingId.value, {
      ...result.value,
      ...(isEditing.value ? {
        addedPhotos: [...pendingDataUrls.value],
        removedPhotoIds: originalPhotoIds.value.filter((id) => !savedPhotos.value.some((photo) => photo.id === id))
      } : { photos: [...pendingDataUrls.value] })
    });
    forget(currentKey);
    isOpen.value = false;
    emit("saved", { ...record, kind: kind.value });
    photos.reset();
  } catch (saveError) {
    error.value = saveError?.message || "没能保存，内容还在，可以再试一次。";
  } finally {
    isSaving.value = false;
  }
}
defineExpose({ open, resume, forget });
</script>

<template>
  <ModalDialog :model-value="isOpen" title-id="record-editor-title" :heading-title="heading"
    heading-description="一句话就够，照片和细节可以慢慢补。" close-button-text="收起"
    close-label="收起并保留草稿" panel-class="record-editor" :disable-close="isBusy"
    initial-focus-selector="#record-title" @update:model-value="close">
    <form class="record-editor__form" novalidate @submit.prevent="submit">
      <fieldset class="record-editor__fields" :disabled="isBusy">
        <div class="record-editor__field">
          <label for="record-title">一句话记下这件事</label>
          <input id="record-title" v-model="draft.title" type="text" maxlength="40" required
            :aria-invalid="Boolean(issueFor('title'))" aria-describedby="record-title-hint"
            placeholder="例如：今天第一次自己骑车去公园" />
          <p id="record-title-hint" :class="{ 'record-editor__error': issueFor('title') }">
            {{ issueFor('title') || '最多 40 字，详细经过可以在下方补充。' }}
          </p>
        </div>
        <div class="record-editor__field">
          <label for="record-date">哪一天</label>
          <div class="record-editor__date">
            <button type="button" :aria-pressed="draft.occurredOn === today" @click="draft.occurredOn = today">今天</button>
            <button type="button" :aria-pressed="draft.occurredOn === yesterday" @click="draft.occurredOn = yesterday">昨天</button>
            <input id="record-date" v-model="draft.occurredOn" type="date" :max="today"
              :aria-invalid="Boolean(issueFor('occurredOn'))" aria-describedby="record-date-error" />
          </div>
          <p v-if="issueFor('occurredOn')" id="record-date-error" class="record-editor__error">{{ issueFor('occurredOn') }}</p>
        </div>
        <FootprintPhotoPicker label="照片（可选）" :photos="savedPhotos" :pending-data-urls="pendingDataUrls"
          :max-photos="maxPhotos" :is-busy="isBusy" :error-message="photoError"
          @add-file="photos.addFiles" @remove-pending="photos.detachPendingPhoto"
          @remove-photo="savedPhotos = savedPhotos.filter((item) => item.id !== $event.id)" />
        <fieldset class="record-editor__kind">
          <legend>收录到</legend>
          <template v-if="!isEditing">
            <label :class="{ selected: kind === 'footprint' }">
              <input type="radio" name="record-kind" :checked="kind === 'footprint'" @change="changeKind('footprint')" />我们一起
            </label>
            <label :class="{ selected: kind === 'milestone' }">
              <input type="radio" name="record-kind" :checked="kind === 'milestone'" @change="changeKind('milestone')" />她的成长
            </label>
          </template>
          <span v-else>{{ kind === 'milestone' ? '她的成长' : '我们一起' }}</span>
        </fieldset>
        <button class="record-editor__more" type="button" :aria-expanded="moreOpen" aria-controls="record-details" @click="moreOpen = !moreOpen">
          <span aria-hidden="true">{{ moreOpen ? '−' : '＋' }}</span> {{ moreOpen ? '收起补充信息' : '补充细节、分类' }}<span class="record-editor__optional">可选</span>
        </button>
        <div v-if="moreOpen" id="record-details" class="record-editor__details">
          <div class="record-editor__field">
            <label for="record-note">那天发生了什么（可选）</label>
            <textarea id="record-note" v-model="draft.note" rows="3" maxlength="500"
              :aria-invalid="Boolean(issueFor('note'))" placeholder="她说了什么、当时的样子，或你想记住的细节…"></textarea>
            <p :class="{ 'record-editor__error': issueFor('note') }">{{ issueFor('note') || `${draft.note.length} / 500 字` }}</p>
          </div>
          <div class="record-editor__field">
            <label for="record-category">分类</label>
            <select id="record-category" v-model="draft.category" :aria-invalid="Boolean(issueFor('category'))">
              <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.label }}</option>
            </select>
            <p v-if="issueFor('category')" class="record-editor__error">{{ issueFor('category') }}</p>
          </div>
          <fieldset v-if="kind === 'footprint'" class="record-editor__tags">
            <legend>小标记（可选）</legend>
            <button v-for="tag in FOOTPRINT_TAGS" :key="tag.id" type="button" :aria-pressed="draft.tags.includes(tag.id)" @click="toggleTag(tag.id)">{{ tag.label }}</button>
          </fieldset>
        </div>
      </fieldset>
      <p v-if="error" class="record-editor__error" role="alert">{{ error }}</p>
      <footer class="record-editor__footer">
        <button type="button" class="record-editor__discard" :disabled="isBusy" @click="discard">{{ isEditing ? '放弃修改' : '清空草稿' }}</button>
        <button type="button" :disabled="isBusy" @click="close">稍后继续</button>
        <button class="record-editor__save" type="submit" :disabled="isBusy">{{ isSaving ? '保存中…' : isPhotoBusy ? '正在处理照片…' : isEditing ? '保存修改' : '收进纪念册' }}</button>
      </footer>
    </form>
  </ModalDialog>
</template>

<style>
.record-editor.modal-dialog__panel { width: min(640px, 100%); border-radius: 22px; background: #fff; }
.record-editor.modal-dialog__panel::before { display: none; }
.record-editor .modal-dialog__title { font-family: inherit; font-size: 1.35rem; line-height: 1.4; }
.record-editor .modal-dialog__header { display: flex; align-items: center; padding: 20px 24px 16px; }
.record-editor .modal-dialog__close { width: auto; min-height: 38px; padding: 6px 12px; border-radius: 10px; font-weight: 500; }
.record-editor .modal-dialog__content { padding: 20px 24px 0; }
.record-editor__fields { display: grid; gap: 22px; border: 0; padding: 0; margin: 0; min-width: 0; }
.record-editor__field { display: grid; gap: 8px; min-width: 0; }
.record-editor label, .record-editor legend { font-size: .9rem; font-weight: 650; }
.record-editor input[type="text"], .record-editor input[type="date"], .record-editor textarea, .record-editor select {
  width: 100%; min-width: 0; min-height: 44px; padding: 10px 12px; border: 1px solid #ced6d3;
  border-radius: 10px; color: var(--color-ink); background: white; font: inherit; box-sizing: border-box;
}
.record-editor textarea { resize: vertical; line-height: 1.65; }
.record-editor p { margin: 0; color: var(--color-ink-soft); font-size: .8rem; line-height: 1.6; }
.record-editor__date { display: flex; gap: 8px; }
.record-editor__date input { flex: 1; }
.record-editor button { cursor: pointer; font: inherit; }
.record-editor__date button, .record-editor__tags button, .record-editor__footer button {
  min-height: 42px; padding: 8px 14px; border: 1px solid #dce3df; border-radius: 10px; background: #fff; color: var(--color-ink); white-space: nowrap;
}
.record-editor button:disabled { opacity: .55; cursor: progress; }
.record-editor button[aria-pressed="true"] { background: #e5f5ec; border-color: #6daf92; color: #246348; }
.record-editor :is(button, input, select, textarea):focus-visible { outline: 3px solid #69af91; outline-offset: 3px; }
.record-editor [aria-invalid="true"] { border-color: #b1463f; }
.record-editor .record-editor__error { color: #a63730; }
.record-editor__kind { border: 0; margin: 0; padding: 0; display: flex; gap: 10px; align-items: center; }
.record-editor__kind legend { margin-bottom: 8px; }
.record-editor__kind label { display: flex; gap: 7px; align-items: center; padding: 9px 12px; border: 1px solid #dce3df; border-radius: 10px; cursor: pointer; font-weight: 500; }
.record-editor__kind label.selected { border-color: #6daf92; background: #f0f8f3; }
.record-editor__kind input { accent-color: #327b59; }
.record-editor__more { text-align: left; display: flex; align-items: center; gap: 6px; padding: 14px 0; border: 0; border-top: 1px solid #e9edea; background: transparent; color: #395749; }
.record-editor__optional { margin-left: auto; font-size: .8rem; color: var(--color-ink-soft); }
.record-editor__details { display: grid; gap: 20px; }
.record-editor__tags { padding: 0; margin: 0; border: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.record-editor__tags legend { margin-bottom: 10px; }
.record-editor__tags button { min-height: 36px; font-size: .85rem; padding: 6px 10px; }
.record-editor__footer { position: sticky; bottom: 0; z-index: 1; display: flex; gap: 8px; padding: 16px 0; margin-top: 18px; border-top: 1px solid #e9edea; background: #fff; }
.record-editor__footer .record-editor__discard { margin-right: auto; border: 0; padding-left: 0; font-size: .82rem; color: var(--color-ink-soft); }
.record-editor__footer .record-editor__save { background: #327b59; color: #fff; border-color: #327b59; font-weight: 650; }
.record-editor .footprint-photos__note { display: none; }
.record-editor .footprint-photos__add { box-shadow: none; border-radius: 10px; background: #f7faf8; transform: none; }
@media (max-width: 480px) {
  .record-editor .modal-dialog__header { padding: 16px; }
  .record-editor .modal-dialog__content { padding: 16px 16px 0; }
  .record-editor__date { flex-wrap: wrap; }
  .record-editor__date input { flex-basis: 100%; }
  .record-editor__footer { flex-wrap: wrap; }
  .record-editor__footer button { padding: 8px 10px; font-size: .9rem; }
}
</style>
