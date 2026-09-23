<script setup>
// 今日宝箱：3 个今日小任务全部完成才解锁，每个本地自然日只能领一次。
//
// 组件只负责显示和转发点击，不做任何判定：
// “能不能领”由 homeDashboard.buildHomeDailyChest 依据任务完成情况 + 长期成长账本算好，
// “领取”由 useTriviaApp 调后端接口完成（幂等放在服务端）。
import { computed } from "vue";

const props = defineProps({
  chest: {
    type: Object,
    required: true
  },
  isClaiming: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["claim"]);

const chestGlyph = computed(() => {
  if (props.chest.isClaimed) {
    return "🧭";
  }

  return props.chest.isUnlocked ? "🎁" : "📦";
});
</script>

<template>
  <section :class="['daily-chest', `daily-chest--${chest.statusTone}`]" aria-label="今日宝箱">
    <header class="daily-chest__head">
      <h2 class="daily-chest__title">今日宝箱</h2>
      <span class="daily-chest__progress">{{ chest.progressText }}</span>
    </header>

    <div class="daily-chest__body">
      <span class="daily-chest__glyph" aria-hidden="true">{{ chestGlyph }}</span>
      <div class="daily-chest__copy">
        <strong class="daily-chest__status">{{ chest.statusLabel }}</strong>
        <p class="daily-chest__hint">{{ chest.hintText }}</p>
      </div>
    </div>

    <p
      v-if="chest.showStampReward"
      class="daily-chest__reward"
      role="status"
      aria-live="polite"
    >
      🧭 {{ chest.stampText }}
    </p>

    <button
      v-if="chest.canClaim"
      class="daily-chest__action"
      type="button"
      :disabled="isClaiming"
      @click="emit('claim')"
    >
      {{ isClaiming ? "正在打开宝箱..." : chest.actionLabel }}
    </button>

    <p v-else-if="chest.isClaimed" class="daily-chest__stamp-chip">
      🧭 已有 {{ chest.stampCount }} 枚探险印章
    </p>

    <p v-if="errorMessage" class="daily-chest__error" role="alert">{{ errorMessage }}</p>
  </section>
</template>

<style scoped>
.daily-chest {
  display: grid;
  gap: 10px;
  align-content: start;
  padding: 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.08);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(255, 231, 156, 0.28), transparent 46%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 250, 240, 0.88) 100%);
  box-shadow:
    0 10px 22px -28px rgba(36, 50, 74, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.daily-chest--ready {
  border-color: rgba(255, 174, 66, 0.42);
}

.daily-chest--claimed {
  border-color: rgba(124, 216, 184, 0.46);
  background:
    radial-gradient(circle at top right, rgba(184, 242, 223, 0.32), transparent 46%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(244, 254, 249, 0.9) 100%);
}

.daily-chest__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.daily-chest__title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.25rem;
  line-height: 1.2;
}

.daily-chest__progress {
  color: var(--color-ink-soft);
  font-size: 0.84rem;
  font-weight: 800;
}

.daily-chest__body {
  display: flex;
  align-items: center;
  gap: 10px;
}

.daily-chest__glyph {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 1.2rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.daily-chest--ready .daily-chest__glyph {
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 231, 156, 0.9) 100%);
}

.daily-chest__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.daily-chest__status {
  color: var(--color-ink);
  font-size: 0.96rem;
  font-weight: 900;
}

.daily-chest--claimed .daily-chest__status {
  color: #1f6b51;
}

.daily-chest__hint {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  font-weight: 700;
}

.daily-chest__reward {
  margin: 0;
  padding: 8px 12px;
  border: 1px solid rgba(255, 174, 66, 0.34);
  border-radius: 14px;
  background: rgba(255, 248, 226, 0.86);
  color: rgba(176, 84, 22, 0.98);
  font-size: 0.88rem;
  font-weight: 900;
}

.daily-chest__action {
  appearance: none;
  min-height: 40px;
  padding: 8px 16px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 214, 128, 0.98) 0%, rgba(255, 174, 66, 0.98) 100%);
  color: #5a3208;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 900;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.daily-chest__action:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 20px -16px rgba(176, 84, 22, 0.7);
}

.daily-chest__action:disabled {
  cursor: progress;
  opacity: 0.72;
}

.daily-chest__action:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 174, 66, 0.32);
}

.daily-chest__stamp-chip {
  margin: 0;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(184, 242, 223, 0.4);
  color: var(--color-ink);
  font-size: 0.86rem;
  font-weight: 800;
}

.daily-chest__error {
  margin: 0;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(255, 226, 226, 0.8);
  color: #9b2c2c;
  font-size: 0.82rem;
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .daily-chest__action {
    transition: none;
  }

  .daily-chest__action:hover:not(:disabled) {
    transform: none;
  }
}
</style>
