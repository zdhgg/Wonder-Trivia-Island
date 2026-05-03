<script>
import ConfirmDialog from "../components/ConfirmDialog.vue";
import QuestionCatalogListHeader from "../components/QuestionCatalogListHeader.vue";
import QuestionCreatePanel from "../components/QuestionCreatePanel.vue";
import { useQuestionCatalogView } from "../composables/useQuestionCatalogView";
export default {
  components: { ConfirmDialog, QuestionCatalogListHeader, QuestionCreatePanel },
  props: {
    adminKey: { type: String, default: "" },
    initialFilters: { type: Object, default: null }
  },
  emits: ["update:adminKey"],
  setup(props, { emit }) {
    return useQuestionCatalogView(props, emit);
  }
};
</script>

<template>
  <section class="catalog-view">
    <article class="catalog-card catalog-card--hero">
      <div class="catalog-hero">
        <div class="catalog-hero__heading">
          <div class="catalog-hero__copy">
            <p class="catalog-card__eyebrow">Question Archive</p>
            <h2 class="catalog-card__title catalog-card__title--compact">题库档案室</h2>
          </div>

          <div class="catalog-hero__status">
            <span class="catalog-status-pill">
              {{ isStatsLoading ? "题库加载中..." : `当前 ${currentQuestionCount} 题` }}
            </span>
            <span v-if="hasActiveFilters" class="catalog-status-pill catalog-status-pill--accent">
              {{ filterSummary }}
            </span>
          </div>
        </div>

        <div class="catalog-hero__metrics">
          <article
            v-for="item in catalogHeroMetrics"
            :key="item.key"
            :class="['catalog-hero-metric', `catalog-hero-metric--${item.tone}`]"
          >
            <span class="catalog-hero-metric__label">{{ item.label }}</span>
            <strong class="catalog-hero-metric__value">{{ item.value }}</strong>
            <p class="catalog-hero-metric__note">{{ item.note }}</p>
          </article>
        </div>

        <div class="catalog-stats-grid">
          <section v-for="group in groupedStats" :key="group.key" class="catalog-stat-cluster">
            <div class="catalog-stat-cluster__head">
              <p class="catalog-stat-cluster__title">{{ group.label }}</p>
              <p class="catalog-stat-cluster__caption">{{ group.caption }}</p>
            </div>

            <div class="catalog-stat-cluster__items">
              <div v-for="item in group.items" :key="`${group.key}-${item.label}`" class="catalog-stat-row">
                <div class="catalog-stat-row__meta">
                  <span class="catalog-stat-row__label">{{ item.label }}</span>
                  <strong class="catalog-stat-row__value">{{ item.count }}</strong>
                </div>
                <div class="catalog-stat-row__track" aria-hidden="true">
                  <span class="catalog-stat-row__fill" :style="{ width: `${item.share}%` }"></span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </article>

    <article class="catalog-card catalog-card--controls">
      <div class="catalog-controls">
        <div class="catalog-controls__primary">
          <label class="catalog-toolbar__group catalog-toolbar__group--search">
            <span class="catalog-toolbar__label">搜索</span>
            <input
              v-model.trim="questionSearchText"
              class="catalog-card__input"
              type="text"
              placeholder="搜索题目 / 解析 / 答案 / 标签"
              @keyup.enter="handleQuestionListSearch"
            />
          </label>

          <label class="catalog-toolbar__group catalog-toolbar__group--admin" for="catalog-admin-key">
            <span class="catalog-toolbar__label">口令</span>
            <input
              id="catalog-admin-key"
              v-model.trim="adminKeyModel"
              class="catalog-card__input"
              type="password"
              placeholder="ADMIN_IMPORT_KEY"
              @keyup.enter="handleQuestionListSearch"
            />
          </label>

          <div class="catalog-toolbar__actions">
            <button
              class="btn-cartoon btn-cartoon--mint"
              type="button"
              :disabled="isQuestionListLoading"
              @click="handleQuestionListSearch"
            >
              {{ isQuestionListLoading ? "查询中..." : "查询" }}
            </button>
            <button
              class="btn-cartoon"
              type="button"
              :disabled="isQuestionListLoading"
              @click="handleRefresh"
            >
              刷新
            </button>
          </div>
        </div>

        <div class="catalog-controls__filters">
          <label class="catalog-toolbar__group">
            <span class="catalog-toolbar__label">学科</span>
            <select
              v-model="questionSubject"
              class="catalog-card__input catalog-card__select"
              @change="handleQuestionListSearch"
            >
              <option v-for="subject in SUBJECT_OPTIONS" :key="subject" :value="subject">
                {{ subject }}
              </option>
            </select>
          </label>

          <label class="catalog-toolbar__group">
            <span class="catalog-toolbar__label">年级</span>
            <select
              v-model="questionGrade"
              class="catalog-card__input catalog-card__select"
              @change="handleQuestionListSearch"
            >
              <option v-for="grade in GRADE_OPTIONS" :key="grade" :value="grade">
                {{ grade }}
              </option>
            </select>
          </label>

          <label class="catalog-toolbar__group">
            <span class="catalog-toolbar__label">学期</span>
            <select
              v-model="questionSemester"
              class="catalog-card__input catalog-card__select"
              @change="handleQuestionListSearch"
            >
              <option v-for="semester in SEMESTER_OPTIONS" :key="semester" :value="semester">
                {{ semester }}
              </option>
            </select>
          </label>

          <label class="catalog-toolbar__group">
            <span class="catalog-toolbar__label">标签</span>
            <input
              v-model.trim="questionKnowledgeTag"
              class="catalog-card__input"
              type="text"
              placeholder="例如：信息拆分"
              @keyup.enter="handleQuestionListSearch"
            />
          </label>

          <label class="catalog-toolbar__group">
            <span class="catalog-toolbar__label">难度</span>
            <select
              v-model="questionDifficulty"
              class="catalog-card__input catalog-card__select"
              @change="handleQuestionListSearch"
            >
              <option
                v-for="difficulty in FILTER_DIFFICULTY_OPTIONS"
                :key="difficulty"
                :value="difficulty"
              >
                {{ difficulty === "全部难度" ? difficulty : `${difficulty} 星` }}
              </option>
            </select>
          </label>
        </div>

        <div v-if="knowledgeTagSuggestions.length > 0" class="catalog-tag-suggestions">
          <span class="catalog-tag-suggestions__label">标签建议</span>
          <div class="catalog-tag-suggestions__list">
            <button
              v-for="tag in knowledgeTagSuggestions"
              :key="`filter-tag-${tag}`"
              type="button"
              :class="['catalog-tag-suggestions__chip', { 'catalog-tag-suggestions__chip--active': questionKnowledgeTag === tag }]"
              @click="applyKnowledgeTagFilter(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>
      </div>

      <div class="catalog-toolbar__status">
        <span class="catalog-inline-metric">{{ adminKeyModel ? "已填口令" : "本机访问" }}</span>
        <span v-if="hasActiveFilters" class="catalog-inline-metric catalog-inline-metric--accent">
          {{ filterSummary }}
        </span>
      </div>

      <section v-if="catalogChallengeAssist" class="catalog-challenge-assist">
        <div class="catalog-challenge-assist__copy">
          <p class="catalog-card__eyebrow">Challenge Supply</p>
          <h3 class="catalog-challenge-assist__title">{{ catalogChallengeAssist.sourceLabel || "当前关补题" }}</h3>
          <div class="catalog-challenge-assist__chips">
            <span
              v-for="chip in catalogChallengeAssistChips"
              :key="`challenge-assist-${chip}`"
              class="catalog-inline-metric"
            >
              {{ chip }}
            </span>
          </div>
        </div>

        <div class="catalog-challenge-assist__actions">
          <button
            class="btn-cartoon btn-cartoon--mint"
            type="button"
            :disabled="visibleQuestionCount === 0 || isQuestionListLoading"
            @click="selectVisibleQuestionsAndFillChallengeTag"
          >
            本页全选并填标签
          </button>
          <button
            class="batch-toolbar__toggle"
            type="button"
            :disabled="!hasSelectedQuestions || isBatchMutating"
            @click="fillBatchTagFromChallengeAssist"
          >
            已选题套当前关标签
          </button>
          <button class="btn-cartoon" type="button" @click="openCreatePanel">
            新建当前关题目
          </button>
        </div>
      </section>

      <p v-if="statsErrorMessage" class="catalog-card__message catalog-card__message--error">
        {{ statsErrorMessage }}
      </p>
    </article>

    <article class="catalog-card catalog-card--list">
      <QuestionCatalogListHeader
        :catalog-page-label="catalogPageLabel"
        :visible-question-count="visibleQuestionCount"
        :selected-question-count="selectedQuestionCount"
        :has-selected-questions="hasSelectedQuestions"
        :is-creating-question="isCreatingQuestion"
        @create="openCreatePanel"
      />

      <QuestionCreatePanel
        v-if="isCreatePanelOpen && createDraft && aiDraft"
        :draft="createDraft"
        :ai-draft="aiDraft"
        :knowledge-tag-suggestions="knowledgeTagSuggestions"
        :error-message="createErrorMessage"
        :ai-error-message="aiGenerationErrorMessage"
        :ai-status-message="aiGenerationStatusMessage"
        :is-saving="isCreatingQuestion"
        :is-generating-ai="isGeneratingQuestionDraft"
        :answer-options="ANSWER_OPTIONS"
        :subject-options="EDIT_SUBJECT_OPTIONS"
        :grade-options="EDIT_GRADE_OPTIONS"
        :semester-options="EDIT_SEMESTER_OPTIONS"
        :difficulty-options="EDIT_DIFFICULTY_OPTIONS"
        @save="handleCreateQuestion"
        @generate-ai="handleGenerateQuestionDraft"
        @cancel="closeCreatePanel"
      />

      <div v-if="hasQuestionList" :class="['batch-toolbar', { 'batch-toolbar--active': hasSelectedQuestions }]">
        <div class="batch-toolbar__selection">
          <div class="batch-toolbar__selection-copy">
            <p class="batch-toolbar__label">批量操作</p>
            <span class="batch-toolbar__summary">{{ batchActionSummary }}</span>
          </div>

          <div class="batch-toolbar__selection-actions">
            <button class="batch-toolbar__toggle" type="button" :disabled="isBatchMutating" @click="toggleVisibleSelection">
              {{ isAllVisibleSelected ? "取消全选" : "全选本页" }}
            </button>
            <button
              class="batch-toolbar__toggle"
              type="button"
              :disabled="!hasSelectedQuestions || isBatchMutating"
              @click="clearSelection"
            >
              清空
            </button>
          </div>
        </div>

        <p v-if="!hasSelectedQuestions" class="batch-toolbar__hint">
          先勾选本页题目，再批量修改学科、年级、学期、难度或能力标签。
        </p>

        <div v-if="hasSelectedQuestions" class="batch-toolbar__controls">
          <select
            v-model="batchDraft.subject"
            class="catalog-card__input catalog-card__select batch-toolbar__select"
            :disabled="isBatchMutating"
          >
            <option v-for="subject in BATCH_SUBJECT_OPTIONS" :key="subject" :value="subject">
              {{ subject === "保持不变" ? "学科不变" : `学科 -> ${subject}` }}
            </option>
          </select>

          <select
            v-model="batchDraft.grade"
            class="catalog-card__input catalog-card__select batch-toolbar__select"
            :disabled="isBatchMutating"
          >
            <option v-for="grade in BATCH_GRADE_OPTIONS" :key="grade" :value="grade">
              {{ grade === "保持不变" ? "年级不变" : `年级 -> ${grade}` }}
            </option>
          </select>

          <select
            v-model="batchDraft.semester"
            class="catalog-card__input catalog-card__select batch-toolbar__select"
            :disabled="isBatchMutating"
          >
            <option v-for="semester in BATCH_SEMESTER_OPTIONS" :key="semester" :value="semester">
              {{ semester === "保持不变" ? "学期不变" : `学期 -> ${semester}` }}
            </option>
          </select>

          <select
            v-model="batchDraft.difficulty"
            class="catalog-card__input catalog-card__select batch-toolbar__select"
            :disabled="isBatchMutating"
          >
            <option v-for="difficulty in BATCH_DIFFICULTY_OPTIONS" :key="difficulty" :value="difficulty">
              {{ difficulty === "保持不变" ? "难度不变" : `难度 -> ${difficulty} 星` }}
            </option>
          </select>

          <input
            v-model.trim="batchDraft.knowledgeTag"
            class="catalog-card__input batch-toolbar__tag-input"
            type="text"
            placeholder="能力标签 -> 信息拆分"
            :disabled="isBatchMutating || batchDraft.clearKnowledgeTag"
            @input="handleBatchKnowledgeTagInput"
          />

          <button
            :class="['batch-toolbar__toggle', { 'batch-toolbar__toggle--active': batchDraft.clearKnowledgeTag }]"
            type="button"
            :disabled="isBatchMutating"
            @click="toggleBatchKnowledgeTagClear"
          >
            {{ batchDraft.clearKnowledgeTag ? "将清空标签" : "清空标签" }}
          </button>

          <button
            class="btn-cartoon btn-cartoon--mint"
            type="button"
            :disabled="!hasSelectedQuestions || isMutatingQuestion(0, 'batch-update')"
            @click="handleBatchUpdate"
          >
            {{ isMutatingQuestion(0, "batch-update") ? "批量更新中..." : "批量修改" }}
          </button>
          <button
            class="btn-cartoon btn-cartoon--pink"
            type="button"
            :disabled="!hasSelectedQuestions || isMutatingQuestion(0, 'batch-delete')"
            @click="openBatchDeleteConfirm"
          >
            {{ isMutatingQuestion(0, "batch-delete") ? "批量删除中..." : "批量删除" }}
          </button>
        </div>

        <div v-if="hasSelectedQuestions && knowledgeTagSuggestions.length > 0" class="catalog-tag-suggestions catalog-tag-suggestions--batch">
          <span class="catalog-tag-suggestions__label">快捷填标签</span>
          <div class="catalog-tag-suggestions__list">
            <button
              v-for="tag in knowledgeTagSuggestions"
              :key="`batch-tag-${tag}`"
              type="button"
              :class="['catalog-tag-suggestions__chip', { 'catalog-tag-suggestions__chip--active': batchDraft.knowledgeTag === tag && !batchDraft.clearKnowledgeTag }]"
              @click="applyBatchKnowledgeTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>
      </div>

      <datalist id="knowledge-tag-suggestions">
        <option v-for="tag in knowledgeTagSuggestions" :key="`datalist-tag-${tag}`" :value="tag"></option>
      </datalist>

      <div v-if="hasActionFeedback" class="catalog-state-stack">
        <div
          :class="[
            'catalog-state-banner',
            actionFeedback.type === 'success' ? 'catalog-state-banner--success' : 'catalog-state-banner--error'
          ]"
        >
          <span class="catalog-state-banner__eyebrow">
            {{ actionFeedback.type === "success" ? "Archive Update" : "Archive Action" }}
          </span>
          <p class="catalog-state-banner__text">{{ actionFeedback.text }}</p>
        </div>
      </div>

      <div v-if="shouldShowCatalogEmptyState" :class="['catalog-empty-state', `catalog-empty-state--${catalogEmptyStateTone}`]">
        <div class="catalog-empty-state__shell">
          <div class="catalog-empty-state__copy">
            <div class="catalog-empty-state__topline">
              <span class="catalog-empty-state__eyebrow">{{ catalogEmptyStateEyebrow }}</span>
              <span class="catalog-empty-state__state">{{ catalogEmptyStateLabel }}</span>
            </div>
            <h3 class="catalog-empty-state__title">{{ catalogEmptyStateTitle }}</h3>
            <p class="catalog-empty-state__text">{{ catalogEmptyStateText }}</p>
          </div>

          <div class="catalog-empty-state__stats">
            <div
              v-for="item in catalogEmptyStateStats"
              :key="item.label"
              class="catalog-empty-state__stat"
            >
              <span class="catalog-empty-state__stat-label">{{ item.label }}</span>
              <strong class="catalog-empty-state__stat-value">{{ item.value }}</strong>
            </div>
          </div>

          <p class="catalog-empty-state__hint">{{ catalogEmptyStateHint }}</p>

          <div v-if="!isQuestionListLoading" class="catalog-empty-state__actions">
            <button
              v-if="hasActiveFilters"
              class="btn-cartoon"
              type="button"
              @click="clearCatalogFilters"
            >
              清空筛选
            </button>
            <button class="btn-cartoon btn-cartoon--yellow" type="button" @click="handleRefresh">
              刷新列表
            </button>
            <button class="btn-cartoon btn-cartoon--mint" type="button" @click="openCreatePanel">
              新增题目
            </button>
          </div>
        </div>
      </div>

      <template v-else>
        <div class="catalog-grid">
          <article
            v-for="question in questionList"
            :key="question.id"
            :class="[
              'question-card',
              {
                'question-card--editing': editingQuestionId === question.id,
                'question-card--selected': isQuestionSelected(question.id)
              }
            ]"
          >
            <div class="question-card__topbar">
              <label class="question-card__check">
                <input
                  :checked="isQuestionSelected(question.id)"
                  class="question-card__checkbox"
                  type="checkbox"
                  :disabled="isBatchMutating"
                  @change="toggleQuestionSelection(question.id)"
                />
                <span>选择题目</span>
              </label>

              <div class="question-card__actions">
                <button
                  class="question-card__action question-card__action--edit"
                  type="button"
                  :disabled="isBatchMutating || isMutatingQuestion(question.id, 'save') || isMutatingQuestion(question.id, 'delete')"
                  @click="editingQuestionId === question.id ? handleEditCancel() : handleEditStart(question)"
                >
                  {{ editingQuestionId === question.id ? "取消编辑" : "编辑" }}
                </button>
                <button
                  class="question-card__action question-card__action--delete"
                  type="button"
                  :disabled="isBatchMutating || isMutatingQuestion(question.id, 'delete') || isMutatingQuestion(question.id, 'save')"
                  @click="openDeleteQuestionConfirm(question)"
                >
                  {{ isMutatingQuestion(question.id, "delete") ? "删除中..." : "删除" }}
                </button>
              </div>
            </div>

            <div class="question-card__tags">
              <span class="question-card__pill question-card__pill--subject">{{ question.subject }}</span>
              <span v-if="question.knowledgeTag" class="question-card__pill question-card__pill--tag">
                {{ question.knowledgeTag }}
              </span>
              <span v-if="question.imageUrl" class="question-card__pill question-card__pill--tag">
                含配图
              </span>
              <span class="question-card__pill question-card__pill--difficulty">难度 {{ question.difficulty }}</span>
            </div>

            <template v-if="editingQuestionId === question.id && editingDraft">
              <div class="question-editor">
                <div class="question-editor__heading">
                  <div>
                    <p class="question-editor__eyebrow">Edit Question</p>
                    <h4 class="question-card__title">编辑题目</h4>
                  </div>
                  <p class="question-editor__note">
                    题号 #{{ question.id }} · {{ question.grade }} · {{ question.semester || "通用" }}
                  </p>
                </div>

                <label class="question-editor__field">
                  <span class="question-editor__label">题目</span>
                  <textarea v-model.trim="editingDraft.content" class="question-editor__textarea" rows="3"></textarea>
                </label>

                <label class="question-editor__field">
                  <span class="question-editor__label">题目图片 URL</span>
                  <input
                    v-model.trim="editingDraft.imageUrl"
                    class="question-editor__input"
                    type="url"
                    placeholder="例如：/images/grade1/apple-count-01.png"
                  />
                </label>

                <div class="question-editor__grid question-editor__grid--meta">
                  <label class="question-editor__field">
                    <span class="question-editor__label">学科</span>
                    <select v-model="editingDraft.subject" class="question-editor__input">
                      <option v-for="subject in EDIT_SUBJECT_OPTIONS" :key="subject" :value="subject">
                        {{ subject }}
                      </option>
                    </select>
                  </label>

                  <label class="question-editor__field">
                    <span class="question-editor__label">年级</span>
                    <select v-model="editingDraft.grade" class="question-editor__input">
                      <option v-for="grade in EDIT_GRADE_OPTIONS" :key="grade" :value="grade">
                        {{ grade }}
                      </option>
                    </select>
                  </label>

                  <label class="question-editor__field">
                    <span class="question-editor__label">学期</span>
                    <select v-model="editingDraft.semester" class="question-editor__input">
                      <option v-for="semester in EDIT_SEMESTER_OPTIONS" :key="semester" :value="semester">
                        {{ semester }}
                      </option>
                    </select>
                  </label>

                  <label class="question-editor__field">
                    <span class="question-editor__label">能力标签</span>
                    <input
                      v-model.trim="editingDraft.knowledgeTag"
                      class="question-editor__input"
                      list="knowledge-tag-suggestions"
                      type="text"
                      placeholder="例如：信息拆分、图表整合"
                    />
                  </label>

                  <label class="question-editor__field">
                    <span class="question-editor__label">题型</span>
                    <input v-model.trim="editingDraft.type" class="question-editor__input" type="text" />
                  </label>

                  <label class="question-editor__field">
                    <span class="question-editor__label">难度</span>
                    <select v-model="editingDraft.difficulty" class="question-editor__input">
                      <option v-for="difficulty in EDIT_DIFFICULTY_OPTIONS" :key="difficulty" :value="difficulty">
                        {{ difficulty }} 星
                      </option>
                    </select>
                  </label>
                </div>

                <div class="question-editor__grid">
                  <label v-for="optionKey in ANSWER_OPTIONS" :key="optionKey" class="question-editor__field">
                    <span class="question-editor__label">选项 {{ optionKey }}</span>
                    <input
                      v-model.trim="editingDraft[`option${optionKey}`]"
                      class="question-editor__input"
                      type="text"
                    />
                  </label>
                </div>

                <div class="question-editor__grid question-editor__grid--answer">
                  <label class="question-editor__field">
                    <span class="question-editor__label">正确答案</span>
                    <select v-model="editingDraft.answer" class="question-editor__input">
                      <option v-for="optionKey in ANSWER_OPTIONS" :key="optionKey" :value="optionKey">
                        {{ optionKey }}
                      </option>
                    </select>
                  </label>
                </div>

                <label class="question-editor__field">
                  <span class="question-editor__label">解析</span>
                  <textarea
                    v-model.trim="editingDraft.explanation"
                    class="question-editor__textarea"
                    rows="3"
                  ></textarea>
                </label>
              </div>

              <p
                v-if="editorErrorMessage"
                class="catalog-card__message catalog-card__message--error catalog-card__message--inline"
              >
                {{ editorErrorMessage }}
              </p>

              <div class="question-editor__actions">
                <button
                  class="btn-cartoon btn-cartoon--mint"
                  type="button"
                  :disabled="isMutatingQuestion(question.id, 'save')"
                  @click="handleSaveQuestion(question.id)"
                >
                  {{ isMutatingQuestion(question.id, "save") ? "保存中..." : "保存修改" }}
                </button>
                <button
                  class="btn-cartoon"
                  type="button"
                  :disabled="isMutatingQuestion(question.id, 'save')"
                  @click="handleEditCancel"
                >
                  取消
                </button>
              </div>
            </template>

            <template v-else>
              <div class="question-card__identity">
                <h4 class="question-card__title">{{ question.content }}</h4>

                <div class="question-card__meta-line">
                  <span v-if="question.type">{{ question.type }}</span>
                  <span>{{ question.grade }}</span>
                  <span>{{ question.semester || "通用" }}</span>
                  <span v-if="question.knowledgeTag">标签 {{ question.knowledgeTag }}</span>
                  <span>题号 #{{ question.id }}</span>
                </div>
              </div>

              <div v-if="question.imageUrl" class="question-card__media">
                <img :src="question.imageUrl" alt="题目配图预览" class="question-card__media-image" loading="lazy" />
              </div>

              <details class="question-card__details">
                <summary class="question-card__summary">
                  <span class="question-card__summary-copy">
                    <span class="question-card__summary-label">查看选项与解析</span>
                    <span class="question-card__summary-note">
                      答案 {{ question.answer }} · {{ question.options.length }} 个选项
                    </span>
                  </span>
                  <span class="question-card__summary-side">
                    <span class="question-card__summary-icon" aria-hidden="true">⌄</span>
                  </span>
                </summary>

                <div class="question-card__details-body">
                  <ul class="question-card__options">
                    <li
                      v-for="option in question.options"
                      :key="`${question.id}-${option.key}`"
                      class="question-card__option"
                      :class="{ 'question-card__option--answer': question.answer === option.key }"
                    >
                      <span class="question-card__option-key">{{ option.key }}</span>
                      <span class="question-card__option-text">{{ option.text }}</span>
                      <span v-if="question.answer === option.key" class="question-card__answer-badge">
                        正确答案
                      </span>
                    </li>
                  </ul>

                  <div class="question-card__explanation-card">
                    <span class="question-card__explanation-label">解析</span>
                    <p class="question-card__explanation">{{ question.explanation }}</p>
                  </div>
                </div>
              </details>
            </template>
          </article>
        </div>

        <div class="catalog-pagination">
          <div class="catalog-pagination__summary">
            <div class="catalog-pagination__summary-copy">
              <p class="catalog-pagination__eyebrow">Page Navigation</p>
              <p class="catalog-pagination__text">{{ catalogPageLabel }}</p>
            </div>

            <div class="catalog-pagination__metrics">
              <span class="catalog-pagination__metric">本页 {{ visibleQuestionCount }} 题</span>
              <span class="catalog-pagination__metric">
                第 {{ questionListPagination.page }} / {{ Math.max(questionListPagination.totalPages, 1) }} 页
              </span>
            </div>
          </div>

          <div class="catalog-pagination__actions">
            <button
              class="btn-cartoon catalog-pagination__button"
              type="button"
              :disabled="isQuestionListLoading || !questionListPagination.hasPrevious"
              @click="handleQuestionListPageChange(questionListPagination.page - 1)"
            >
              上一页
            </button>
            <button
              class="btn-cartoon btn-cartoon--mint catalog-pagination__button"
              type="button"
              :disabled="isQuestionListLoading || !questionListPagination.hasNext"
              @click="handleQuestionListPageChange(questionListPagination.page + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </template>
    </article>

    <ConfirmDialog
      v-model="isDeleteConfirmOpen"
      title-id="catalog-delete-confirm-title"
      semantic-tone="danger"
      heading-eyebrow="Archive Control"
      :heading-title="deleteConfirmTitle"
      :heading-description="deleteConfirmDescription"
      close-label="关闭删除确认弹窗"
      panel-class="catalog-confirm-dialog"
      notice-text="这项操作不会进入回收站，执行后需要重新导入或重建题目。"
      :meta-text="deleteConfirmMetaText"
      :chips="deleteConfirmChips"
      preview-label="题目内容"
      :preview-text="deleteConfirmMode === 'single' ? deleteConfirmPreview : ''"
      cancel-text="先不删"
      :confirm-text="deleteConfirmMode === 'batch' ? '确认批量删除' : '确认删除'"
      :confirm-loading="isDeleteConfirmLoading"
      :confirm-loading-text="deleteConfirmMode === 'batch' ? '批量删除中...' : '删除中...'"
      :confirm-disabled="deleteConfirmMode === 'single' && !deleteConfirmQuestion"
      :cancel-disabled="isDeleteConfirmLoading"
      :status-text="deleteConfirmErrorMessage"
      @confirm="handleDeleteConfirm"
      @cancel="closeDeleteConfirm"
    />
  </section>
</template>

<style src="./QuestionCatalogView.css"></style>
