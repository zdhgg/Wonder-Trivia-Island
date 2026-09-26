<script setup>
// 纪念册照片的大图浏览（Phase 2D-E1）。
//
// 只做三件事：看到大图、左右翻同一组的照片、关掉。
// 没有下载、没有编辑、没有相册管理——它不是看图工具，只是「凑近看一眼」。
//
// 同一个组件在三条页签里复用：传进来的 photos 是「点开的那条记录自己的一组照片」，
// 所以「同一条记录有多张照片时可以前后切换」是天然成立的。
import { computed, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // 这一组照片（形状与足迹 / 成长记录里的 photos 一致：{ id, url, ... }）。
  photos: {
    type: Array,
    default: () => []
  },
  startIndex: {
    type: Number,
    default: 0
  },
  // 无障碍用的标题：一般传那条记录的标题。
  title: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["update:modelValue"]);

const BODY_MODAL_COUNT_KEY = "modalOpenCount";
const SWIPE_THRESHOLD_PX = 40;

const currentIndex = ref(0);
const failedPhotoIds = ref([]);
let triggerElement = null;
let bodyLocked = false;
let keydownAttached = false;
let pointerStartX = null;

const total = computed(() => props.photos.length);
const currentPhoto = computed(() => props.photos[currentIndex.value] ?? null);
const hasMultiple = computed(() => total.value > 1);
const counterText = computed(() => `${currentIndex.value + 1} / ${total.value}`);
const canGoPrevious = computed(() => hasMultiple.value);
const canGoNext = computed(() => hasMultiple.value);

function clampIndex(index) {
  if (total.value === 0) {
    return 0;
  }

  // 循环浏览：看到最后一张再点下一张，回到第一张。
  return ((Number(index) || 0) % total.value + total.value) % total.value;
}

function setBodyScrollLock(isLocked) {
  if (typeof document === "undefined") {
    return;
  }

  const currentLockCount = Number.parseInt(document.body.dataset[BODY_MODAL_COUNT_KEY] || "0", 10) || 0;
  const nextLockCount = isLocked ? currentLockCount + 1 : Math.max(0, currentLockCount - 1);

  document.body.dataset[BODY_MODAL_COUNT_KEY] = String(nextLockCount);
  document.body.classList.toggle("body--modal-open", nextLockCount > 0);

  if (nextLockCount === 0) {
    delete document.body.dataset[BODY_MODAL_COUNT_KEY];
  }
}

function close() {
  emit("update:modelValue", false);
}

function goPrevious() {
  if (!canGoPrevious.value) {
    return;
  }

  currentIndex.value = clampIndex(currentIndex.value - 1);
}

function goNext() {
  if (!canGoNext.value) {
    return;
  }

  currentIndex.value = clampIndex(currentIndex.value + 1);
}

function markPhotoFailed(photo) {
  if (!photo || failedPhotoIds.value.includes(photo.id)) {
    return;
  }

  failedPhotoIds.value = [...failedPhotoIds.value, photo.id];
}

function isPhotoFailed(photo) {
  return Boolean(photo) && failedPhotoIds.value.includes(photo.id);
}

function handleKeydown(event) {
  if (!props.modelValue) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    goPrevious();
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    goNext();
  }
}

function attachKeydownListener() {
  if (keydownAttached || typeof window === "undefined") {
    return;
  }

  window.addEventListener("keydown", handleKeydown);
  keydownAttached = true;
}

function detachKeydownListener() {
  if (!keydownAttached || typeof window === "undefined") {
    return;
  }

  window.removeEventListener("keydown", handleKeydown);
  keydownAttached = false;
}

// 手机上左右滑：记录起点，松手时看位移。
function handlePointerDown(event) {
  pointerStartX = event.clientX;
}

function handlePointerUp(event) {
  if (pointerStartX === null) {
    return;
  }

  const distance = event.clientX - pointerStartX;

  pointerStartX = null;

  if (Math.abs(distance) < SWIPE_THRESHOLD_PX) {
    return;
  }

  if (distance > 0) {
    goPrevious();
    return;
  }

  goNext();
}

watch(
  () => props.modelValue,
  async (isOpen, wasOpen) => {
    if (isOpen) {
      triggerElement = typeof document !== "undefined" && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      failedPhotoIds.value = [];
      currentIndex.value = clampIndex(props.startIndex);

      if (!bodyLocked) {
        setBodyScrollLock(true);
        bodyLocked = true;
      }

      attachKeydownListener();
      return;
    }

    pointerStartX = null;
    detachKeydownListener();

    if (bodyLocked) {
      setBodyScrollLock(false);
      bodyLocked = false;
    }

    if (wasOpen && triggerElement instanceof HTMLElement && triggerElement.isConnected) {
      triggerElement.focus();
    }

    triggerElement = null;
  },
  { immediate: true }
);

// 打开状态下这一组照片变了（比如编辑后新增了一张），别让下标越界。
watch(
  () => props.photos.length,
  () => {
    currentIndex.value = clampIndex(currentIndex.value);
  }
);

onBeforeUnmount(() => {
  detachKeydownListener();

  if (bodyLocked) {
    setBodyScrollLock(false);
    bodyLocked = false;
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="photo-lightbox-fade">
      <div
        v-if="modelValue && currentPhoto"
        class="photo-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="照片大图"
        @click.self="close"
      >
        <div class="photo-lightbox__bar">
          <p class="photo-lightbox__caption">
            <span v-if="title" class="photo-lightbox__title">{{ title }}</span>
            <span v-if="hasMultiple" class="photo-lightbox__counter">{{ counterText }}</span>
          </p>
          <button class="photo-lightbox__close" type="button" aria-label="关闭大图" @click="close">×</button>
        </div>

        <div class="photo-lightbox__stage" @pointerdown="handlePointerDown" @pointerup="handlePointerUp">
          <button
            v-if="hasMultiple"
            class="photo-lightbox__nav photo-lightbox__nav--previous"
            type="button"
            aria-label="看上一张"
            @click="goPrevious"
          >
            ‹
          </button>

          <img
            v-if="!isPhotoFailed(currentPhoto)"
            class="photo-lightbox__image"
            :src="currentPhoto.url"
            :alt="title ? `${title} 的照片` : '照片'"
            @error="markPhotoFailed(currentPhoto)"
          />
          <p v-else class="photo-lightbox__failed">这张照片加载不出来了。</p>

          <button
            v-if="hasMultiple"
            class="photo-lightbox__nav photo-lightbox__nav--next"
            type="button"
            aria-label="看下一张"
            @click="goNext"
          >
            ›
          </button>
        </div>

        <p v-if="hasMultiple" class="photo-lightbox__hint">左右滑动或用 ← → 翻看这一组的其他照片</p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 大图浏览：整屏铺开、深色底，让照片自己说话；除了翻页和关闭没有别的控件。 */
.photo-lightbox {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 8px;
  padding: 14px 14px 18px;
  background: rgba(20, 27, 40, 0.92);
  backdrop-filter: blur(6px);
  color: rgba(255, 255, 255, 0.92);
  touch-action: pan-y;
}

.photo-lightbox__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.photo-lightbox__caption {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  min-width: 0;
}

.photo-lightbox__title {
  overflow: hidden;
  font-size: 0.95rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photo-lightbox__counter {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.85rem;
  font-weight: 700;
}

.photo-lightbox__close {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 1.5px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font: inherit;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.photo-lightbox__close:hover,
.photo-lightbox__close:focus-visible {
  background: rgba(255, 255, 255, 0.22);
  outline: none;
}

.photo-lightbox__stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
  min-width: 0;
}

.photo-lightbox__image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  border-radius: 14px;
  object-fit: contain;
  box-shadow: 0 24px 60px -30px rgba(0, 0, 0, 0.8);
}

.photo-lightbox__failed {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
}

/* 翻页按钮压在照片两侧；窄屏上也留在屏幕上，只是小一点。 */
.photo-lightbox__nav {
  position: absolute;
  top: 50%;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1.5px solid rgba(255, 255, 255, 0.26);
  border-radius: 999px;
  background: rgba(20, 27, 40, 0.55);
  color: #fff;
  font: inherit;
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
  transform: translateY(-50%);
}

.photo-lightbox__nav--previous {
  left: 0;
}

.photo-lightbox__nav--next {
  right: 0;
}

.photo-lightbox__nav:hover,
.photo-lightbox__nav:focus-visible {
  background: rgba(255, 255, 255, 0.2);
  outline: none;
}

.photo-lightbox__hint {
  margin: 0;
  color: rgba(255, 255, 255, 0.66);
  font-size: 0.8rem;
  text-align: center;
}

.photo-lightbox-fade-enter-active,
.photo-lightbox-fade-leave-active {
  transition: opacity 180ms ease;
}

.photo-lightbox-fade-enter-from,
.photo-lightbox-fade-leave-to {
  opacity: 0;
}

@media (max-width: 720px) {
  .photo-lightbox {
    padding: 10px 10px 14px;
  }

  .photo-lightbox__nav {
    width: 40px;
    height: 40px;
    font-size: 1.4rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .photo-lightbox-fade-enter-active,
  .photo-lightbox-fade-leave-active {
    transition: none;
  }
}
</style>
