<script setup>
import IslandDialog from "./IslandDialog.vue";
defineProps({
  open: { type: Boolean, default: false },
  line: { type: String, default: "" },
  // 收信人昵称：来自设置里的学习档案，空串时信纸退回「不写称呼」。
  recipient: { type: String, default: "" }
});
const emit = defineEmits(["close"]);
</script>

<template>
  <IslandDialog :open="open" title="海风捎来一封信" @close="emit('close')">
    <div class="bottle-letter">
      <svg viewBox="0 0 120 100" aria-hidden="true"><ellipse cx="60" cy="81" rx="39" ry="8" fill="#dfefed" /><g transform="rotate(14 60 50)"><path d="M51 25V42Q37 49 40 62L42 78Q60 87 78 78L80 62Q82 49 69 42V25Z" fill="#acd5ce" stroke="#619c98" stroke-width="2" /><rect x="49" y="18" width="22" height="11" rx="3" fill="#b38960" /><path d="M48 50H70V75H48Z" fill="#fff3d6" /><path d="M53 57H65M53 63H65M53 69H60" stroke="#b6a076" stroke-width="2" stroke-linecap="round" /><path d="M45 50Q40 64 45 73" stroke="#ffffffad" stroke-width="3" stroke-linecap="round" /></g></svg>
      <p v-if="recipient" class="bottle-letter__salutation">写给{{ recipient }}：</p>
      <p class="bottle-letter__line">{{ line }}</p>
      <p class="bottle-letter__signature">来自海的另一边</p>
      <p class="bottle-letter__note">这封信今天可以随时重读，明天会有新的来信。</p>
    </div>
  </IslandDialog>
</template>

<style scoped>
.bottle-letter {
  text-align: center;
  padding: 8px 10px 16px;
}

.bottle-letter svg {
  display: block;
  width: 120px;
  margin: 0 auto 20px;
}

.bottle-letter__salutation {
  margin: 0 0 8px;
  font-size: .92rem;
  color: #619c98;
}

.bottle-letter__line {
  margin: 0;
  font-size: 1.1rem;
  line-height: 2;
  color: #36564e;
}

.bottle-letter__signature {
  margin: 24px 0;
  font-size: .85rem;
  color: #85968c;
}

.bottle-letter__note {
  margin: 0;
  font-size: .76rem;
  line-height: 1.7;
  color: #71807f;
}
</style>
