<script setup>
defineProps({
  draft: {
    type: Object,
    required: true
  },
  aiDraft: {
    type: Object,
    required: true
  },
  errorMessage: {
    type: String,
    default: ""
  },
  aiErrorMessage: {
    type: String,
    default: ""
  },
  aiStatusMessage: {
    type: String,
    default: ""
  },
  knowledgeTagSuggestions: {
    type: Array,
    default: () => []
  },
  isSaving: {
    type: Boolean,
    default: false
  },
  isGeneratingAi: {
    type: Boolean,
    default: false
  },
  answerOptions: {
    type: Array,
    default: () => []
  },
  subjectOptions: {
    type: Array,
    default: () => []
  },
  gradeOptions: {
    type: Array,
    default: () => []
  },
  semesterOptions: {
    type: Array,
    default: () => []
  },
  difficultyOptions: {
    type: Array,
    default: () => []
  }
});

defineEmits(["save", "generate-ai", "cancel"]);
</script>

<template>
  <div class="question-editor question-editor--create">
    <div class="question-editor__intro">
      <div class="question-editor__heading">
        <div>
          <p class="question-editor__eyebrow">Create Question</p>
          <h4 class="question-card__title">新增题目</h4>
        </div>
      </div>
      <p class="question-editor__note">新增后会自动刷新统计与第一页列表。能力标签可供闯关章节优先抽题。</p>
    </div>

    <section class="question-editor__ai-panel">
      <div class="question-editor__heading">
        <div>
          <p class="question-editor__eyebrow">AI Draft</p>
          <h4 class="question-card__title">AI 辅助出题</h4>
        </div>
        <p class="question-editor__note">先生成草稿，再人工确认后保存。</p>
      </div>

      <div class="question-editor__grid">
        <label class="question-editor__field">
          <span class="question-editor__label">主题</span>
          <input
            v-model.trim="aiDraft.topic"
            class="question-editor__input"
            type="text"
            placeholder="例如：春游安全、植树节、校园节能"
          />
        </label>
      </div>

      <label class="question-editor__field">
        <span class="question-editor__label">补充要求</span>
        <textarea
          v-model.trim="aiDraft.guidance"
          class="question-editor__textarea question-editor__textarea--compact"
          rows="2"
          placeholder="例如：更生活化一点，适合三年级，避免太难的计算。"
        ></textarea>
      </label>

      <label class="question-editor__field">
        <span class="question-editor__label">参考材料</span>
        <textarea
          v-model.trim="aiDraft.referenceText"
          class="question-editor__textarea"
          rows="4"
          placeholder="适合节日、活动、新闻等时效题。粘贴材料后，AI 会优先依据这里的内容出题。"
        ></textarea>
      </label>

      <div class="question-editor__actions">
        <button
          class="btn-cartoon btn-cartoon--yellow"
          type="button"
          :disabled="isSaving || isGeneratingAi"
          @click="$emit('generate-ai')"
        >
          {{ isGeneratingAi ? "生成中..." : "AI 生成草稿" }}
        </button>
      </div>

      <p
        v-if="aiStatusMessage"
        class="catalog-card__message catalog-card__message--success catalog-card__message--inline"
      >
        {{ aiStatusMessage }}
      </p>

      <p
        v-if="aiErrorMessage"
        class="catalog-card__message catalog-card__message--error catalog-card__message--inline"
      >
        {{ aiErrorMessage }}
      </p>
    </section>

    <label class="question-editor__field">
      <span class="question-editor__label">题目</span>
      <textarea v-model.trim="draft.content" class="question-editor__textarea" rows="3"></textarea>
    </label>

    <div class="question-editor__grid question-editor__grid--meta">
      <label class="question-editor__field">
        <span class="question-editor__label">学科</span>
        <select v-model="draft.subject" class="question-editor__input">
          <option v-for="subject in subjectOptions" :key="subject" :value="subject">
            {{ subject }}
          </option>
        </select>
      </label>

      <label class="question-editor__field">
        <span class="question-editor__label">年级</span>
        <select v-model="draft.grade" class="question-editor__input">
          <option v-for="grade in gradeOptions" :key="grade" :value="grade">
            {{ grade }}
          </option>
        </select>
      </label>

      <label class="question-editor__field">
        <span class="question-editor__label">学期</span>
        <select v-model="draft.semester" class="question-editor__input">
          <option v-for="semester in semesterOptions" :key="semester" :value="semester">
            {{ semester }}
          </option>
        </select>
      </label>

      <label class="question-editor__field">
        <span class="question-editor__label">能力标签</span>
        <input
          v-model.trim="draft.knowledgeTag"
          class="question-editor__input"
          list="knowledge-tag-suggestions"
          type="text"
          placeholder="例如：信息拆分、图表整合"
        />
      </label>

      <label class="question-editor__field">
        <span class="question-editor__label">题型</span>
        <input v-model.trim="draft.type" class="question-editor__input" type="text" placeholder="例如：古诗积累" />
      </label>

      <label class="question-editor__field">
        <span class="question-editor__label">难度</span>
        <select v-model="draft.difficulty" class="question-editor__input">
          <option v-for="difficulty in difficultyOptions" :key="difficulty" :value="difficulty">
            {{ difficulty }} 星
          </option>
        </select>
      </label>
    </div>

    <div class="question-editor__grid">
      <label v-for="optionKey in answerOptions" :key="`create-${optionKey}`" class="question-editor__field">
        <span class="question-editor__label">选项 {{ optionKey }}</span>
        <input
          v-model.trim="draft[`option${optionKey}`]"
          class="question-editor__input"
          type="text"
        />
      </label>
    </div>

    <div class="question-editor__grid question-editor__grid--answer">
      <label class="question-editor__field">
        <span class="question-editor__label">正确答案</span>
        <select v-model="draft.answer" class="question-editor__input">
          <option v-for="optionKey in answerOptions" :key="`create-answer-${optionKey}`" :value="optionKey">
            {{ optionKey }}
          </option>
        </select>
      </label>
    </div>

    <label class="question-editor__field">
      <span class="question-editor__label">解析</span>
      <textarea
        v-model.trim="draft.explanation"
        class="question-editor__textarea"
        rows="3"
      ></textarea>
    </label>

    <p v-if="errorMessage" class="catalog-card__message catalog-card__message--error catalog-card__message--inline">
      {{ errorMessage }}
    </p>

    <div class="question-editor__actions">
      <button
        class="btn-cartoon btn-cartoon--mint"
        type="button"
        :disabled="isSaving || isGeneratingAi"
        @click="$emit('save')"
      >
        {{ isSaving ? "新增中..." : "保存新题" }}
      </button>
      <button
        class="btn-cartoon"
        type="button"
        :disabled="isSaving || isGeneratingAi"
        @click="$emit('cancel')"
      >
        取消
      </button>
    </div>
  </div>
</template>
