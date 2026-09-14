<script setup>
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { useQuestionImportReview } from "../composables/import/useQuestionImportReview";

const props = defineProps({
  adminKey: {
    type: String,
    default: ""
  }
});
const emit = defineEmits(["imported", "update:adminKey"]);
const {
  commitResult,
  errorMessage,
  confirmErrorMessage,
  isLoadingBatch,
  isConfirming,
  isDiscarding,
  isReplaceConfirmOpen,
  lastRefreshedLabel,
  adminKeyModel,
  hasBatch,
  batchMode,
  batchModeLabel,
  batchSummary,
  batchCountLabel,
  batchSourceLabel,
  batchCreatedAtLabel,
  previewRows,
  previewRowsToShow,
  warningCountLabel,
  canConfirm,
  canDiscard,
  currentQuestionCountLabel,
  currentQuestionCount,
  reviewStatusTone,
  reviewStatusText,
  replaceConfirmDescription,
  resultTone,
  resultEyebrow,
  resultStatusLabel,
  resultTitle,
  resultText,
  resultStats,
  resultHint,
  refreshPendingBatch,
  handleConfirm,
  handleConfirmReplace,
  closeReplaceConfirm,
  handleDiscard
} = useQuestionImportReview({ props, emit });
</script>

<template>
  <section class="import-view">
    <div class="import-summary">
      <div class="import-summary__line">
        <span class="import-summary__item">
          <span class="import-summary__label">当前题库</span>
          <strong class="import-summary__value">{{ currentQuestionCountLabel }}</strong>
        </span>

        <span class="import-summary__item">
          <span class="import-summary__label">待确认批次</span>
          <strong class="import-summary__value">{{ batchCountLabel }}</strong>
        </span>

        <span class="import-summary__item">
          <span class="import-summary__label">批次来源</span>
          <strong class="import-summary__value">{{ batchSourceLabel }}</strong>
        </span>
      </div>

      <details class="import-summary__details">
        <summary class="import-summary__toggle">导入流程</summary>

        <ol class="import-summary__steps">
          <li class="import-summary__step">
            <strong>harness 提交</strong>
            <span>命令行解析表格并预检，有错误的批次不会进入队列。</span>
          </li>
          <li class="import-summary__step">
            <strong>页面核对</strong>
            <span>逐行查看重复题、相似题和系统给出的处理建议。</span>
          </li>
          <li class="import-summary__step">
            <strong>人工确认</strong>
            <span>确认后才写入题库，覆盖模式会先自动备份旧数据。</span>
          </li>
        </ol>
      </details>
    </div>

    <div class="import-view__workspace">
      <div class="import-view__main">
        <article class="import-card import-card--preview">
          <div class="import-card__header">
            <div>
              <p class="import-card__eyebrow">Import Review</p>
              <h3 class="import-card__subtitle">待确认批次</h3>
            </div>

            <div class="summary-chips">
              <span v-if="hasBatch" class="summary-chips__item">模式 {{ batchModeLabel }}</span>
              <span v-if="hasBatch" class="summary-chips__item">{{ warningCountLabel }}</span>
              <span class="summary-chips__item">刷新于 {{ lastRefreshedLabel }}</span>
            </div>
          </div>

          <div v-if="!hasBatch" class="placeholder-panel">
            <p class="placeholder-panel__title">
              {{ isLoadingBatch ? "正在检查待确认批次..." : "当前没有待确认批次" }}
            </p>
            <p class="placeholder-panel__text">
              在项目根目录运行
              <code class="command-hint">npm run questions:import &lt;文件.csv&gt; --stage</code>，
              预检通过后批次会出现在这里，等你在页面上确认。
            </p>

            <div class="import-card__actions">
              <button
                class="btn-cartoon btn-cartoon--mint"
                type="button"
                :disabled="isLoadingBatch"
                @click="refreshPendingBatch()"
              >
                {{ isLoadingBatch ? "刷新中..." : "刷新批次" }}
              </button>
            </div>

            <p v-if="errorMessage" class="import-card__message import-card__message--error">
              {{ errorMessage }}
            </p>
          </div>

          <template v-else>
            <div class="preview-summary">
              <div class="preview-summary__item">
                <span class="preview-summary__label">总行数</span>
                <strong class="preview-summary__value">{{ batchSummary.totalRows }}</strong>
              </div>
              <div class="preview-summary__item preview-summary__item--success">
                <span class="preview-summary__label">可导入</span>
                <strong class="preview-summary__value">{{ batchSummary.validRows }}</strong>
              </div>
              <div class="preview-summary__item preview-summary__item--warning">
                <span class="preview-summary__label">警告</span>
                <strong class="preview-summary__value">{{ batchSummary.warningRows }}</strong>
              </div>
              <div class="preview-summary__item preview-summary__item--error">
                <span class="preview-summary__label">错误</span>
                <strong class="preview-summary__value">{{ batchSummary.errorRows }}</strong>
              </div>
            </div>

            <div class="batch-meta">
              <span class="batch-meta__item">提交于 {{ batchCreatedAtLabel }}</span>
              <span class="batch-meta__item">预检时题库 {{ batchSummary.currentQuestionCount }} 题</span>
            </div>

            <p class="import-card__message" :class="`import-card__message--${reviewStatusTone}`">
              {{ reviewStatusText }}
            </p>

            <div class="preview-table">
              <div class="preview-table__head">
                <span>行号</span>
                <span>学科</span>
                <span>年级</span>
                <span>学期</span>
                <span>题目</span>
                <span>状态</span>
                <span>问题说明</span>
              </div>

              <div v-for="row in previewRowsToShow" :key="row.rowNumber" class="preview-table__row">
                <span>{{ row.rowNumber }}</span>
                <span>{{ row.subject || "-" }}</span>
                <span>{{ row.grade || "-" }}</span>
                <span>{{ row.semester || "-" }}</span>
                <span class="preview-table__content">{{ row.content || "-" }}</span>
                <span class="status-chip" :class="`status-chip--${row.status}`">
                  {{
                    row.status === "valid"
                      ? "通过"
                      : row.status === "warning"
                        ? "警告"
                      : "错误"
                  }}
                </span>
                <div class="preview-table__issues">
                  <template v-if="row.issues.length">
                    <div
                      v-for="(issue, issueIndex) in row.issues"
                      :key="`${row.rowNumber}-issue-${issueIndex}`"
                      class="preview-issue"
                    >
                      <p class="preview-issue__text">{{ issue.message }}</p>

                      <div v-if="issue.comparison" class="preview-comparison">
                        <div class="preview-comparison__meta">
                          <span class="preview-comparison__badge">{{ issue.comparison.title }}</span>
                          <span class="preview-comparison__target">{{ issue.comparison.targetLabel }}</span>
                          <span v-if="issue.comparison.similarityPercent !== null" class="preview-comparison__score">
                            相似度 {{ issue.comparison.similarityPercent }}%
                          </span>
                        </div>
                        <p class="preview-comparison__content">{{ issue.comparison.contentPreview }}</p>
                        <div v-if="issue.comparison.recommendation" class="preview-comparison__recommendation">
                          <span
                            class="preview-comparison__action"
                            :class="`preview-comparison__action--${issue.comparison.recommendation.tone}`"
                          >
                            {{ issue.comparison.recommendation.label }}
                          </span>
                          <p class="preview-comparison__reason">{{ issue.comparison.recommendation.reason }}</p>
                        </div>
                      </div>
                    </div>
                  </template>
                  <span v-else>无</span>
                </div>
              </div>
            </div>

            <p v-if="confirmErrorMessage" class="import-card__message import-card__message--error">
              {{ confirmErrorMessage }}
            </p>

            <div class="import-card__footer">
              <p v-if="previewRows.length > previewRowsToShow.length" class="import-card__hint">
                仅展示前 {{ previewRowsToShow.length }} 行，完整校验已覆盖全部数据。
              </p>
              <p v-else class="import-card__hint">
                批次由 harness 提交，这里只负责核对与放行。
              </p>

              <div class="import-card__actions">
                <button class="btn-cartoon" type="button" :disabled="!canDiscard" @click="handleDiscard">
                  {{ isDiscarding ? "丢弃中..." : "丢弃批次" }}
                </button>
                <button
                  class="btn-cartoon btn-cartoon--pink"
                  type="button"
                  :disabled="!canConfirm"
                  @click="handleConfirm"
                >
                  {{ isConfirming ? "导入中..." : batchMode === "replace" ? "确认覆盖导入" : "确认追加导入" }}
                </button>
              </div>
            </div>
          </template>
        </article>
      </div>

      <div class="import-view__sidebar">
        <article class="import-card import-card--access">
          <div class="import-card__header">
            <div>
              <p class="import-card__eyebrow">Access</p>
              <h3 class="import-card__subtitle">管理口令</h3>
            </div>
          </div>

          <input
            id="import-admin-key"
            v-model.trim="adminKeyModel"
            class="import-card__input"
            type="password"
            aria-label="管理口令"
            placeholder="可选：ADMIN_IMPORT_KEY"
          />
          <p class="import-card__hint">
            后端未配置 `ADMIN_IMPORT_KEY` 时，只有本机可以查看和确认批次。
          </p>
        </article>

        <article class="import-card import-card--reference">
          <div class="import-card__header">
            <div>
              <p class="import-card__eyebrow">Template Tips</p>
              <h3 class="import-card__subtitle">字段说明</h3>
            </div>
          </div>

          <div class="field-grid">
            <div class="field-grid__item">
              <strong>学科</strong>
              <span>仅支持 语文 / 数学 / 英语；一年级暂不支持英语</span>
            </div>
            <div class="field-grid__item">
              <strong>年级</strong>
              <span>仅支持 一年级 到 六年级</span>
            </div>
            <div class="field-grid__item">
              <strong>学期</strong>
              <span>支持 上册 / 下册 / 通用；一年级必须填上册或下册</span>
            </div>
            <div class="field-grid__item">
              <strong>答案</strong>
              <span>必须是 A / B / C / D</span>
            </div>
            <div class="field-grid__item">
              <strong>难度</strong>
              <span>仅支持 1 到 3 的整数</span>
            </div>
            <div class="field-grid__item">
              <strong>选项</strong>
              <span>当前固定为四选一</span>
            </div>
          </div>
        </article>

        <article class="import-card import-card--result">
          <div class="import-card__header">
            <div>
              <p class="import-card__eyebrow">Import Result</p>
              <h3 class="import-card__subtitle">导入结果</h3>
            </div>
          </div>

          <div :class="['result-panel', `result-panel--${resultTone}`]">
            <div class="result-panel__head">
              <div class="result-panel__copy">
                <p class="result-panel__eyebrow">{{ resultEyebrow }}</p>
                <h3 class="result-panel__title">{{ resultTitle }}</h3>
                <p class="result-panel__text">{{ resultText }}</p>
              </div>

              <span class="result-panel__status">{{ resultStatusLabel }}</span>
            </div>

            <div v-if="resultStats.length" class="result-panel__metrics">
              <div
                v-for="item in resultStats"
                :key="item.label"
                class="result-panel__metric"
              >
                <span class="result-panel__metric-label">{{ item.label }}</span>
                <strong class="result-panel__metric-value">{{ item.value }}</strong>
              </div>
            </div>

            <p class="result-panel__hint">{{ resultHint }}</p>

            <p v-if="commitResult?.backupPath" class="result-panel__backup">
              备份路径：{{ commitResult.backupPath }}
            </p>
          </div>
        </article>
      </div>
    </div>

    <ConfirmDialog
      v-model="isReplaceConfirmOpen"
      title-id="import-replace-confirm-title"
      semantic-tone="warning"
      heading-eyebrow="Import Guard"
      heading-title="确认覆盖导入"
      :heading-description="replaceConfirmDescription"
      close-label="关闭覆盖导入确认弹窗"
      panel-class="import-confirm-dialog"
      notice-text="覆盖导入会清空当前题库内容并写入新题。系统会先生成备份，但当前站点内容会立刻切换到新题库。"
      :chips="[
        `当前题库 ${currentQuestionCount} 题`,
        `本次导入 ${batchSummary?.validRows || 0} 题`
      ]"
      confirm-text="确认覆盖导入"
      confirm-loading-text="覆盖导入中..."
      :confirm-loading="isConfirming"
      :confirm-disabled="!canConfirm"
      :cancel-disabled="isConfirming"
      :status-text="confirmErrorMessage"
      status-tone="error"
      @confirm="handleConfirmReplace"
      @cancel="closeReplaceConfirm"
    >
      <template
        #actions="{
          handleCancel,
          handleConfirm,
          cancelText,
          confirmText,
          cancelDisabled,
          confirmDisabled,
          cancelButtonClasses,
          confirmButtonClasses
        }"
      >
        <div class="import-confirm-footer">
          <p class="import-confirm-footer__hint">
            导入完成后，可在右侧结果面板查看备份路径和最新题库数量。
          </p>

          <div class="import-confirm-footer__actions">
            <button :class="cancelButtonClasses" type="button" :disabled="cancelDisabled" @click="handleCancel">
              {{ cancelText }}
            </button>
            <button :class="confirmButtonClasses" type="button" :disabled="confirmDisabled" @click="handleConfirm">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </template>
    </ConfirmDialog>
  </section>
</template>

<style scoped>
:deep(.import-confirm-dialog) {
  width: min(560px, 100%);
}

.import-view {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
}

.import-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  min-width: 0;
  padding: 14px 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.92) 0%, rgba(255, 255, 255, 0.82) 100%);
  box-shadow: var(--shadow-soft);
}

.import-summary__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 18px;
}

.import-summary__item {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.import-summary__label {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.import-summary__value {
  color: var(--color-ink);
  font-size: 1rem;
  line-height: 1.35;
  word-break: break-word;
}

/* 注意：不要在 <details> 上设置 display，Chromium 下会破坏原生折叠；
   这里显式控制内容显隐，不依赖 UA 实现。 */
.import-summary__details:not([open]) .import-summary__steps {
  display: none;
}

.import-summary__toggle {
  width: fit-content;
  color: var(--color-ink-soft);
  font-size: 0.86rem;
  cursor: pointer;
  list-style: none;
}

.import-summary__toggle::-webkit-details-marker {
  display: none;
}

.import-summary__toggle::before {
  content: "▸";
  display: inline-block;
  margin-right: 6px;
  transition: transform 160ms ease;
}

.import-summary__details[open] .import-summary__toggle::before {
  transform: rotate(90deg);
}

.import-summary__toggle:hover,
.import-summary__toggle:focus-visible {
  color: var(--color-ink);
  outline: none;
}

.import-summary__steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 12px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.import-summary__step {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.62);
}

.import-summary__step strong {
  color: var(--color-ink);
  font-size: 0.94rem;
}

.import-summary__step span {
  color: var(--color-ink-soft);
  font-size: 0.86rem;
  line-height: 1.5;
}

.import-view__workspace {
  display: grid;
  /* 预检表格需要约 960px 才读得舒服：宽度够时并排侧栏，不够时自动改成上下布局。 */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 940px), 1fr));
  gap: 20px;
}

.import-view__main,
.import-view__sidebar {
  display: grid;
  /* 隐式列默认 auto，会被内部宽表格的 min-content 撑破；显式允许收缩。 */
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  align-content: start;
  min-width: 0;
}

.import-view__sidebar {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-items: start;
}

.import-confirm-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.import-confirm-footer__hint {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.92rem;
  line-height: 1.55;
}

.import-confirm-footer__actions {
  display: flex;
  gap: 12px;
}

.import-card {
  position: relative;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.92) 0%, rgba(255, 255, 255, 0.82) 100%);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(10px);
}

.import-card--preview,
.import-card--access,
.import-card--reference,
.import-card--result {
  padding: 24px;
}

.import-card__header,
.result-panel,
.placeholder-panel {
  position: relative;
  z-index: 1;
}

.import-card__eyebrow,
.result-panel__eyebrow {
  margin: 0 0 8px;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.import-card__title,
.import-card__subtitle,
.result-panel__title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  color: var(--color-ink);
}

.import-card__title {
  font-size: clamp(1.8rem, 3vw, 2.8rem);
}

.import-card__subtitle,
.result-panel__title {
  font-size: 1.45rem;
}

.import-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.import-card__header > div {
  min-width: 0;
}

.import-card__text,
.import-card__hint,
.placeholder-panel__text,
.result-panel__text,
.field-grid__item span,
.import-card__message {
  color: var(--color-ink-soft);
}

.import-card__text {
  margin: 14px 0 0;
  font-size: 1rem;
  line-height: 1.65;
}

.summary-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-content: start;
  justify-content: flex-end;
  min-width: 0;
}

.summary-chips__item {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 6px 12px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-ink);
  font-size: 0.88rem;
  line-height: 1.4;
}

.import-card__label {
  display: block;
  color: var(--color-ink);
  font-size: 0.95rem;
}

.import-card--access {
  display: grid;
  gap: 12px;
}

.import-card__input {
  width: 100%;
  min-height: 50px;
  padding: 12px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-ink);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.import-card__input:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.78);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.18);
}

.import-card__hint {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
}

.command-hint {
  display: inline-block;
  padding: 2px 8px;
  border: 1px solid rgba(36, 50, 74, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink);
  font-family: "SFMono-Regular", "Consolas", "Menlo", monospace;
  font-size: 0.88rem;
  word-break: break-all;
}

.batch-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.batch-meta__item {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 5px 12px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 999px;
  background: rgba(248, 251, 253, 0.9);
  color: var(--color-ink-soft);
  font-size: 0.84rem;
  line-height: 1.4;
}

.import-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.import-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 18px;
}

.import-card__footer .import-card__actions {
  margin-top: 0;
}

.import-card__message {
  margin: 16px 0 0;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  line-height: 1.55;
}

.import-card__message--error {
  color: #a23b56;
  background: rgba(255, 228, 236, 0.82);
}

.import-card__message--warning {
  color: #8a5b00;
  background: rgba(255, 245, 214, 0.94);
}

.import-card__message--success {
  color: #1f6b51;
  background: rgba(232, 252, 243, 0.92);
}

.preview-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.preview-summary__item {
  display: grid;
  gap: 6px;
  min-height: 86px;
  padding: 14px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
}

.preview-summary__item--success {
  background: rgba(232, 252, 243, 0.9);
}

.preview-summary__item--warning {
  background: rgba(255, 247, 220, 0.92);
}

.preview-summary__item--error {
  background: rgba(255, 238, 243, 0.9);
}

.preview-summary__label {
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-summary__value {
  color: var(--color-ink);
  font-size: 1.1rem;
}

.preview-table {
  margin-top: 16px;
  overflow: auto;
  border-radius: 22px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  background: rgba(255, 255, 255, 0.72);
}

.preview-table__head,
.preview-table__row {
  display: grid;
  grid-template-columns: 56px 76px 76px 76px minmax(0, 2fr) 64px minmax(0, 1.8fr);
  gap: 12px;
  align-items: start;
  padding: 14px 14px;
}

/* 表格列是固定语义宽度，窄屏时改为横向滚动，避免题干被压成一字一行。 */
.preview-table__head,
.preview-table__row {
  min-width: 880px;
}

.preview-table__head {
  background: rgba(242, 253, 249, 0.92);
  color: var(--color-ink-soft);
  font-size: 0.88rem;
}

.preview-table__row {
  background: rgba(255, 255, 255, 0.78);
  border-top: 1px solid rgba(36, 50, 74, 0.06);
  color: var(--color-ink);
  font-size: 0.94rem;
}

.preview-table__content,
.preview-table__issues {
  min-width: 0;
  white-space: normal;
  word-break: break-word;
}

.preview-table__issues {
  display: grid;
  gap: 10px;
}

.preview-issue {
  display: grid;
  gap: 8px;
}

.preview-issue__text {
  margin: 0;
  color: var(--color-ink);
  line-height: 1.55;
}

.preview-comparison {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(36, 50, 74, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.84);
}

.preview-comparison__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-comparison__badge,
.preview-comparison__target,
.preview-comparison__score {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  line-height: 1.4;
}

.preview-comparison__badge {
  background: rgba(255, 245, 214, 0.94);
  color: #8a5b00;
}

.preview-comparison__target {
  background: rgba(240, 247, 255, 0.92);
  color: var(--color-ink-soft);
}

.preview-comparison__score {
  background: rgba(232, 252, 243, 0.92);
  color: #1f6b51;
}

.preview-comparison__content {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.55;
}

.preview-comparison__recommendation {
  display: grid;
  gap: 8px;
  padding-top: 2px;
}

.preview-comparison__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  width: fit-content;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.4;
}

.preview-comparison__action--remove {
  background: rgba(255, 232, 232, 0.92);
  color: #b24545;
}

.preview-comparison__action--merge {
  background: rgba(255, 245, 214, 0.94);
  color: #8a5b00;
}

.preview-comparison__action--keep {
  background: rgba(232, 252, 243, 0.92);
  color: #1f6b51;
}

.preview-comparison__reason {
  margin: 0;
  color: var(--color-ink-soft);
  line-height: 1.55;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.86rem;
  width: fit-content;
}

.status-chip--valid {
  background: rgba(232, 252, 243, 0.92);
  color: #1f6b51;
}

.status-chip--warning {
  background: rgba(255, 245, 214, 0.94);
  color: #8a5b00;
}

.status-chip--error {
  background: rgba(255, 228, 236, 0.92);
  color: #a23b56;
}

.placeholder-panel {
  position: relative;
  z-index: 1;
  padding: 20px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 251, 230, 0.84) 0%, rgba(255, 255, 255, 0.78) 100%);
}

.placeholder-panel__title {
  margin: 0;
  color: var(--color-ink);
  font-size: 1.12rem;
}

.placeholder-panel__text {
  margin: 10px 0 0;
  line-height: 1.6;
}

.field-grid {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.field-grid__item {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  background: rgba(255, 255, 255, 0.76);
}

.result-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  gap: 16px;
  margin-top: 18px;
  padding: 20px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 251, 253, 0.84) 100%);
}

.result-panel--idle {
  background: linear-gradient(180deg, rgba(255, 251, 230, 0.9) 0%, rgba(255, 255, 255, 0.84) 100%);
}

.result-panel--pending {
  background: linear-gradient(180deg, rgba(240, 247, 255, 0.94) 0%, rgba(255, 255, 255, 0.86) 100%);
}

.result-panel--ready {
  background: linear-gradient(180deg, rgba(242, 253, 249, 0.94) 0%, rgba(255, 255, 255, 0.86) 100%);
}

.result-panel--warning {
  background: linear-gradient(180deg, rgba(255, 248, 223, 0.94) 0%, rgba(255, 255, 255, 0.86) 100%);
}

.result-panel--success {
  background: linear-gradient(180deg, rgba(232, 252, 243, 0.94) 0%, rgba(255, 255, 255, 0.86) 100%);
}

.result-panel--error {
  background: linear-gradient(180deg, rgba(255, 238, 243, 0.94) 0%, rgba(255, 255, 255, 0.86) 100%);
}

.result-panel__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 16px;
}

.result-panel__copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.result-panel__status {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 6px 12px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink);
  font-size: 0.84rem;
  white-space: nowrap;
}

.result-panel__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.result-panel__metric {
  display: grid;
  gap: 6px;
  min-height: 82px;
  padding: 13px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
}

.result-panel__metric-label {
  color: var(--color-ink-soft);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.result-panel__metric-value {
  color: var(--color-ink);
  font-size: 0.96rem;
  line-height: 1.45;
  word-break: break-word;
}

.result-panel__hint,
.result-panel__backup {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  line-height: 1.55;
}

.result-panel__backup {
  padding: 12px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  word-break: break-word;
}

/* 工具台内容区负责滚动，操作按钮固定在卡片底部，表格滚动时仍然可见。 */
@media (min-width: 1081px) {
  .import-card__footer {
    position: sticky;
    bottom: 0;
    z-index: 2;
    padding: 18px 0 6px;
    background: linear-gradient(
      180deg,
      rgba(255, 253, 248, 0) 0%,
      rgba(255, 253, 248, 0.97) 30%,
      rgba(255, 253, 248, 1) 100%
    );
  }
}

@media (max-width: 980px) {
  .import-summary__steps,
  .preview-summary,
  .result-panel__metrics {
    grid-template-columns: 1fr;
  }

  .summary-chips {
    justify-content: start;
  }

  .import-card__header,
  .import-card__footer,
  .import-confirm-footer,
  .result-panel__head {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 720px) {
  .import-summary,
  .import-card--preview,
  .import-card--access,
  .import-card--reference,
  .import-card--result {
    padding: 20px;
  }

  .import-card__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-chips {
    grid-auto-flow: row;
    grid-auto-columns: initial;
    justify-content: stretch;
  }

  .summary-chips__item {
    width: 100%;
  }

  .import-confirm-footer__actions,
  .import-card__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
