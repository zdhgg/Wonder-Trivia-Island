<script setup>
// 纪念记录的照片选择器（Phase 2D-C1）：新增、完成、编辑三个场景共用同一个组件。
//
// 它只做「选照片 → 压好 → 显示 → 能删掉」，不关心照片最终怎么存：
//   - 记录还没有 id（正在新增 / 正在完成一件事）：照片先攒在本地，随保存请求一起提交；
//   - 记录已经有 id（编辑旧记录）：选一张传一张、删一张立刻删。
//
// 所以页面上永远只有一套「放照片」的交互，不用记两种规则。
import { ref } from "vue";
import { MAX_PHOTO_EDGE } from "../../utils/growthPhotoUpload.js";

const props = defineProps({
  // 已经存在服务端的照片（编辑旧记录时传入）。
  photos: {
    type: Array,
    default: () => []
  },
  // 还没上传、攒在本地等保存的照片（data URL）。
  pendingDataUrls: {
    type: Array,
    default: () => []
  },
  // 有 id 时：照片已经是服务端上的东西，可以单独删。
  // （页面据此决定「先攒着」还是「立刻上传」，选择器本身不做这个判断。）
  footprintId: {
    type: Number,
    default: 0
  },
  maxPhotos: {
    type: Number,
    default: 6
  },
  isBusy: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ""
  },
  // 相册里的两条线（我们一起 / 她的成长）都用这个选择器，只有标题不同。
  label: {
    type: String,
    default: "照片"
  }
});

const emit = defineEmits(["add-file", "remove-photo", "remove-pending"]);

const fileInputRef = ref(null);

const totalCount = () => props.photos.length + props.pendingDataUrls.length;
const canAddMore = () => totalCount() < props.maxPhotos;

function openFilePicker() {
  fileInputRef.value?.click();
}

async function handleFileChange(event) {
  const input = event.target;
  const files = Array.from(input?.files ?? []);

  // 先清空 input：同一张照片第二次选中也要能触发 change。
  input.value = "";

  if (files.length === 0) {
    return;
  }

  // 组件只负责「选了哪些文件」，怎么存由页面决定（有 id 就上传，没 id 就先攒着）。
  emit("add-file", files);
}

function removePhoto(photo) {
  emit("remove-photo", photo);
}

function removePending(index) {
  emit("remove-pending", index);
}
</script>

<template>
  <div class="footprint-photos">
    <div class="footprint-photos__head">
      <span class="footprint-photos__label">{{ label }}</span>
      <span class="footprint-photos__hint">
        {{ totalCount() }} / {{ maxPhotos }}
        <template v-if="maxPhotos > 0">· 一次出去玩的照片放几张就够</template>
      </span>
    </div>

    <ul v-if="totalCount() > 0" class="footprint-photos__list">
      <!-- 已经存下来的照片 -->
      <li v-for="photo in photos" :key="`saved-${photo.id}`" class="footprint-photos__item">
        <img class="footprint-photos__image" :src="photo.url" alt="这条记录的照片" loading="lazy" />
        <button
          class="footprint-photos__remove"
          type="button"
          :disabled="isBusy"
          :aria-label="`删掉这张照片`"
          @click="removePhoto(photo)"
        >
          ×
        </button>
      </li>

      <!-- 还没上传、等保存的照片 -->
      <li v-for="(dataUrl, index) in pendingDataUrls" :key="`pending-${index}`" class="footprint-photos__item">
        <img class="footprint-photos__image" :src="dataUrl" alt="还没保存的照片" />
        <button
          class="footprint-photos__remove"
          type="button"
          :disabled="isBusy"
          :aria-label="`拿掉这张还没保存的照片`"
          @click="removePending(index)"
        >
          ×
        </button>
      </li>
    </ul>

    <button
      class="footprint-photos__add"
      type="button"
      :disabled="isBusy || !canAddMore()"
      @click="openFilePicker"
    >
      {{ totalCount() > 0 ? "再放一张" : "📷 放几张照片" }}
    </button>

    <p class="footprint-photos__note">照片会缩小到长边 {{ MAX_PHOTO_EDGE }} 再保存，不会占太多地方。</p>
    <p v-if="errorMessage" class="footprint-photos__error">{{ errorMessage }}</p>

    <input
      ref="fileInputRef"
      class="footprint-photos__input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      @change="handleFileChange"
    />
  </div>
</template>

<style scoped>
.footprint-photos {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.footprint-photos__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 10px;
}

.footprint-photos__label {
  color: var(--color-ink);
  font-size: 0.95rem;
  font-weight: 800;
}

.footprint-photos__hint,
.footprint-photos__note {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
}

.footprint-photos__note {
  margin: 0;
}

.footprint-photos__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.footprint-photos__item {
  position: relative;
  width: 92px;
  height: 92px;
  border-radius: 16px;
  overflow: hidden;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  background: rgba(255, 255, 255, 0.9);
}

.footprint-photos__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.footprint-photos__remove {
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 999px;
  background: rgba(36, 50, 74, 0.62);
  color: #fff;
  font: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.footprint-photos__remove:hover:not(:disabled),
.footprint-photos__remove:focus-visible:not(:disabled) {
  background: rgba(162, 59, 86, 0.92);
  outline: none;
}

.footprint-photos__remove:disabled {
  cursor: progress;
  opacity: 0.7;
}

.footprint-photos__add {
  justify-self: start;
  min-height: 40px;
  padding: 8px 14px;
  border: 1.5px dashed rgba(36, 50, 74, 0.24);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--color-ink);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.footprint-photos__add:hover:not(:disabled),
.footprint-photos__add:focus-visible:not(:disabled) {
  border-color: rgba(124, 216, 184, 0.7);
  background: rgba(247, 252, 249, 0.96);
  outline: none;
}

.footprint-photos__add:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.footprint-photos__error {
  margin: 0;
  color: #a23b56;
  font-size: 0.88rem;
  font-weight: 700;
}

/* 真正的 file input 藏起来，用上面的按钮触发 */
.footprint-photos__input {
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

@media (prefers-reduced-motion: reduce) {
  .footprint-photos__add {
    transition: none;
  }
}
</style>
