<script setup>
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { useQuestionImportDisplay } from "../composables/import/useQuestionImportDisplay";
import { useQuestionImportRuntime } from "../composables/import/useQuestionImportRuntime";

const props = defineProps({
  adminKey: {
    type: String,
    default: ""
  }
});
const emit = defineEmits(["imported", "update:adminKey"]);
const {
  AI_SUBJECT_OPTIONS,
  AI_GRADE_OPTIONS,
  AI_SEMESTER_OPTIONS,
  AI_DIFFICULTY_OPTIONS,
  AI_COUNT_OPTIONS,
  fileInputRef,
  importMode,
  selectedFileName,
  parsedRows,
  parseMessage,
  previewResult,
  commitResult,
  statsErrorMessage,
  currentQuestionCount,
  isDragging,
  isStatsLoading,
  isPreviewLoading,
  isCommitLoading,
  isReplaceImportConfirmOpen,
  replaceImportErrorMessage,
  aiImportSubject,
  aiImportGrade,
  aiImportSemester,
  aiImportDifficulty,
  aiImportCount,
  aiImportTopic,
  aiImportGuidance,
  aiImportReferenceText,
  isAiGenerating,
  aiGenerationStatusMessage,
  aiGenerationErrorMessage,
  adminKeyModel,
  hasParsedRows,
  parsedRowCount,
  hasPreviewErrors,
  hasPreviewWarnings,
  previewRows,
  previewRowsToShow,
  importModeLabel,
  currentQuestionCountLabel,
  selectedFileSummary,
  canCommit,
  handleFileChange,
  handleDrop,
  handleDragOver,
  handleDragLeave,
  handlePreview,
  handleGenerateAiBatch,
  handleCommit,
  closeReplaceImportConfirm,
  handleConfirmReplaceImport,
  openFileDialog,
  downloadCsvTemplate
} = useQuestionImportRuntime({ props, emit });
const {
  previewStatusTone,
  previewStatusText,
  replaceImportDescription,
  importResultTone,
  importResultEyebrow,
  importResultStatusLabel,
  importResultTitle,
  importResultText,
  importResultStats,
  importResultHint
} = useQuestionImportDisplay({
  importMode,
  selectedFileName,
  parseMessage,
  previewResult,
  commitResult,
  statsErrorMessage,
  currentQuestionCountLabel,
  isPreviewLoading,
  isCommitLoading,
  isAiGenerating,
  aiImportSubject,
  aiImportGrade,
  aiImportCount,
  hasPreviewErrors,
  hasPreviewWarnings,
  canCommit,
  importModeLabel
});
</script>

<template>
  <section class="import-view">
    <article class="import-overview">
      <div class="import-overview__copy">
        <p class="import-card__eyebrow">Knowledge Supply Station</p>
        <h2 class="import-card__title">知识补给站</h2>
        <p class="import-card__text">
          把 AI 生成或人工整理好的 CSV / XLSX 题库拖进来，先做预检，再确认入库。
          当前工作流会保留追加和覆盖两种导入方式，但把准备、校验和结果分成更清楚的三个层级。
        </p>
      </div>

      <div class="import-overview__stats">
        <div class="import-overview__stat">
          <span class="import-overview__stat-label">当前题库</span>
          <strong class="import-overview__stat-value">{{ currentQuestionCountLabel }}</strong>
        </div>

        <div class="import-overview__stat">
          <span class="import-overview__stat-label">当前模式</span>
          <strong class="import-overview__stat-value">{{ importModeLabel }}</strong>
        </div>

        <div class="import-overview__stat">
          <span class="import-overview__stat-label">文件状态</span>
          <strong class="import-overview__stat-value">{{ selectedFileSummary }}</strong>
        </div>
      </div>

      <div class="import-overview__route" aria-label="导入流程">
        <div class="import-overview__step">
          <span class="import-overview__step-index">01</span>
          <strong class="import-overview__step-title">准备表格</strong>
          <span class="import-overview__step-text">确认访问方式、导入模式和字段格式。</span>
        </div>

        <div class="import-overview__step">
          <span class="import-overview__step-index">02</span>
          <strong class="import-overview__step-title">预检数据</strong>
          <span class="import-overview__step-text">检查错误、重复项和可导入题目数量。</span>
        </div>

        <div class="import-overview__step">
          <span class="import-overview__step-index">03</span>
          <strong class="import-overview__step-title">写入题库</strong>
          <span class="import-overview__step-text">确认后再导入，覆盖模式会自动备份旧数据。</span>
        </div>
      </div>
    </article>

    <div class="import-view__workspace">
      <div class="import-view__main">
        <article class="import-card import-card--controls">
          <div class="import-card__header">
            <div>
              <p class="import-card__eyebrow">Import Flow</p>
              <h3 class="import-card__subtitle">准备导入</h3>
            </div>

            <div class="summary-chips">
              <span class="summary-chips__item">{{ adminKeyModel ? "已输入口令" : "本机模式可直接访问" }}</span>
              <span class="summary-chips__item">{{ importModeLabel }}</span>
              <span class="summary-chips__item">{{ selectedFileName ? "文件已选择" : "等待上传" }}</span>
            </div>
          </div>

          <div class="import-card__section-grid">
            <section class="import-card__section">
              <div class="import-card__section-head">
                <div>
                  <p class="import-card__section-step">01</p>
                  <h3 class="import-card__section-title">管理访问</h3>
                </div>
              </div>

              <label class="import-card__label" for="import-admin-key">管理口令</label>
              <input
                id="import-admin-key"
                v-model.trim="adminKeyModel"
                class="import-card__input"
                type="password"
                placeholder="线上环境建议配置 ADMIN_IMPORT_KEY"
              />
              <p class="import-card__hint">
                如果后端未配置 `ADMIN_IMPORT_KEY`，当前功能只允许本机访问。
              </p>
            </section>

            <section class="import-card__section">
              <div class="import-card__section-head">
                <div>
                  <p class="import-card__section-step">02</p>
                  <h3 class="import-card__section-title">导入模式</h3>
                </div>
              </div>

              <span class="import-card__label">导入模式</span>
              <div class="mode-switch">
                <button
                  class="mode-switch__button"
                  :class="{ 'mode-switch__button--active': importMode === 'append' }"
                  type="button"
                  @click="importMode = 'append'"
                >
                  追加导入
                </button>
                <button
                  class="mode-switch__button"
                  :class="{ 'mode-switch__button--active': importMode === 'replace' }"
                  type="button"
                  @click="importMode = 'replace'"
                >
                  覆盖导入
                </button>
              </div>
              <p class="import-card__hint">
                `append` 会把新题追加进题库；`replace` 会先备份数据库，再用新题整体替换。
              </p>
            </section>
          </div>

          <section class="import-card__section import-card__section--ai">
            <div class="import-card__section-head">
              <div>
                <p class="import-card__section-step">03</p>
                <h3 class="import-card__section-title">AI 批量生成</h3>
              </div>
              <span class="summary-chips__item">先生成，再预检</span>
            </div>

            <div class="ai-import-grid ai-import-grid--meta">
              <label class="import-card__field">
                <span class="import-card__label">学科</span>
                <select v-model="aiImportSubject" class="import-card__input import-card__select">
                  <option v-for="subject in AI_SUBJECT_OPTIONS" :key="subject" :value="subject">
                    {{ subject }}
                  </option>
                </select>
              </label>

              <label class="import-card__field">
                <span class="import-card__label">年级</span>
                <select v-model="aiImportGrade" class="import-card__input import-card__select">
                  <option v-for="grade in AI_GRADE_OPTIONS" :key="grade" :value="grade">
                    {{ grade }}
                  </option>
                </select>
              </label>

              <label class="import-card__field">
                <span class="import-card__label">学期</span>
                <select v-model="aiImportSemester" class="import-card__input import-card__select">
                  <option v-for="semester in AI_SEMESTER_OPTIONS" :key="semester" :value="semester">
                    {{ semester }}
                  </option>
                </select>
              </label>

              <label class="import-card__field">
                <span class="import-card__label">难度</span>
                <select v-model="aiImportDifficulty" class="import-card__input import-card__select">
                  <option v-for="difficulty in AI_DIFFICULTY_OPTIONS" :key="difficulty" :value="difficulty">
                    {{ difficulty }} 星
                  </option>
                </select>
              </label>

              <label class="import-card__field">
                <span class="import-card__label">数量</span>
                <select v-model="aiImportCount" class="import-card__input import-card__select">
                  <option v-for="count in AI_COUNT_OPTIONS" :key="count" :value="count">
                    {{ count }} 题
                  </option>
                </select>
              </label>
            </div>

            <label class="import-card__field">
              <span class="import-card__label">主题</span>
              <input
                v-model.trim="aiImportTopic"
                class="import-card__input"
                type="text"
                placeholder="例如：世界地球日、校园节水、春季运动会"
              />
            </label>

            <label class="import-card__field">
              <span class="import-card__label">补充要求</span>
              <textarea
                v-model.trim="aiImportGuidance"
                class="import-card__textarea import-card__textarea--compact"
                rows="2"
                placeholder="例如：题目要生活化一些，适合三年级，不要太书面。"
              ></textarea>
            </label>

            <label class="import-card__field">
              <span class="import-card__label">参考材料</span>
              <textarea
                v-model.trim="aiImportReferenceText"
                class="import-card__textarea"
                rows="4"
                placeholder="适合节日、活动、新闻等更强调时效性的题目。粘贴材料后，AI 会优先依据材料生成。"
              ></textarea>
            </label>

            <div class="import-card__actions">
              <button
                class="btn-cartoon btn-cartoon--yellow"
                type="button"
                :disabled="isAiGenerating || isPreviewLoading || isCommitLoading"
                @click="handleGenerateAiBatch"
              >
                {{ isAiGenerating ? "生成中..." : "生成并预检 AI 题库" }}
              </button>
            </div>

            <p v-if="aiGenerationStatusMessage" class="import-card__message import-card__message--success">
              {{ aiGenerationStatusMessage }}
            </p>
            <p v-if="aiGenerationErrorMessage" class="import-card__message import-card__message--error">
              {{ aiGenerationErrorMessage }}
            </p>
            <p class="import-card__hint">
              这一步不会直接写入题库。生成后的题目仍会先进入下方预检，再由你决定是否导入。
            </p>
          </section>

          <section class="import-card__section import-card__section--upload">
            <div class="import-card__section-head">
              <div>
                <p class="import-card__section-step">04</p>
                <h3 class="import-card__section-title">上传题库文件</h3>
              </div>
              <span class="summary-chips__item">{{ selectedFileSummary }}</span>
            </div>

            <div
              class="upload-dropzone"
              :class="{ 'upload-dropzone--active': isDragging }"
              @drop="handleDrop"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
            >
              <input
                ref="fileInputRef"
                class="upload-dropzone__input"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                @change="handleFileChange"
              />
              <p class="upload-dropzone__title">把知识卷轴拖到这里</p>
              <p class="upload-dropzone__text">
                或者点击按钮选择 CSV / XLSX 文件。建议先用 CSV 模板生成内容，或者按同样字段新建 Excel。
              </p>
              <p v-if="selectedFileName" class="upload-dropzone__file">
                已选择：{{ selectedFileName }}
                <span v-if="hasParsedRows"> · 已解析 {{ parsedRowCount }} 行</span>
              </p>

              <div class="upload-dropzone__actions">
                <button class="btn-cartoon btn-cartoon--mint" type="button" @click="openFileDialog">
                  选择文件
                </button>
                <button class="btn-cartoon" type="button" @click="downloadCsvTemplate">
                  CSV 模板
                </button>
                <button
                  class="btn-cartoon btn-cartoon--pink"
                  type="button"
                  :disabled="isPreviewLoading || !hasParsedRows"
                  @click="handlePreview"
                >
                  {{ isPreviewLoading ? "预检中..." : "开始预检" }}
                </button>
              </div>
            </div>

            <p v-if="parseMessage" class="import-card__message import-card__message--error">
              {{ parseMessage }}
            </p>
            <p v-else-if="statsErrorMessage" class="import-card__message import-card__message--error">
              {{ statsErrorMessage }}
            </p>
          </section>
        </article>

        <article class="import-card import-card--preview">
          <div class="import-card__header">
            <div>
              <p class="import-card__eyebrow">Preview</p>
              <h3 class="import-card__subtitle">导入预检</h3>
            </div>

            <div class="summary-chips">
              <span class="summary-chips__item">模式 {{ importModeLabel }}</span>
              <span v-if="hasParsedRows" class="summary-chips__item">待检 {{ parsedRowCount }} 行</span>
            </div>
          </div>

          <div v-if="!previewResult" class="placeholder-panel">
            <p class="placeholder-panel__title">还没有预检结果</p>
            <p class="placeholder-panel__text">
              当前支持 CSV / XLSX；字段顺序推荐为：学科、年级、学期、题型、题目、选项A、选项B、选项C、选项D、答案、解析、难度。
            </p>
          </div>

          <template v-else>
            <div class="preview-summary">
              <div class="preview-summary__item">
                <span class="preview-summary__label">总行数</span>
                <strong class="preview-summary__value">{{ previewResult.summary.totalRows }}</strong>
              </div>
              <div class="preview-summary__item preview-summary__item--success">
                <span class="preview-summary__label">可导入</span>
                <strong class="preview-summary__value">{{ previewResult.summary.validRows }}</strong>
              </div>
              <div class="preview-summary__item preview-summary__item--error">
                <span class="preview-summary__label">错误</span>
                <strong class="preview-summary__value">{{ previewResult.summary.errorRows }}</strong>
              </div>
              <div class="preview-summary__item preview-summary__item--warning">
                <span class="preview-summary__label">警告</span>
                <strong class="preview-summary__value">{{ previewResult.summary.warningRows }}</strong>
              </div>
            </div>

            <p class="import-card__message" :class="`import-card__message--${previewStatusTone}`">
              {{ previewStatusText }}
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

            <div class="import-card__footer">
              <p v-if="previewRows.length > previewRowsToShow.length" class="import-card__hint">
                仅展示前 {{ previewRowsToShow.length }} 行，完整校验已覆盖全部数据。
              </p>

              <div class="import-card__actions">
                <button
                  class="btn-cartoon btn-cartoon--pink"
                  type="button"
                  :disabled="!canCommit"
                  @click="handleCommit"
                >
                  {{ isCommitLoading ? "导入中..." : importMode === "replace" ? "确认覆盖导入" : "确认追加导入" }}
                </button>
              </div>
            </div>
          </template>
        </article>
      </div>

      <div class="import-view__sidebar">
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

          <div :class="['result-panel', `result-panel--${importResultTone}`]">
            <div class="result-panel__head">
              <div class="result-panel__copy">
                <p class="result-panel__eyebrow">{{ importResultEyebrow }}</p>
                <h3 class="result-panel__title">{{ importResultTitle }}</h3>
                <p class="result-panel__text">{{ importResultText }}</p>
              </div>

              <span class="result-panel__status">{{ importResultStatusLabel }}</span>
            </div>

            <div class="result-panel__metrics">
              <div
                v-for="item in importResultStats"
                :key="item.label"
                class="result-panel__metric"
              >
                <span class="result-panel__metric-label">{{ item.label }}</span>
                <strong class="result-panel__metric-value">{{ item.value }}</strong>
              </div>
            </div>

            <p class="result-panel__hint">{{ importResultHint }}</p>

            <p v-if="commitResult?.backupPath" class="result-panel__backup">
              备份路径：{{ commitResult.backupPath }}
            </p>
          </div>
        </article>
      </div>
    </div>

    <ConfirmDialog
      v-model="isReplaceImportConfirmOpen"
      title-id="import-replace-confirm-title"
      semantic-tone="warning"
      heading-eyebrow="Import Guard"
      heading-title="确认覆盖导入"
      :heading-description="replaceImportDescription"
      close-label="关闭覆盖导入确认弹窗"
      panel-class="import-confirm-dialog"
      notice-text="覆盖导入会清空当前题库内容并写入新题。系统会先生成备份，但当前站点内容会立刻切换到新题库。"
      :chips="[
        `当前题库 ${currentQuestionCount} 题`,
        `本次导入 ${previewResult?.summary?.validRows || 0} 题`
      ]"
      confirm-text="确认覆盖导入"
      confirm-loading-text="覆盖导入中..."
      :confirm-loading="isCommitLoading"
      :confirm-disabled="!canCommit"
      :cancel-disabled="isCommitLoading"
      :status-text="replaceImportErrorMessage"
      status-tone="error"
      @confirm="handleConfirmReplaceImport"
      @cancel="closeReplaceImportConfirm"
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
  gap: 24px;
}

.import-overview {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.95fr);
  gap: 18px 20px;
  padding: 28px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 32px;
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.92) 0%, rgba(255, 255, 255, 0.82) 100%);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

.import-overview::after {
  content: "";
  position: absolute;
  top: -44px;
  right: -34px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(173, 235, 255, 0.46) 0%, rgba(173, 235, 255, 0) 68%);
  pointer-events: none;
}

.import-overview__copy,
.import-overview__stats,
.import-overview__route {
  position: relative;
  z-index: 1;
}

.import-overview__copy {
  max-width: 42rem;
}

.import-overview__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  grid-column: 1 / -1;
}

.import-overview__stat {
  display: grid;
  gap: 6px;
  min-height: 92px;
  padding: 16px 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
}

.import-overview__stat-label {
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.import-overview__stat-value {
  color: var(--color-ink);
  font-size: 1rem;
  line-height: 1.45;
}

.import-overview__route {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  grid-column: 1 / -1;
}

.import-overview__step {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.62);
}

.import-overview__step-index {
  color: var(--color-ink-soft);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.import-overview__step-title {
  color: var(--color-ink);
  font-size: 1rem;
}

.import-overview__step-text {
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  line-height: 1.5;
}

.import-view__workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.42fr) minmax(300px, 0.9fr);
  gap: 20px;
}

.import-view__main,
.import-view__sidebar {
  display: grid;
  gap: 20px;
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

.import-card--controls,
.import-card--preview,
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
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  gap: 10px;
  align-content: start;
  justify-content: end;
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

.import-card__section-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.import-card__section {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.72);
}

.import-card__section--ai {
  margin-top: 14px;
  background: linear-gradient(180deg, rgba(255, 249, 226, 0.9) 0%, rgba(255, 255, 255, 0.84) 100%);
}

.import-card__section--upload {
  margin-top: 14px;
}

.import-card__section-step {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.import-card__section-title {
  margin: 4px 0 0;
  color: var(--color-ink);
  font-size: 1.08rem;
}

.import-card__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.import-card__label {
  display: block;
  color: var(--color-ink);
  font-size: 0.95rem;
}

.import-card__field {
  display: grid;
  gap: 8px;
}

.import-card__input,
.import-card__textarea {
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

.import-card__textarea {
  min-height: 112px;
  resize: vertical;
}

.import-card__textarea--compact {
  min-height: 78px;
}

.import-card__input:focus-visible,
.import-card__textarea:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.78);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.18);
}

.import-card__select {
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, rgba(36, 50, 74, 0.55) 50%),
    linear-gradient(135deg, rgba(36, 50, 74, 0.55) 50%, transparent 50%);
  background-position:
    calc(100% - 21px) calc(50% - 2px),
    calc(100% - 15px) calc(50% - 2px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
  padding-right: 44px;
}

.import-card__hint {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
}

.ai-import-grid {
  display: grid;
  gap: 12px;
}

.ai-import-grid--meta {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mode-switch__button {
  min-height: 46px;
  padding: 10px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.84);
  color: var(--color-ink);
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.mode-switch__button:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 216, 184, 0.44);
}

.mode-switch__button:focus-visible {
  outline: none;
  border-color: rgba(124, 216, 184, 0.78);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.18);
}

.mode-switch__button--active {
  border-color: rgba(255, 184, 42, 0.42);
  background: linear-gradient(180deg, rgba(255, 231, 156, 0.94) 0%, rgba(255, 255, 255, 0.92) 100%);
  box-shadow: 0 14px 24px -24px rgba(36, 50, 74, 0.38);
}

.upload-dropzone {
  position: relative;
  display: grid;
  gap: 12px;
  justify-items: start;
  padding: 24px;
  border: 1.5px dashed rgba(36, 50, 74, 0.22);
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(255, 253, 248, 0.86) 0%, rgba(242, 253, 249, 0.8) 100%);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.upload-dropzone--active {
  transform: translateY(-2px);
  border-color: rgba(124, 216, 184, 0.62);
  background: linear-gradient(180deg, rgba(242, 253, 249, 0.96) 0%, rgba(255, 251, 230, 0.94) 100%);
  box-shadow: 0 22px 34px -34px rgba(36, 50, 74, 0.4);
}

.upload-dropzone__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.upload-dropzone__title,
.placeholder-panel__title {
  margin: 0;
  color: var(--color-ink);
  font-size: 1.12rem;
}

.upload-dropzone__text,
.upload-dropzone__file,
.placeholder-panel__text {
  margin: 0;
}

.upload-dropzone__actions,
.import-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.import-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 18px;
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
  grid-template-columns: 72px 88px 88px 88px minmax(0, 2fr) 88px minmax(0, 1.5fr);
  gap: 14px;
  align-items: start;
  padding: 14px 16px;
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
  padding: 20px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 251, 230, 0.84) 0%, rgba(255, 255, 255, 0.78) 100%);
}

.placeholder-panel--soft {
  background: rgba(255, 255, 255, 0.74);
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
  gap: 16px;
  padding: 20px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 251, 253, 0.84) 100%);
}

.result-panel--idle {
  background: linear-gradient(180deg, rgba(255, 251, 230, 0.9) 0%, rgba(255, 255, 255, 0.84) 100%);
}

.result-panel--progress,
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

@media (max-width: 980px) {
  .import-overview__stats,
  .import-overview__route,
  .import-view__workspace,
  .import-card__section-grid,
  .preview-summary,
  .ai-import-grid--meta,
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
  .import-overview,
  .upload-dropzone,
  .import-card--controls,
  .import-card--preview,
  .import-card--reference,
  .import-card--result {
    padding: 20px;
  }

  .import-card__header,
  .import-card__section-head {
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
  .import-card__actions,
  .upload-dropzone__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .preview-table__head,
  .preview-table__row {
    min-width: 960px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mode-switch__button,
  .upload-dropzone,
  .mode-switch__button:hover,
  .upload-dropzone--active {
    transition: none;
    transform: none;
  }
}
</style>
