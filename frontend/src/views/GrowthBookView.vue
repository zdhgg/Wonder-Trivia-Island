<script setup>
// 我们的成长纪念册（Phase 2D-A2）：一个只需要「翻开就能看」的独立页面。
//
// 它刻意不做成任务 / 成就面板：
//   - 没有进度条、没有完成率、没有印章 / XP / 徽章；
//   - 唯一的动作是「记下今天一起做的事」，以及记错之后的改和删。
//
// 数据全部来自 /api/growth-footprints（服务端是唯一事实来源，刷新后仍在），
// 页面本身只负责表单交互与排版：分组 / 排序 / 校验都用 utils/growthFootprints 的纯函数。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import BookMonthSection from "../components/growth/BookMonthSection.vue";
import FootprintPhotoPicker from "../components/growth/FootprintPhotoPicker.vue";
import GrowthMilestonePanel from "../components/growth/GrowthMilestonePanel.vue";
import PhotoLightbox from "../components/growth/PhotoLightbox.vue";
import { useFootprintPhotos } from "../composables/growth/useFootprintPhotos.js";
import { useGrowthBook } from "../composables/growth/useGrowthBook.js";
import { useGrowthMilestones } from "../composables/growth/useGrowthMilestones.js";
import { normalizeMilestones } from "../utils/growthMilestones.js";
import { APP_ROUTE_NAME, GROWTH_BOOK_TAB, buildGrowthBookQuery, normalizeGrowthBookTab } from "../router/routes.js";
import {
  FOOTPRINT_CATEGORIES,
  FOOTPRINT_CATEGORY_IDS,
  FOOTPRINT_TAGS,
  MAX_FOOTPRINT_NOTE_LENGTH,
  MAX_FOOTPRINT_TITLE_LENGTH,
  buildMergedTimelineSummary,
  getLocalDateKey,
  mergeFootprintTimelines,
  normalizeFootprintText
} from "../utils/growthFootprints.js";

const router = useRouter();
const route = useRoute();
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
  uploadFootprintPhoto,
  deleteFootprintPhoto,
  clearFormErrors,
  clearErrorMessage
} = growthBook;

// 表单里的照片：新增时先攒着、随保存一起提交；编辑旧记录时选一张传一张。
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

const isFormOpen = ref(false);
// 空串 = 正在新增；数字 = 正在编辑哪一条。
const editingFootprintId = ref("");

// 纪念册的三个页签：全部（按日期混排）/ 我们一起（足迹）/ 她的成长（成长记录）。
// 用 ?tab= 记录当前在哪一页，刷新和分享链接都能回到同一页；默认页签不带参数。
const activeTab = ref(normalizeGrowthBookTab(route.query?.tab));
const milestonePanelRef = ref(null);
const isTogetherTab = computed(() => activeTab.value === GROWTH_BOOK_TAB.TOGETHER);
const isMilestonesTab = computed(() => activeTab.value === GROWTH_BOOK_TAB.MILESTONES);
const isAllTab = computed(() => activeTab.value === GROWTH_BOOK_TAB.ALL);

// 「全部」页签的数据：两条线各自的 composable 已经取好了，这里只做展示层混排。
// 注意 useGrowthMilestones 必须在父组件里也建一份（而不是只活在子面板里），
// 这样「全部」不挂载子面板时也有数据；两个实例各自请求一次是这台设备上的本地接口，代价可忽略。
// 「全部」页签的数据：两条线各自的 composable 都在这里持有。
// 「她的成长」面板通过 props 用同一份数据——这样「全部」和「她的成长」看到的
// 永远是同一次请求的结果，也不会因为切换页签出现两份不一致的列表。
const milestonesData = useGrowthMilestones();
// state 里是「展示状态」（通过 props 传给面板），动作仍然直接从 composable 上取。
const milestoneState = milestonesData.state;
const { load: loadMilestones } = milestonesData;
const mergedMonthGroups = computed(() =>
  mergeFootprintTimelines({
    footprints: growthBook.footprints.value,
    // 成长记录由它自己的归一化负责（两条线的归一化不能混在一起做）。
    milestones: normalizeMilestones(milestonesData.milestones.value)
  })
);
const mergedSummary = computed(() =>
  buildMergedTimelineSummary({
    footprints: growthBook.footprints.value,
    milestones: normalizeMilestones(milestonesData.milestones.value)
  })
);
const isMergedLoading = computed(
  () => !mergedSummary.value.hasRecords && (growthBook.isLoading.value || milestoneState.isLoading.value)
);

// 照片大图：记住「点开的是哪条记录的哪一张」，一组照片就是这一条记录自己的照片。
const lightboxPhotos = ref([]);
const lightboxStartIndex = ref(0);
const lightboxTitle = ref("");
const isLightboxOpen = ref(false);

function openLightbox(record, photoIndex = 0) {
  const photos = Array.isArray(record?.photos) ? record.photos : [];

  if (photos.length === 0) {
    return;
  }

  lightboxPhotos.value = photos;
  lightboxStartIndex.value = photoIndex;
  lightboxTitle.value = String(record.title ?? "");
  isLightboxOpen.value = true;
}
const draft = ref(createEmptyDraft());
const draftIssues = ref([]);
const pendingDelete = ref(null);
const isDeleteConfirmOpen = ref(false);
const formAnchorRef = ref(null);
const dateInputRef = ref(null);

// 月份组的展开状态由 BookMonthSection 自己管，页面只需要说明「最新那个月要展开」。

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
  resetPhotos();
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
  // 编辑时照片已经是服务端上的东西：显示出来，选一张传一张。
  footprintPhotos.applyServerPhotos(footprint.photos);
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

// 新增：照片先攒在本地（随保存一起提交）。
// 编辑：记录已经有 id，所以一张一张直接传上去，界面立刻能看出来哪些已经存好了。
async function handleAddPhotos(files) {
  if (!isEditing.value) {
    await addPhotoFiles(files);
    return;
  }

  const footprintId = Number(editingFootprintId.value);

  if (!footprintId) {
    return;
  }

  for (const file of files) {
    // 每次都从「一张」开始：压缩和校验规则与新增完全同一套，只是传完就发。
    // eslint-disable-next-line no-await-in-loop
    const accepted = await addPhotoFiles([file]);

    if (!accepted) {
      return;
    }

    const [dataUrl] = pendingPhotos.value;

    detachPendingPhoto(0);

    // eslint-disable-next-line no-await-in-loop
    const didUpload = await attachPhoto(dataUrl, (value) => uploadFootprintPhoto(footprintId, value));

    if (!didUpload) {
      return;
    }
  }
}

async function handleRemovePhoto(photo) {
  const footprintId = Number(editingFootprintId.value);

  if (!footprintId) {
    return;
  }

  await removePhoto(photo.id, (photoId) => deleteFootprintPhoto(footprintId, photoId));
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
    // 新增时把还没上传的照片一起提交：服务端在同一个 savepoint 里写记录 + 照片。
    : await createFootprint({ ...draft.value, photos: [...pendingPhotos.value] });

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

// 切换页签：地址栏跟着变（replace，不往后退栈里塞两步）。
// 每个页签的「记一件」由各自的区域提供，切换时不会硬塞一个表单给用户。
function switchTab(tabId) {
  const normalizedTab = normalizeGrowthBookTab(tabId);

  if (activeTab.value === normalizedTab) {
    return;
  }

  activeTab.value = normalizedTab;
  void router.replace({
    name: APP_ROUTE_NAME.GROWTH_BOOK,
    query: buildGrowthBookQuery(normalizedTab)
  });
}

// 「全部」只是翻看：想改哪一条，就跳回它自己那条线去改。
// 这样聚合页不需要同时维护「删足迹」和「删成长记录」两套确认流程。
function editRecordFromAll(record) {
  if (record?.kind === "milestone") {
    switchTab(GROWTH_BOOK_TAB.MILESTONES);
    void nextTick(() => milestonePanelRef.value?.openEditForm?.(record));
    return;
  }

  switchTab(GROWTH_BOOK_TAB.TOGETHER);
  void nextTick(() => openEditForm(record));
}

// 浏览器前进 / 后退时，页签跟着 URL 走。
watch(
  () => route.query?.tab,
  (tab) => {
    const normalizedTab = normalizeGrowthBookTab(tab);

    if (normalizedTab !== activeTab.value) {
      activeTab.value = normalizedTab;
    }
  }
);

function formatDayLabel(dateKey) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);

  if (!matched) {
    return dateKey;
  }

  return `${Number.parseInt(matched[3], 10)} 日`;
}

// 月份组默认展开规则：**只有最新的那个月**。具体是否展开由 BookMonthSection 在挂载时决定一次，
// 之后交给浏览器和用户（详情见那个组件的注释）。
function isLatestMonth(monthKey, groups) {
  return groups[0]?.key === monthKey;
}

onMounted(async () => {
  abortController = typeof AbortController === "function" ? new AbortController() : null;
  // 两条线都在这里加载：默认页签是「全部」，它需要两边的数据都在。
  // 「她的成长」面板直接用这份数据，不会再请求一次。
  await Promise.all([
    load(abortController?.signal),
    loadMilestones(abortController?.signal)
  ]);
});

onBeforeUnmount(() => {
  abortController?.abort?.();
});
</script>

<template>
  <section class="growth-book">
    <header class="growth-book__hero">
      <div class="growth-book__hero-copy">
        <p class="growth-book__eyebrow">成长纪念册</p>
        <h1 class="growth-book__title">我们的成长纪念册</h1>
        <p class="growth-book__lead">
          一起做过的事记在「我们一起」，她自己的成长瞬间记在「她的成长」。翻回去看的时候，都是真的。
        </p>
      </div>

      <div class="growth-book__hero-actions">
        <button class="growth-book__button" type="button" @click="goHome">返回首页</button>
      </div>
    </header>

    <!-- 三个页签：全部（按日期混排）是翻看用的，两条线各自保留自己的记录入口。 -->
    <div class="growth-book__tabs" role="tablist" aria-label="纪念册的页签">
      <button
        :class="['growth-book__tab', { 'growth-book__tab--active': isAllTab }]"
        type="button"
        role="tab"
        :aria-selected="isAllTab"
        @click="switchTab(GROWTH_BOOK_TAB.ALL)"
      >
        <span aria-hidden="true">📖</span> 全部
      </button>
      <button
        :class="['growth-book__tab', { 'growth-book__tab--active': isTogetherTab }]"
        type="button"
        role="tab"
        :aria-selected="isTogetherTab"
        @click="switchTab(GROWTH_BOOK_TAB.TOGETHER)"
      >
        <span aria-hidden="true">👨‍👧</span> 我们一起
      </button>
      <button
        :class="['growth-book__tab', { 'growth-book__tab--active': isMilestonesTab }]"
        type="button"
        role="tab"
        :aria-selected="isMilestonesTab"
        @click="switchTab(GROWTH_BOOK_TAB.MILESTONES)"
      >
        <span aria-hidden="true">🌱</span> 她的成长
      </button>
    </div>

    <!-- 「全部」：两条线按真实日期混排，只读翻看；点「改一改」会跳到它自己那条线。 -->
    <template v-if="isAllTab">
      <p class="growth-book__count">{{ mergedSummary.countText }}</p>

      <p v-if="isMergedLoading" class="growth-book__state">正在翻开纪念册…</p>

      <section v-else-if="!mergedSummary.hasRecords" class="growth-book__empty">
        <span class="growth-book__empty-glyph" aria-hidden="true">📖</span>
        <h2 class="growth-book__empty-title">纪念册还是空的</h2>
        <p class="growth-book__empty-text">
          一起做的事记在「我们一起」，她自己的成长记在「她的成长」。两边的记录都会出现在这一页。
        </p>
      </section>

      <div v-else class="growth-book__months">
        <section v-for="(month, monthIndex) in mergedMonthGroups" :key="month.key" class="growth-book__month">
          <BookMonthSection :label="month.label" :count="month.items.length" :default-open="monthIndex === 0">
            <ol class="growth-book__entries">
              <li
                v-for="item in month.items"
                :key="`${item.kind}-${item.id}`"
                :class="['growth-book__entry', `growth-book__entry--${item.kind}`]"
              >
                <div class="growth-book__entry-head">
                  <span class="growth-book__entry-date">{{ formatDayLabel(item.occurredOn) }}</span>
                  <span class="growth-book__entry-category">{{ item.categoryMeta.displayLabel }}</span>
                  <!-- 两条线要一眼看出区别：只加一个小小的来源标记，不做第二套排版。 -->
                  <span
                    :class="[
                      'growth-book__entry-origin',
                      `growth-book__entry-origin--${item.kind === 'milestone' ? 'milestone' : 'together'}`
                    ]"
                  >
                    {{ item.kind === "milestone" ? "🌱 她的成长" : "👨‍👧 我们一起" }}
                  </span>
                </div>

                <h3 class="growth-book__entry-title">{{ item.title }}</h3>
                <p v-if="item.note" class="growth-book__entry-note">{{ item.note }}</p>

                <ul v-if="item.photos.length" class="growth-book__entry-photos">
                  <li v-for="(photo, photoIndex) in item.photos" :key="photo.id" class="growth-book__entry-photo">
                    <button
                      class="growth-book__entry-photo-button"
                      type="button"
                      :aria-label="`看大图：${item.title} 的第 ${photoIndex + 1} 张照片`"
                      @click="openLightbox(item, photoIndex)"
                    >
                      <img
                        class="growth-book__entry-photo-image"
                        :src="photo.url"
                        :alt="`${item.title} 的照片`"
                        loading="lazy"
                      />
                    </button>
                  </li>
                </ul>

                <div class="growth-book__entry-actions">
                  <button class="growth-book__link-button" type="button" @click="editRecordFromAll(item)">改一改</button>
                </div>
              </li>
            </ol>
          </BookMonthSection>
        </section>
      </div>
    </template>

    <!-- 第二条线：她自己的成长记录。数据由本页持有，和「全部」共用同一份。 -->
    <GrowthMilestonePanel
      v-else-if="isMilestonesTab"
      ref="milestonePanelRef"
      v-bind="milestoneState"
      :create-milestone="milestonesData.createMilestone"
      :update-milestone="milestonesData.updateMilestone"
      :delete-milestone="milestonesData.deleteMilestone"
      :upload-milestone-photo="milestonesData.uploadMilestonePhoto"
      :delete-milestone-photo="milestonesData.deleteMilestonePhoto"
      :validate-draft="milestonesData.validateDraft"
      :clear-form-errors="milestonesData.clearFormErrors"
      :clear-error-message="milestonesData.clearErrorMessage"
      @open-photo="openLightbox"
    />

    <template v-else>
      <p class="growth-book__count">{{ summary.countText }}</p>

      <div class="growth-book__section-head">
        <h2 class="growth-book__section-title">我们一起做过的事</h2>
        <button class="growth-book__button growth-book__button--primary" type="button" @click="openCreateForm">
          ✏️ 记一件新的事
        </button>
      </div>

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

        <!-- 照片：新增时随保存一起提交，编辑旧记录时选一张传一张。 -->
        <FootprintPhotoPicker
          :photos="formPhotos"
          :pending-data-urls="pendingPhotos"
          :footprint-id="Number(editingFootprintId) || 0"
          :max-photos="maxPhotos"
          :is-busy="isPhotoBusy || isSaving"
          :error-message="photoError"
          @add-file="handleAddPhotos"
          @remove-photo="handleRemovePhoto"
          @remove-pending="detachPendingPhoto"
        />

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
      <section v-for="(month, monthIndex) in monthGroups" :key="month.key" class="growth-book__month">
        <BookMonthSection :label="month.label" :count="month.items.length" :default-open="monthIndex === 0">
          <ol class="growth-book__entries">
            <li
              v-for="footprint in month.items"
              :key="footprint.id"
              class="growth-book__entry growth-book__entry--footprint"
            >
              <div class="growth-book__entry-head">
                <span class="growth-book__entry-date">{{ formatDayLabel(footprint.occurredOn) }}</span>
                <span class="growth-book__entry-category">{{ footprint.categoryMeta.displayLabel }}</span>
              </div>

              <h3 class="growth-book__entry-title">{{ footprint.title }}</h3>
              <p v-if="footprint.note" class="growth-book__entry-note">{{ footprint.note }}</p>

              <!-- 照片排在正文之后：先读文字，再看那天的样子。点开可以看大图。 -->
              <ul v-if="footprint.photos.length" class="growth-book__entry-photos">
                <li v-for="(photo, photoIndex) in footprint.photos" :key="photo.id" class="growth-book__entry-photo">
                  <button
                    class="growth-book__entry-photo-button"
                    type="button"
                    :aria-label="`看大图：${footprint.title} 的第 ${photoIndex + 1} 张照片`"
                    @click="openLightbox(footprint, photoIndex)"
                  >
                    <img
                      class="growth-book__entry-photo-image"
                      :src="photo.url"
                      :alt="`${footprint.title} 的照片`"
                      loading="lazy"
                    />
                  </button>
                </li>
              </ul>

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
        </BookMonthSection>
      </section>
    </div>

    <!-- 删除只要简单确认：说清楚删的是哪一条就够，不需要输入标题。 -->
    <ConfirmDialog
      v-if="isTogetherTab"
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
    </template>

    <!-- 大图浏览：三条页签共用同一个组件；一组照片就是点开那条记录自己的照片。 -->
    <PhotoLightbox
      v-model="isLightboxOpen"
      :photos="lightboxPhotos"
      :start-index="lightboxStartIndex"
      :title="lightboxTitle"
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

/* 两条记录线的切换：像给纪念册分了两页，而不是两个不同的系统。 */
.growth-book__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.growth-book__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 8px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-ink-soft);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.growth-book__tab:hover {
  border-color: rgba(124, 216, 184, 0.46);
  color: var(--color-ink);
}

.growth-book__tab:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.8);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.22);
}

.growth-book__tab--active {
  border-color: rgba(124, 216, 184, 0.62);
  background: linear-gradient(180deg, rgba(184, 242, 223, 0.92) 0%, rgba(255, 255, 255, 0.94) 100%);
  color: var(--color-ink);
}

.growth-book__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.growth-book__section-title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.15rem;
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

/* 月份组的外框与标题在 BookMonthSection 里（那部分样式跟着组件走，
   因为它同时被这条线和「她的成长」使用）。 */

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

/* 「全部」页签用来区分两条线的来源标记：只在混排时出现，小到不抢眼。 */
.growth-book__entry-origin {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 10px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
}

.growth-book__entry-origin--together {
  background: rgba(255, 244, 226, 0.9);
  color: #8a5b00;
}

.growth-book__entry-origin--milestone {
  background: rgba(236, 252, 245, 0.94);
  color: #1f6b51;
}

/* 混排时两条线各留一点底色，扫一眼就能分出「我们一起」和「她的成长」。 */
.growth-book__entry--milestone {
  border-color: rgba(124, 216, 184, 0.28);
  background: rgba(249, 255, 252, 0.96);
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

/* 纪念册里的照片：一排小图，点开看原图（浏览器自带行为），不做灯箱。 */
.growth-book__entry-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.growth-book__entry-photo {
  width: 116px;
  height: 116px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.9);
}

/* 缩略图本身就是按钮：整块可点，点开看大图。 */
.growth-book__entry-photo-button {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.growth-book__entry-photo-button:hover,
.growth-book__entry-photo-button:focus-visible {
  outline: none;
}

.growth-book__entry-photo-button:focus-visible {
  box-shadow: inset 0 0 0 3px rgba(124, 216, 184, 0.9);
}

.growth-book__entry-photo-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
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

  /* 窄屏上三个页签平分一行，一眼能看出是三页。 */
  .growth-book__tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .growth-book__tab {
    justify-content: center;
  }

  .growth-book__section-head .growth-book__button {
    width: 100%;
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
