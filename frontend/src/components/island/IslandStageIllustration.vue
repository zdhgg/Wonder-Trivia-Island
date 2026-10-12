<script setup>
import { computed } from "vue";
import { KNOWLEDGE_ISLAND_STAGES } from "../../utils/knowledgeIslandGrowth";
const props = defineProps({ stageId: { type: String, default: "first-sight" } });
const features = computed(() => KNOWLEDGE_ISLAND_STAGES.find(stage => stage.id === props.stageId)?.features || []);
const has = (feature) => features.value.includes(feature);
</script>

<template>
  <svg class="stage-illustration" viewBox="0 0 120 84" fill="none" aria-hidden="true">
    <ellipse cx="60" cy="64" rx="55" ry="14" fill="#d8eef0" />
    <path d="M14 60C23 44 38 42 58 43S95 45 107 60C100 74 30 77 14 60Z" fill="#f0cf91" />
    <path d="M16 58C30 44 43 42 62 44S92 46 104 58C94 68 33 70 16 58Z" fill="#ffe3ad" />
    <path v-if="has('嫩芽')" d="M29 54C42 43 67 44 87 52C77 63 45 65 29 54Z" fill="#93c891" />
    <g v-if="!has('椰子树')" stroke-linecap="round">
      <path d="M37 63C32 54 38 51 43 55L46 62Z" fill="#92a6a7" />
      <path d="M74 63L80 53L86 63Z" fill="#e2a075" />
      <path d="M80 56V62M77 59L80 63L83 59" stroke="#bd7e57" />
      <g v-if="has('嫩芽')"><path d="M58 55V40" stroke="#579562" stroke-width="3" /><path d="M58 47C44 47 46 35 56 41M59 44C71 45 73 33 62 38" fill="#75af70" /></g>
    </g>
    <g v-if="has('椰子树')">
      <path d="M40 59Q49 39 44 22" stroke="#ba8953" stroke-width="5" stroke-linecap="round" />
      <path d="M45 23C32 11 22 18 22 26Q33 20 43 25C28 24 28 36 28 36Q36 27 45 26C51 15 66 17 69 25Q58 20 48 26C64 24 66 35 65 38Q57 29 48 28C48 11 42 9 38 10Z" fill="#5c9c6a" />
      <path d="M53 62L68 36L85 62Z" fill="#e7ad69" /><path d="M68 36L70 63H85Z" fill="#d39351" /><path d="M63 63L69 49L76 63Z" fill="#805d42" />
    </g>
    <g v-if="has('小码头')"><path d="M86 62L109 70M92 61L115 68" stroke="#a9825c" stroke-width="3" /><path d="M96 53H117L112 60H101Z" fill="#bc7751" /><path d="M106 53V36L116 50H107" fill="#fff7e4" stroke="#a38965" stroke-width="1.5" /></g>
    <g v-if="has('观星台')"><path d="M77 51L85 39L91 52" stroke="#758887" stroke-width="2" /><path d="M78 38L92 31L95 37L81 44Z" fill="#638a94" /></g>
    <g v-if="has('灯塔')"><path d="M86 47L89 18H100L104 47Z" fill="#fff4d8" /><path d="M88 31H101L102 38H87Z" fill="#d98371" /><path d="M87 18L94 10L102 18Z" fill="#cf735e" /><path d="M91 19H98V26H91Z" fill="#efc764" /></g>
    <path d="M8 69Q14 72 21 70M96 76Q105 78 114 74" stroke="#fff" stroke-width="2" stroke-linecap="round" />
  </svg>
</template>

<style scoped>
.stage-illustration {
  display: block;
  width: 100%;
  height: auto;
}
</style>
