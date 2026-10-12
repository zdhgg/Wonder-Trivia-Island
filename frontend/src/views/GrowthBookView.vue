<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import BookMonthSection from "../components/growth/BookMonthSection.vue";
import BookRecordCard from "../components/growth/BookRecordCard.vue";
import GrowthRecordEditor from "../components/growth/GrowthRecordEditor.vue";
import PhotoLightbox from "../components/growth/PhotoLightbox.vue";
import { useGrowthBook } from "../composables/growth/useGrowthBook.js";
import { useGrowthMilestones } from "../composables/growth/useGrowthMilestones.js";
import { mergeFootprintTimelines } from "../utils/growthFootprints.js";
import { APP_ROUTE_NAME, GROWTH_BOOK_TAB, buildGrowthBookQuery, normalizeGrowthBookTab } from "../router/routes.js";

const router = useRouter();
const route = useRoute();
const footprints = useGrowthBook();
const milestones = useGrowthMilestones();
const editor = ref(null);
const drafts = ref([]);
const activeTab = computed(() => normalizeGrowthBookTab(route.query.tab));
const tabs = [
  { id: GROWTH_BOOK_TAB.ALL, label: "全部" },
  { id: GROWTH_BOOK_TAB.TOGETHER, label: "我们一起" },
  { id: GROWTH_BOOK_TAB.MILESTONES, label: "她的成长" }
];
const sources = { footprint: footprints, milestone: milestones };
const loadErrors = ref({ footprint: "", milestone: "" });
const relevantKinds = computed(() => activeTab.value === GROWTH_BOOK_TAB.ALL ? ["footprint", "milestone"] :
  [activeTab.value === GROWTH_BOOK_TAB.MILESTONES ? "milestone" : "footprint"]);
const isLoading = computed(() => relevantKinds.value.some((kind) => sources[kind].isLoading.value || !sources[kind].hasLoaded.value));
const visibleErrors = computed(() => relevantKinds.value.filter((kind) => loadErrors.value[kind]));
const monthGroups = computed(() => mergeFootprintTimelines({
  footprints: activeTab.value === GROWTH_BOOK_TAB.MILESTONES ? [] : footprints.footprints.value,
  milestones: activeTab.value === GROWTH_BOOK_TAB.TOGETHER ? [] : milestones.milestones.value
}));
const count = computed(() => monthGroups.value.reduce((total, month) => total + month.items.length, 0));
const savedKey = ref("");
const statusMessage = ref("");
const monthRefs = new Map();
const pendingDelete = ref(null);
const deleteError = ref("");
const isDeleteOpen = ref(false);
const isDeleting = computed(() => footprints.isDeleting.value || milestones.isDeleting.value);
const lightbox = ref({ open: false, photos: [], index: 0, title: "" });
let abortController;

async function loadKind(kind) {
  const source = sources[kind];
  const success = await source.load(abortController?.signal);
  if (!abortController?.signal.aborted) loadErrors.value[kind] = success ? "" : source.errorMessage.value;
}
async function switchTab(tab) {
  if (activeTab.value === tab) return;
  await router.replace({ name: APP_ROUTE_NAME.GROWTH_BOOK, query: buildGrowthBookQuery(tab) });
}
async function handleTabKey(event, index) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 :
    (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  await switchTab(tabs[next].id);
  document.getElementById(`book-tab-${tabs[next].id}`)?.focus();
}
function openCreate() {
  editor.value.open(null, activeTab.value === GROWTH_BOOK_TAB.MILESTONES ? "milestone" : "footprint");
}
async function saveRecord(kind, id, value) {
  const source = sources[kind];
  const save = kind === "milestone" ? (id ? source.updateMilestone : source.createMilestone) :
    (id ? source.updateFootprint : source.createFootprint);
  const result = id ? await save(id, value) : await save(value);
  if (!result) throw new Error(source.errorMessage.value || "没能保存，内容还在，可以再试一次。");
  return result;
}
async function revealSaved(record) {
  savedKey.value = `${record.kind}-${record.id}`;
  statusMessage.value = "已收进纪念册";
  if (!relevantKinds.value.includes(record.kind)) await switchTab(GROWTH_BOOK_TAB.ALL);
  // 等弹窗恢复焦点、列表更新后，再展开月份并把焦点交给保存的记录。
  await nextTick();
  await nextTick();
  monthRefs.get(record.occurredOn.slice(0, 7))?.open();
  await nextTick();
  const target = document.getElementById(`record-${savedKey.value}`);
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
function requestDelete(record) {
  pendingDelete.value = record;
  deleteError.value = "";
  isDeleteOpen.value = true;
}
async function confirmDelete() {
  if (!pendingDelete.value || isDeleting.value) return;
  const record = pendingDelete.value;
  const source = sources[record.kind];
  const remove = record.kind === "milestone" ? source.deleteMilestone : source.deleteFootprint;
  if (await remove(record.id)) {
    editor.value.forget(`${record.kind}-${record.id}`);
    isDeleteOpen.value = false;
    pendingDelete.value = null;
    statusMessage.value = "这条记录已删除";
  } else deleteError.value = source.errorMessage.value;
}
function openPhoto(record, index) {
  lightbox.value = { open: true, photos: record.photos, index, title: record.title };
}
onMounted(async () => {
  abortController = new AbortController();
  await Promise.all([loadKind("footprint"), loadKind("milestone")]);
});
onBeforeUnmount(() => abortController?.abort());
</script>

<template>
  <section class="growth-book">
    <header class="growth-book__hero">
      <div>
        <button class="growth-book__back" type="button" @click="router.push({ name: APP_ROUTE_NAME.HOME })">← 返回首页</button>
        <h1 class="growth-book__title">我们的成长纪念册</h1>
        <p class="growth-book__lead">留住一起经历的小事和她的成长瞬间。</p>
      </div>
      <button class="growth-book__button growth-book__button--primary" type="button" @click="openCreate"><span aria-hidden="true">＋</span> 记一笔</button>
    </header>
    <div class="growth-book__toolbar">
      <div class="growth-book__tabs" role="tablist" aria-label="纪念册的页签">
        <button v-for="(tab, index) in tabs" :id="`book-tab-${tab.id}`" :key="tab.id" class="growth-book__tab" type="button"
          role="tab" :aria-selected="activeTab === tab.id" aria-controls="book-records" :tabindex="activeTab === tab.id ? 0 : -1"
          @click="switchTab(tab.id)" @keydown="handleTabKey($event, index)">{{ tab.label }}</button>
      </div>
      <span v-if="!isLoading && !visibleErrors.length && count" class="growth-book__count">{{ count }} 个瞬间</span>
    </div>
    <div v-if="drafts.length" class="growth-book__drafts">
      <span>有未写完的记录</span>
      <button v-for="draft in drafts" :key="draft.key" type="button" @click="editor.resume(draft.key)">继续：{{ draft.title }}</button>
    </div>
    <p v-if="statusMessage" class="growth-book__status" role="status">{{ statusMessage }}</p>
    <section id="book-records" role="tabpanel" :aria-labelledby="`book-tab-${activeTab}`" :aria-busy="isLoading">
      <div v-for="kind in visibleErrors" :key="kind" class="growth-book__alert" role="alert">
        <div><strong>{{ kind === 'milestone' ? '她的成长' : '我们一起' }}暂时没能加载</strong><p>{{ loadErrors[kind] }}</p></div>
        <button class="growth-book__button" type="button" :disabled="sources[kind].isLoading.value" @click="loadKind(kind)">{{ sources[kind].isLoading.value ? '重试中…' : '重新加载' }}</button>
      </div>
      <p v-if="isLoading" class="growth-book__state" role="status">正在翻开纪念册…</p>
      <div v-if="monthGroups.length" class="growth-book__months">
        <BookMonthSection v-for="(month, index) in monthGroups" :key="`${activeTab}-${month.key}`"
          :ref="(instance) => instance ? monthRefs.set(month.key, instance) : monthRefs.delete(month.key)"
          :label="month.label" :count="month.items.length" :default-open="index === 0">
          <ol class="growth-book__entries">
            <li v-for="record in month.items" :key="`${record.kind}-${record.id}`">
              <BookRecordCard :record="record" :highlighted="savedKey === `${record.kind}-${record.id}`" :show-origin="activeTab === GROWTH_BOOK_TAB.ALL"
                @edit="editor.open($event)" @delete="requestDelete" @open-photo="openPhoto" />
            </li>
          </ol>
        </BookMonthSection>
      </div>
      <section v-else-if="!isLoading && !visibleErrors.length" class="growth-book__empty">
        <span class="growth-book__empty-glyph" aria-hidden="true">📖</span>
        <h2>{{ activeTab === GROWTH_BOOK_TAB.MILESTONES ? '这一页还是空的' : '纪念册还是空的' }}</h2>
        <p>一次出门、一句有趣的话，或一个小小的第一次，都值得记下来。</p>
        <button class="growth-book__button growth-book__button--primary" type="button" @click="openCreate">记下第一件事</button>
      </section>
    </section>
    <GrowthRecordEditor ref="editor" :save-record="saveRecord" @saved="revealSaved" @drafts-change="drafts = $event" />
    <ConfirmDialog v-model="isDeleteOpen" title-id="book-delete-title" semantic-tone="danger" heading-title="要把这条记录删掉吗？"
      :heading-description="pendingDelete ? `「${pendingDelete.title}」和照片会从纪念册里移走，删掉就找不回来了。` : ''"
      confirm-text="删掉这条" confirm-loading-text="正在删除…" :confirm-loading="isDeleting" :cancel-disabled="isDeleting"
      :status-text="deleteError" status-tone="danger" @confirm="confirmDelete" />
    <PhotoLightbox v-model="lightbox.open" :photos="lightbox.photos" :start-index="lightbox.index" :title="lightbox.title" />
  </section>
</template>

<style scoped>
.growth-book { display: grid; gap: 22px; padding-bottom: 40px; }
.growth-book__hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 4px 0 8px; }
.growth-book__back { padding: 4px 0; min-height: 32px; border: 0; background: transparent; color: var(--color-ink-soft); font: inherit; font-size: .85rem; cursor: pointer; }
.growth-book__title { margin: 12px 0 8px; font-size: clamp(1.6rem, 2.4vw, 2.1rem); line-height: 1.3; }
.growth-book__lead { margin: 0; color: var(--color-ink-soft); font-size: .95rem; line-height: 1.7; }
.growth-book__button { display: inline-flex; gap: 5px; justify-content: center; align-items: center; min-height: 44px; padding: 10px 18px; border: 1px solid #cedbd1; border-radius: 12px; background: #fff; color: var(--color-ink); font: inherit; font-weight: 650; white-space: nowrap; cursor: pointer; }
.growth-book__button--primary { background: #327b59; color: #fff; border-color: #327b59; }
.growth-book__button--primary:hover { background: #286b4c; }
.growth-book__button:disabled { opacity: .6; cursor: progress; }
.growth-book__toolbar { display: flex; justify-content: space-between; gap: 12px; align-items: center; border-bottom: 1px solid #d9e2d9; }
.growth-book__tabs { display: flex; gap: 24px; }
.growth-book__tab { position: relative; min-height: 46px; padding: 8px 2px 13px; border: 0; background: transparent; color: var(--color-ink-soft); font: inherit; cursor: pointer; }
.growth-book__tab[aria-selected="true"] { color: #246348; font-weight: 700; }
.growth-book__tab[aria-selected="true"]::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 3px; border-radius: 3px; background: #327b59; }
.growth-book__count { color: var(--color-ink-soft); font-size: .85rem; white-space: nowrap; }
.growth-book__drafts { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; font-size: .85rem; color: #596b5c; }
.growth-book__drafts button { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-height: 36px; padding: 6px 12px; background: #f3f8f1; border: 1px solid #cddfce; border-radius: 8px; color: #327b59; font: inherit; cursor: pointer; }
.growth-book__status { margin: 0; color: #327b59; font-size: .85rem; }
.growth-book__alert { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; border: 1px solid #e8cfc7; background: #fff8f5; border-radius: 12px; margin-bottom: 16px; }
.growth-book__alert p { margin: 6px 0 0; font-size: .85rem; }
.growth-book__state { color: var(--color-ink-soft); }
.growth-book__months { display: grid; gap: 10px; }
.growth-book__entries { display: grid; gap: 12px; padding: 0; margin: 0 0 8px; list-style: none; }
.growth-book__empty { padding: 44px 24px; border: 1px solid #e2e8de; border-radius: 20px; background: rgba(255,255,255,.72); text-align: center; }
.growth-book__empty-glyph { font-size: 2.2rem; }
.growth-book__empty h2 { margin: 16px 0 10px; font-size: 1.2rem; }
.growth-book__empty p { margin: 0 auto 22px; max-width: 32em; font-size: .95rem; line-height: 1.8; color: var(--color-ink-soft); }
button:focus-visible { outline: 3px solid #77b596; outline-offset: 3px; }
@media (max-width: 600px) {
  .growth-book { gap: 18px; }
  .growth-book__hero { flex-wrap: wrap; gap: 18px; }
  .growth-book__hero > .growth-book__button { width: 100%; }
  .growth-book__tabs { gap: 20px; }
  .growth-book__tab { font-size: .95rem; }
  .growth-book__empty { padding: 32px 18px; }
  .growth-book__alert { align-items: flex-start; flex-direction: column; }
}
</style>
