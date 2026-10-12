<script setup>
import { computed, ref } from "vue";
const props = defineProps({ record: { type: Object, required: true }, highlighted: Boolean, showOrigin: Boolean });
defineEmits(["edit", "delete", "open-photo"]);
const expanded = ref(false);
const longNote = computed(() => props.record.note.length > 110 || props.record.note.split("\n").length > 3);
const dayLabel = computed(() => `${Number(props.record.occurredOn.slice(5, 7))} 月 ${Number(props.record.occurredOn.slice(8))} 日`);
</script>
<template>
  <article :id="`record-${record.kind}-${record.id}`" class="growth-book__entry"
    :class="{ 'growth-book__entry--saved': highlighted }" tabindex="-1" :aria-label="record.title">
    <div class="growth-book__entry-head">
      <time :datetime="record.occurredOn">{{ dayLabel }}</time>
      <span v-if="showOrigin" class="growth-book__entry-origin">{{ record.kind === 'milestone' ? '🌱 她的成长' : '👨‍👧 我们一起' }}</span>
      <span v-if="highlighted" class="growth-book__saved-label">已保存</span>
    </div>
    <h3 class="growth-book__entry-title">{{ record.title }}</h3>
    <p v-if="record.note" :id="`note-${record.kind}-${record.id}`" class="growth-book__entry-note" :class="{ 'growth-book__entry-note--clamped': longNote && !expanded }">{{ record.note }}</p>
    <button v-if="longNote" class="growth-book__text-button" type="button" :aria-expanded="expanded" :aria-controls="`note-${record.kind}-${record.id}`" @click="expanded = !expanded">{{ expanded ? '收起正文' : '展开全文' }}</button>
    <ul v-if="record.photos.length" class="growth-book__entry-photos">
      <li v-for="(photo, index) in record.photos" :key="photo.id" class="growth-book__entry-photo">
        <button type="button" class="growth-book__entry-photo-button" :aria-label="`看大图：${record.title} 的第 ${index + 1} 张照片`" @click="$emit('open-photo', record, index)">
          <img class="growth-book__entry-photo-image" :src="photo.url" :alt="`${record.title} 的照片`" loading="lazy" />
        </button>
      </li>
    </ul>
    <div class="growth-book__entry-footer">
      <div class="growth-book__entry-tags">
        <span class="growth-book__entry-category">{{ record.categoryMeta.displayLabel }}</span>
        <span v-for="tag in record.tagMetas || []" :key="tag.id" class="growth-book__entry-tag">{{ tag.displayLabel }}</span>
      </div>
      <div class="growth-book__entry-actions">
        <button class="growth-book__text-button" type="button" @click="$emit('edit', record)">改一改</button>
        <button class="growth-book__text-button growth-book__text-button--muted" type="button" @click="$emit('delete', record)">删掉</button>
      </div>
    </div>
  </article>
</template>
<style scoped>
.growth-book__entry { padding: 22px 24px; border: 1px solid #e2e8e1; border-radius: 16px; background: rgba(255,255,255,.94); scroll-margin-block: 24px; outline: none; }
.growth-book__entry--saved { border-color: #77b596; }
.growth-book__entry:focus-visible { outline: 3px solid #77b596; outline-offset: 3px; }
.growth-book__entry-head { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; color: var(--color-ink-soft); font-size: .83rem; }
.growth-book__entry-origin { padding-left: 12px; border-left: 1px solid #dfe6e0; }
.growth-book__saved-label { margin-left: auto; color: #327b59; }
.growth-book__entry-title { margin: 12px 0 8px; font-size: 1.15rem; line-height: 1.5; overflow-wrap: anywhere; }
.growth-book__entry-note { margin: 0; max-width: 68ch; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.8; color: #556475; }
.growth-book__entry-note--clamped { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.growth-book__entry-photos { display: flex; gap: 10px; flex-wrap: wrap; list-style: none; padding: 0; margin: 16px 0 0; }
.growth-book__entry-photo { width: 156px; height: 124px; }
.growth-book__entry-photo-button { display: block; width: 100%; height: 100%; padding: 0; border: 0; border-radius: 10px; overflow: hidden; background: #edf2ee; cursor: pointer; }
.growth-book__entry-photo-image { width: 100%; height: 100%; object-fit: cover; }
.growth-book__entry-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
.growth-book__entry-tags { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: .8rem; color: var(--color-ink-soft); }
.growth-book__entry-tag { background: #f0f5ef; padding: 3px 7px; border-radius: 5px; }
.growth-book__entry-actions { display: flex; gap: 6px; flex-shrink: 0; }
.growth-book__text-button { min-height: 38px; padding: 6px 8px; border: 0; background: transparent; color: #327b59; font: inherit; font-size: .85rem; cursor: pointer; }
.growth-book__text-button--muted { color: var(--color-ink-soft); }
.growth-book__text-button:hover { background: #edf5ef; border-radius: 6px; }
button:focus-visible { outline: 3px solid #77b596; outline-offset: 3px; }
@media (max-width: 600px) {
  .growth-book__entry { padding: 16px; }
  .growth-book__entry-photo { width: calc((100% - 10px) / 2); height: 120px; }
  .growth-book__entry-footer { flex-wrap: wrap; gap: 4px; }
  .growth-book__entry-actions { margin-left: auto; }
}
</style>
