<script setup>
// 知识岛阶段变化反馈：App 根级的轻量弹层。
//
// 它只在“服务端确认这次真的新领到一枚印章、并且这一枚让知识岛进了新阶段”时打开，
// 属于临时 UI 状态，不做持久化、不记录“看过没有”。
//
// 组件不做任何判定：不读 localStorage、不读接口、不数印章、不比阈值。
// 阶段名 / 新元素 / 岛屿画面全部来自 knowledgeIslandGrowth 的纯函数结果。
import KnowledgeIslandGrowth from "./KnowledgeIslandGrowth.vue";

const props = defineProps({
  celebration: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(["close", "open-island"]);

// 点遮罩、点「知道啦」、点右上角关闭都是同一种行为：关掉，不做别的。
function close() {
  emit("close");
}
</script>

<template>
  <div v-if="props.celebration" class="island-celebration-overlay animate-fade-in" @click.self="close">
    <div
      class="island-celebration animate-pop-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="knowledge-island-stage-celebration-title"
    >
      <button class="island-celebration__close" type="button" aria-label="关闭小岛变化提示" @click="close">×</button>

      <header class="island-celebration__head">
        <span class="island-celebration__glyph" aria-hidden="true">{{ celebration.toStage.glyph }}</span>
        <div class="island-celebration__heading">
          <h3 id="knowledge-island-stage-celebration-title" class="island-celebration__title">{{ celebration.title }}</h3>
          <p class="island-celebration__stage">{{ celebration.toStage.name }}</p>
        </div>
      </header>

      <p class="island-celebration__text">{{ celebration.celebrateText }}</p>

      <!-- 直接复用收藏册那一座岛：庆祝与收藏册永远显示同一个阶段。 -->
      <div class="island-celebration__island">
        <KnowledgeIslandGrowth :island="celebration.island" />
      </div>

      <div v-if="celebration.hasNewFeatures" class="island-celebration__features">
        <span class="island-celebration__features-label">新出现</span>
        <ul class="island-celebration__feature-list">
          <li
            v-for="feature in celebration.newFeatures"
            :key="feature.name"
            class="island-celebration__feature"
          >
            <span class="island-celebration__feature-glyph" aria-hidden="true">{{ feature.glyph }}</span>
            <span class="island-celebration__feature-name">{{ feature.name }}</span>
          </li>
        </ul>
      </div>

      <div class="island-celebration__actions">
        <button class="island-celebration__primary" type="button" @click="emit('open-island')">
          {{ celebration.actionLabel }}
        </button>
        <button class="island-celebration__secondary" type="button" @click="close">
          {{ celebration.dismissLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.island-celebration-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(36, 50, 74, 0.52);
  backdrop-filter: blur(8px);
  z-index: 2520;
  box-sizing: border-box;
}

/* 弹层自身可以纵向滚动：内容再高也不会把按钮挤出屏幕，更不会横向溢出。 */
.island-celebration {
  position: relative;
  display: grid;
  gap: 12px;
  align-content: start;
  width: min(520px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 22px;
  border: 5px solid #2c3e50;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.5), transparent 46%),
    linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  box-shadow:
    0 12px 0 #2c3e50,
    0 24px 38px rgba(36, 50, 74, 0.25);
  box-sizing: border-box;
}

.island-celebration__close {
  position: absolute;
  top: 8px;
  right: 14px;
  padding: 0;
  border: none;
  background: none;
  color: #a5b1c2;
  font-size: 2rem;
  font-weight: 300;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s ease;
}

.island-celebration__close:hover {
  color: #ff6b6b;
}

.island-celebration__close:focus-visible {
  outline: none;
  color: var(--color-ink);
  box-shadow: 0 0 0 3px rgba(255, 174, 66, 0.32);
  border-radius: 8px;
}

.island-celebration__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 28px;
  min-width: 0;
}

.island-celebration__glyph {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  background: linear-gradient(145deg, #ffffff 0%, rgba(184, 242, 223, 0.9) 100%);
  font-size: 1.5rem;
  line-height: 1;
  box-shadow: 0 10px 18px -16px rgba(36, 50, 74, 0.5);
}

.island-celebration__heading {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.island-celebration__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.3rem;
  line-height: 1.25;
}

.island-celebration__stage {
  margin: 0;
  color: #1f6b51;
  font-size: 0.95rem;
  font-weight: 900;
}

.island-celebration__text {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.6;
}

.island-celebration__island {
  display: grid;
  min-width: 0;
}

.island-celebration__features {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border: 1.5px dashed rgba(124, 216, 184, 0.7);
  border-radius: 16px;
  background: rgba(240, 251, 247, 0.8);
}

.island-celebration__features-label {
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  font-weight: 900;
}

.island-celebration__feature-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.island-celebration__feature {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 2px solid #ffe082;
  border-radius: 999px;
  background: linear-gradient(135deg, #fffbeb 0%, #fff3e0 100%);
  color: #8a5a00;
  font-size: 0.86rem;
  font-weight: 900;
}

.island-celebration__feature-glyph {
  font-size: 1rem;
  line-height: 1;
}

.island-celebration__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

.island-celebration__primary {
  appearance: none;
  flex: 1 1 200px;
  min-height: 44px;
  padding: 10px 18px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(124, 216, 184, 0.98) 0%, rgba(86, 176, 214, 0.98) 100%);
  color: #10394a;
  font-family: inherit;
  font-size: 0.96rem;
  font-weight: 900;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.island-celebration__primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 20px -16px rgba(31, 107, 81, 0.8);
}

.island-celebration__primary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.45);
}

.island-celebration__secondary {
  appearance: none;
  flex: 0 1 auto;
  min-height: 40px;
  padding: 8px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink-soft);
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    color 160ms ease,
    border-color 160ms ease;
}

.island-celebration__secondary:hover {
  transform: translateY(-1px);
  border-color: rgba(36, 50, 74, 0.26);
  color: var(--color-ink);
}

.island-celebration__secondary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 174, 66, 0.28);
}

/* 390 窄屏：按钮整行排布，弹层内边距收紧，仍然靠自身滚动兜住高度。 */
@media (max-width: 480px) {
  .island-celebration {
    padding: 18px 16px;
    border-width: 4px;
    max-height: calc(100vh - 24px);
  }

  .island-celebration__glyph {
    width: 40px;
    height: 40px;
    font-size: 1.3rem;
  }

  .island-celebration__title {
    font-size: 1.15rem;
  }

  .island-celebration__primary,
  .island-celebration__secondary {
    flex: 1 1 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .island-celebration__close,
  .island-celebration__primary,
  .island-celebration__secondary {
    transition: none;
  }

  .island-celebration__primary:hover,
  .island-celebration__secondary:hover {
    transform: none;
  }
}
</style>
