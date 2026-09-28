<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { fetchProposalReviewList, reviewProposal } from "../services/proposalsApi";

const props = defineProps({
  adminKey: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["update:adminKey"]);

const STATUS_TABS = Object.freeze([
  { value: "pending", label: "待审核" },
  { value: "accepted", label: "已确认" },
  { value: "rejected", label: "已拒绝" }
]);
const TYPE_LABELS = Object.freeze({
  focus_mark: "重点标记",
  common_mistake: "易错点",
  knowledge_update: "知识补充 / 修正",
  question_type_advice: "题型 / 出题建议"
});

const activeStatus = ref("pending");
const proposals = ref([]);
const isLoading = ref(false);
const isReviewing = ref(0);
const errorMessage = ref("");
const actionMessage = ref("");
const reviewNotes = reactive({});

const adminKeyModel = computed({
  get: () => props.adminKey,
  set: (value) => emit("update:adminKey", value)
});
const activeStatusLabel = computed(() => STATUS_TABS.find((tab) => tab.value === activeStatus.value)?.label || "proposal");

function formatJson(value) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? "");
  }
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN", { hour12: false });
}

function proposalTypeLabel(type) {
  return TYPE_LABELS[type] || type || "未知类型";
}

function statusLabel(status) {
  return STATUS_TABS.find((tab) => tab.value === status)?.label || status;
}

async function loadProposals() {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const payload = await fetchProposalReviewList({
      status: activeStatus.value,
      adminKey: props.adminKey
    });
    proposals.value = payload.data;
  } catch (error) {
    errorMessage.value = error.message || "加载 proposal 失败。";
  } finally {
    isLoading.value = false;
  }
}

async function handleReview(proposal, decision) {
  isReviewing.value = proposal.id;
  errorMessage.value = "";
  actionMessage.value = "";

  try {
    await reviewProposal({
      proposalId: proposal.id,
      decision,
      reviewNote: reviewNotes[proposal.id] || "",
      adminKey: props.adminKey
    });
    await loadProposals();
    actionMessage.value = decision === "accepted" ? "提案已确认，保留在动态知识补充中。" : "提案已拒绝。";
  } catch (error) {
    errorMessage.value = error.message || "审核 proposal 失败。";
  } finally {
    isReviewing.value = 0;
  }
}

function selectStatus(status) {
  activeStatus.value = status;
}

watch(
  activeStatus,
  () => {
    loadProposals();
  }
);

onMounted(loadProposals);
</script>

<template>
  <section class="proposal-review-view">
    <div class="proposal-review-summary">
      <div class="proposal-review-summary__line">
        <span class="proposal-review-summary__item">
          <span class="proposal-review-summary__label">当前视图</span>
          <strong class="proposal-review-summary__value">{{ activeStatusLabel }}</strong>
        </span>
        <span class="proposal-review-summary__item">
          <span class="proposal-review-summary__label">提案数量</span>
          <strong class="proposal-review-summary__value">{{ proposals.length }}</strong>
        </span>
        <span class="proposal-review-summary__item">
          <span class="proposal-review-summary__label">确认含义</span>
          <strong class="proposal-review-summary__value">动态知识补充</strong>
        </span>
      </div>
      <p class="proposal-review-summary__hint">
        accepted 只代表系统内人工确认，不会修改题库、错题记录或静态知识文件。
      </p>
    </div>

    <div class="proposal-review-workspace">
      <div class="proposal-review-main">
        <article class="proposal-review-card proposal-review-card--list">
          <header class="proposal-review-card__header">
            <div>
              <p class="proposal-review-card__eyebrow">External AI Proposal</p>
              <h3 class="proposal-review-card__title">知识建议审核</h3>
            </div>
            <button class="proposal-review-card__refresh" type="button" :disabled="isLoading" @click="loadProposals">
              {{ isLoading ? "刷新中..." : "刷新" }}
            </button>
          </header>

          <div class="proposal-review-tabs" role="tablist" aria-label="proposal 状态">
            <button
              v-for="tab in STATUS_TABS"
              :key="tab.value"
              :class="['proposal-review-tab', { 'proposal-review-tab--active': activeStatus === tab.value }]"
              type="button"
              role="tab"
              :aria-selected="activeStatus === tab.value"
              @click="selectStatus(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>

          <p v-if="errorMessage" class="proposal-review-message proposal-review-message--error">{{ errorMessage }}</p>
          <p v-if="actionMessage" class="proposal-review-message proposal-review-message--success">{{ actionMessage }}</p>

          <div v-if="isLoading" class="proposal-review-empty">
            <strong>正在读取提案...</strong>
          </div>
          <div v-else-if="!proposals.length" class="proposal-review-empty">
            <strong>{{ activeStatusLabel }}暂无 proposal</strong>
            <span>Harness 提交后，提案会出现在这里。</span>
          </div>

          <div v-else class="proposal-review-list">
            <article v-for="proposal in proposals" :key="proposal.id" class="proposal-card">
              <header class="proposal-card__header">
                <div class="proposal-card__heading">
                  <span class="proposal-card__id">#{{ proposal.id }}</span>
                  <h4 class="proposal-card__title">{{ proposalTypeLabel(proposal.type) }}</h4>
                </div>
                <div class="proposal-card__meta">
                  <span :class="['proposal-status', `proposal-status--${proposal.status}`]">{{ statusLabel(proposal.status) }}</span>
                  <time :datetime="proposal.createdAt">{{ formatDate(proposal.createdAt) }}</time>
                </div>
              </header>

              <div class="proposal-card__scope">
                <span class="proposal-card__label">作用范围</span>
                <pre>{{ formatJson(proposal.scope) }}</pre>
              </div>

              <div class="proposal-card__content-grid">
                <section>
                  <span class="proposal-card__label">AI 建议</span>
                  <pre>{{ formatJson(proposal.suggestion) }}</pre>
                </section>
                <section>
                  <span class="proposal-card__label">来源</span>
                  <pre>{{ formatJson(proposal.source) }}</pre>
                </section>
                <section class="proposal-card__evidence">
                  <span class="proposal-card__label">证据</span>
                  <pre>{{ formatJson(proposal.evidence) }}</pre>
                </section>
              </div>

              <div v-if="proposal.status === 'pending'" class="proposal-card__review">
                <label class="proposal-card__label" :for="`proposal-note-${proposal.id}`">审核备注（可选）</label>
                <textarea
                  :id="`proposal-note-${proposal.id}`"
                  v-model="reviewNotes[proposal.id]"
                  class="proposal-card__note"
                  rows="2"
                  placeholder="写下接受或拒绝的原因，方便后续回看。"
                ></textarea>
                <div class="proposal-card__actions">
                  <button
                    class="btn-cartoon btn-cartoon--pink"
                    type="button"
                    :disabled="isReviewing === proposal.id"
                    @click="handleReview(proposal, 'accepted')"
                  >
                    {{ isReviewing === proposal.id ? "处理中..." : "接受" }}
                  </button>
                  <button
                    class="btn-cartoon"
                    type="button"
                    :disabled="isReviewing === proposal.id"
                    @click="handleReview(proposal, 'rejected')"
                  >
                    拒绝
                  </button>
                </div>
              </div>

              <div v-else class="proposal-card__decision">
                <span class="proposal-card__label">审核备注</span>
                <p>{{ proposal.reviewNote || "未填写" }}</p>
                <time v-if="proposal.reviewedAt" :datetime="proposal.reviewedAt">审核于 {{ formatDate(proposal.reviewedAt) }}</time>
              </div>
            </article>
          </div>
        </article>
      </div>

      <aside class="proposal-review-sidebar">
        <article class="proposal-review-card proposal-review-card--access">
          <header class="proposal-review-card__header">
            <div>
              <p class="proposal-review-card__eyebrow">Review Access</p>
              <h3 class="proposal-review-card__title">管理口令</h3>
            </div>
          </header>
          <input
            id="proposal-admin-key"
            v-model.trim="adminKeyModel"
            class="proposal-review-card__input"
            type="password"
            aria-label="管理口令"
            placeholder="可选：ADMIN_IMPORT_KEY"
          />
          <p class="proposal-review-card__hint">
            审核入口复用现有管理访问规则；未配置管理口令时仅本机可访问。
          </p>
        </article>

        <article class="proposal-review-card proposal-review-card--guide">
          <header class="proposal-review-card__header">
            <div>
              <p class="proposal-review-card__eyebrow">Review Contract</p>
              <h3 class="proposal-review-card__title">审核边界</h3>
            </div>
          </header>
          <ul class="proposal-review-guide">
            <li>接受后作为动态知识补充供 Gateway 查询。</li>
            <li>不会自动改题库、错题、复习计划或静态知识目录。</li>
            <li>题型建议只保留建议，不会创建新题型。</li>
          </ul>
        </article>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.proposal-review-view {
  display: grid;
  gap: 14px;
}

.proposal-review-summary,
.proposal-review-card {
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(251, 254, 255, 0.98) 0%, rgba(248, 251, 253, 0.94) 100%);
  box-shadow:
    0 18px 30px -30px rgba(36, 50, 74, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.proposal-review-summary {
  padding: 16px 18px;
}

.proposal-review-summary__line {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.proposal-review-summary__item {
  display: grid;
  gap: 3px;
}

.proposal-review-summary__label,
.proposal-card__label {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.proposal-review-summary__value {
  color: var(--color-ink, #24324a);
  font-size: 1rem;
}

.proposal-review-summary__hint,
.proposal-review-card__hint {
  margin: 12px 0 0;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.82rem;
  line-height: 1.6;
}

.proposal-review-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 18px;
  align-items: start;
}

.proposal-review-main,
.proposal-review-sidebar {
  min-width: 0;
}

.proposal-review-sidebar {
  display: grid;
  gap: 14px;
}

.proposal-review-card {
  padding: 18px;
}

.proposal-review-card__header,
.proposal-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.proposal-review-card__eyebrow {
  margin: 0 0 4px;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.proposal-review-card__title,
.proposal-card__title {
  margin: 0;
  color: var(--color-ink, #24324a);
}

.proposal-review-card__title {
  font-size: 1.1rem;
}

.proposal-review-card__refresh {
  min-height: 36px;
  padding: 7px 13px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink, #24324a);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.proposal-review-card__refresh:disabled {
  cursor: wait;
  opacity: 0.62;
}

.proposal-review-tabs {
  display: flex;
  gap: 7px;
  margin: 18px 0 14px;
  padding: 5px;
  border-radius: 14px;
  background: rgba(231, 239, 245, 0.72);
}

.proposal-review-tab {
  flex: 1;
  min-height: 34px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--color-ink-soft, #5b6984);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 800;
  cursor: pointer;
}

.proposal-review-tab--active {
  background: #fff;
  color: var(--color-ink, #24324a);
  box-shadow: 0 6px 14px -12px rgba(36, 50, 74, 0.6);
}

.proposal-review-message {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 0.84rem;
  line-height: 1.5;
}

.proposal-review-message--error {
  background: rgba(255, 229, 232, 0.82);
  color: #a63d4b;
}

.proposal-review-message--success {
  background: rgba(220, 249, 236, 0.82);
  color: #277450;
}

.proposal-review-empty {
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 48px 18px;
  border: 1px dashed rgba(36, 50, 74, 0.16);
  border-radius: 16px;
  color: var(--color-ink-soft, #5b6984);
  text-align: center;
}

.proposal-review-empty strong {
  color: var(--color-ink, #24324a);
}

.proposal-review-list {
  display: grid;
  gap: 12px;
}

.proposal-card {
  display: grid;
  gap: 14px;
  padding: 15px;
  border: 1px solid rgba(36, 50, 74, 0.1);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.8);
}

.proposal-card__heading,
.proposal-card__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.proposal-card__id,
.proposal-card__meta time,
.proposal-card__decision time {
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.76rem;
}

.proposal-card__title {
  font-size: 1rem;
}

.proposal-status {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 900;
}

.proposal-status--pending {
  background: rgba(255, 239, 196, 0.92);
  color: #8b6514;
}

.proposal-status--accepted {
  background: rgba(216, 247, 231, 0.94);
  color: #267351;
}

.proposal-status--rejected {
  background: rgba(255, 226, 230, 0.94);
  color: #a23f4c;
}

.proposal-card__scope,
.proposal-card__content-grid > section,
.proposal-card__decision {
  display: grid;
  gap: 6px;
}

.proposal-card__content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.proposal-card__content-grid .proposal-card__evidence {
  grid-column: 1 / -1;
}

.proposal-card pre {
  max-height: 180px;
  margin: 0;
  overflow: auto;
  padding: 10px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 11px;
  background: rgba(244, 248, 250, 0.94);
  color: #42516a;
  font-family: "Cascadia Code", Consolas, monospace;
  font-size: 0.76rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.proposal-card__review {
  display: grid;
  gap: 8px;
  padding-top: 2px;
  border-top: 1px solid rgba(36, 50, 74, 0.08);
}

.proposal-card__note,
.proposal-review-card__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(36, 50, 74, 0.14);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-ink, #24324a);
  font: inherit;
}

.proposal-card__note {
  resize: vertical;
  padding: 9px 10px;
  line-height: 1.5;
}

.proposal-review-card__input {
  min-height: 40px;
  margin-top: 14px;
  padding: 8px 10px;
}

.proposal-card__note:focus-visible,
.proposal-review-card__input:focus-visible,
.proposal-review-card__refresh:focus-visible,
.proposal-review-tab:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.64);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.2);
}

.proposal-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.proposal-card__decision p {
  margin: 0;
  color: var(--color-ink, #24324a);
  font-size: 0.86rem;
  line-height: 1.55;
  white-space: pre-wrap;
}

.proposal-review-guide {
  display: grid;
  gap: 9px;
  margin: 16px 0 0;
  padding-left: 18px;
  color: var(--color-ink-soft, #5b6984);
  font-size: 0.82rem;
  line-height: 1.55;
}

@media (max-width: 900px) {
  .proposal-review-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .proposal-review-sidebar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .proposal-review-sidebar,
  .proposal-card__content-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .proposal-card__content-grid .proposal-card__evidence {
    grid-column: auto;
  }
}
</style>
