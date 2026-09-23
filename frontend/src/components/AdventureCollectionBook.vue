<script setup>
// 我的探险收藏册：全局弹窗，首页与闯关地图共用同一个组件。
//
// 组件只负责展示与关闭，不做任何数据判定：
// 印章 / 航海收藏 / 成就三块内容全部由 utils/adventureCollectionBook.js 生成，
// 章节作用域由调用方（useTriviaApp.openBackpack(chapterId)）决定。
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  book: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(["update:modelValue"]);

function close() {
  emit("update:modelValue", false);
}
</script>

<template>
  <div v-if="props.modelValue" class="adventure-modal-overlay animate-fade-in" @click.self="close">
    <div
      class="adventure-modal-card adventure-modal-card--cartoon adventure-modal-card--backpack adventure-modal-card--collection animate-pop-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adventure-collection-book-title"
    >
      <button class="adventure-modal-close" type="button" aria-label="关闭我的探险收藏册" @click="close">×</button>

      <div class="adventure-modal-header">
        <span class="adventure-modal-icon" aria-hidden="true">📖</span>
        <div class="collection-book__heading">
          <h3 id="adventure-collection-book-title" class="adventure-modal-title">我的探险收藏册</h3>
          <span class="collection-book__scope">{{ book.scopeLabel }}</span>
        </div>
      </div>

      <div class="adventure-modal-body">
        <!-- 第一块：探险印章（长期账本） -->
        <section class="collection-book__section" aria-label="探险印章">
          <header class="collection-book__section-head">
            <h4 class="collection-book__section-title">
              <span aria-hidden="true">🧭</span> 探险印章
            </h4>
            <span class="collection-book__section-count">{{ book.stamps.countText }}</span>
          </header>

          <template v-if="book.stamps.hasStamps">
            <p class="collection-book__hint">{{ book.stamps.hintText }}</p>

            <div v-if="book.stamps.hasRecentClaims" class="collection-book__stamps">
              <span class="collection-book__stamps-label">{{ book.stamps.recentTitle }}</span>
              <ul class="collection-book__stamp-list">
                <li v-for="claim in book.stamps.recentClaims" :key="claim.dateKey" class="collection-book__stamp">
                  <span class="collection-book__stamp-glyph" aria-hidden="true">🧭</span>
                  <span class="collection-book__stamp-date">{{ claim.label }}</span>
                </li>
              </ul>
            </div>
          </template>

          <p v-else class="collection-book__empty">{{ book.stamps.emptyText }}</p>
        </section>

        <!-- 第二块：本章航海收藏 -->
        <section class="collection-book__section" aria-label="本章航海收藏">
          <header class="collection-book__section-head">
            <h4 class="collection-book__section-title">
              <span aria-hidden="true">🎒</span> {{ book.rewards.title }}
            </h4>
            <span class="collection-book__section-count">{{ book.rewards.text }}</span>
          </header>

          <p v-if="book.rewards.totalCount === 0" class="collection-book__empty">{{ book.rewards.emptyText }}</p>

          <template v-else>
            <ul class="collection-book__reward-list">
              <li
                v-for="item in book.rewards.items"
                :key="item.id"
                :class="['collection-book__reward', { 'collection-book__reward--earned': item.earned }]"
              >
                <span class="collection-book__reward-glyph" aria-hidden="true">{{ item.earned ? item.glyph : "🔒" }}</span>
                <span class="collection-book__reward-copy">
                  <strong class="collection-book__reward-name">{{ item.name }}</strong>
                  <span class="collection-book__reward-stage">第 {{ item.order }} 站 · {{ item.stageTitle }}</span>
                </span>
                <span :class="['collection-book__reward-state', `collection-book__reward-state--${item.earned ? 'earned' : 'locked'}`]">
                  {{ item.statusLabel }}
                </span>
              </li>
            </ul>

            <p v-if="book.rewards.earnedCount >= book.rewards.totalCount" class="collection-book__hint">
              {{ book.rewards.completedText }}
            </p>
          </template>
        </section>

        <!-- 第三块：本章成就 -->
        <section class="collection-book__section" aria-label="本章成就">
          <header class="collection-book__section-head">
            <h4 class="collection-book__section-title">
              <span aria-hidden="true">🏅</span> {{ book.achievements.title }}
            </h4>
            <span class="collection-book__section-count">{{ book.achievements.text }}</span>
          </header>

          <p v-if="book.achievements.totalCount === 0" class="collection-book__empty">这一章的成就还在准备中。</p>

          <div v-else class="challenge-achievements__grid">
            <article
              v-for="achievement in book.achievements.items"
              :key="achievement.id"
              :class="[
                'challenge-achievement-card',
                { 'challenge-achievement-card--unlocked': achievement.isUnlocked }
              ]"
            >
              <div class="challenge-achievement-card__topline">
                <span class="challenge-achievement-card__glyph">{{ achievement.glyph }}</span>
                <span
                  :class="[
                    'challenge-achievement-card__status',
                    `challenge-achievement-card__status--${achievement.isUnlocked ? 'unlocked' : 'locked'}`
                  ]"
                >
                  {{ achievement.statusLabel }}
                </span>
              </div>
              <strong class="challenge-achievement-card__title">{{ achievement.name }}</strong>
              <p class="challenge-achievement-card__summary">{{ achievement.summary }}</p>
              <span class="challenge-achievement-card__progress">{{ achievement.progressText }}</span>
            </article>
          </div>

          <p class="collection-book__hint">{{ book.achievements.hintText }}</p>
        </section>
      </div>
    </div>
  </div>
</template>
