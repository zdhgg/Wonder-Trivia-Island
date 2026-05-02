<script setup>
defineProps({
  catalogPageLabel: {
    type: String,
    required: true
  },
  visibleQuestionCount: {
    type: Number,
    default: 0
  },
  selectedQuestionCount: {
    type: Number,
    default: 0
  },
  hasSelectedQuestions: {
    type: Boolean,
    default: false
  },
  isCreatingQuestion: {
    type: Boolean,
    default: false
  }
});

defineEmits(["create"]);
</script>

<template>
  <div class="catalog-card__header catalog-card__header--list">
    <div class="catalog-card__header-copy">
      <h3 class="catalog-card__subtitle">题目</h3>
      <p class="catalog-card__header-note">{{ catalogPageLabel }}</p>
    </div>

    <div class="catalog-card__header-actions">
      <div class="catalog-card__header-metrics">
        <span class="catalog-inline-metric">本页 {{ visibleQuestionCount }}</span>
        <span v-if="hasSelectedQuestions" class="catalog-inline-metric catalog-inline-metric--accent">
          已选 {{ selectedQuestionCount }}
        </span>
      </div>

      <button
        class="btn-cartoon btn-cartoon--yellow"
        type="button"
        :disabled="isCreatingQuestion"
        @click="$emit('create')"
      >
        {{ isCreatingQuestion ? "新增中..." : "新增题目" }}
      </button>
    </div>
  </div>
</template>
