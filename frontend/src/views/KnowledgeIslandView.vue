<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import KnowledgeIslandGrowth from "../components/KnowledgeIslandGrowth.vue";
import IslandGrowthPanel from "../components/island/IslandGrowthPanel.vue";
import IslandStageIllustration from "../components/island/IslandStageIllustration.vue";
import IslandStagePreview from "../components/island/IslandStagePreview.vue";
import IslandBottlePanel from "../components/island/IslandBottlePanel.vue";
import { playAudioCue, resumeBackgroundMusic, suspendBackgroundMusic } from "../audio/audioEngine";
import { startIslandAmbience, stopIslandAmbience, syncIslandAmbiencePreferences, syncIslandAmbienceScene } from "../audio/islandAmbience";
import { resolveIslandSoundscape, startIslandSoundscape, stopIslandSoundscape, syncIslandSoundscapePreferences, syncIslandSoundscapeScene } from "../audio/islandSoundscape";
import { useAudioStore } from "../stores/useAudioStore";
import { DEFAULT_PROFILE, useSettingsStore } from "../stores/useSettingsStore";
import { duckIslandForReward, resetIslandAudioFocus, setIslandReading } from "../audio/islandAudioFocus";
import { usePageEntryCue } from "../composables/usePageEntryCue";
import { useIslandBottle } from "../composables/useIslandBottle";
import { APP_ROUTE_NAME } from "../router/routes";
import { KNOWLEDGE_ISLAND_STAGES, getKnowledgeIslandStageIndexById } from "../utils/knowledgeIslandGrowth";

const props = defineProps({
  island: { type: Object, required: true },
  dailyChest: { type: Object, default: () => ({}) },
  claiming: { type: Boolean, default: false },
  errorMessage: { type: String, default: "" }
});
const emit = defineEmits(["claim-daily-chest"]);
const router = useRouter();
const audioStore = useAudioStore();
const settingsStore = useSettingsStore();
const { playPageEntryCue } = usePageEntryCue();
const { bottleAvailable, bottleLine, openBottle } = useIslandBottle();
const bottleOpen = ref(false);
const readingLine = ref("");
// 信纸上的称呼用设置里的昵称：档案已带默认值兜底，这里再防一次空串。
const bottleRecipient = computed(() => {
  const normalizedName = String(settingsStore.profile.displayName || "").trim();
  return normalizedName || DEFAULT_PROFILE.displayName;
});
const previewStage = ref(null);
const guideVisible = ref(false);
const stageIndex = computed(() => Math.max(0, getKnowledgeIslandStageIndexById(props.island.currentStage.id)));
const stageRoadmap = computed(() => KNOWLEDGE_ISLAND_STAGES.map((stage, index) => ({
  ...stage, reached: props.island.stampCount >= stage.threshold,
  isCurrent: index === stageIndex.value, remaining: Math.max(0, stage.threshold - props.island.stampCount)
})));
const roadmapMessage = ref("");

onMounted(() => {
  try { guideVisible.value = localStorage.getItem("wti:island-explored:v1") !== "yes"; }
  catch { guideVisible.value = true; }
});
function handleInteraction() {
  guideVisible.value = false;
  try { localStorage.setItem("wti:island-explored:v1", "yes"); } catch { /* Optional discovery hint. */ }
}
function handleBottleOpen() {
  playAudioCue("message");
  openBottle();
  readingLine.value = bottleLine.value;
  bottleOpen.value = true;
  handleInteraction();
}
function showStageNote(stage) {
  playAudioCue("toggle");
  previewStage.value = KNOWLEDGE_ISLAND_STAGES.find(item => item.id === stage.id) || null;
  roadmapMessage.value = stage.isCurrent ? `「${stage.name}」就是小岛现在的样子` : stage.reached ? `「${stage.name}」已经解锁啦` : `再集 ${stage.remaining ?? props.island.remainingToNext} 枚印章，就能解锁「${stage.name}」`;
}
function previewNext() {
  const next = stageRoadmap.value.find(stage => stage.id === props.island.nextStage?.id);
  if (next) showStageNote(next);
}
function goHome(today = false) {
  void playPageEntryCue();
  void router.push({ name: APP_ROUTE_NAME.HOME, hash: today ? "#today-tasks" : "" });
}
const { masterVolume, musicEnabled, sfxEnabled, sfxVolume } = storeToRefs(audioStore);

function currentAmbiencePreferences() {
  return {
    masterVolume: masterVolume.value,
    musicEnabled: musicEnabled.value,
    sfxEnabled: sfxEnabled.value,
    sfxVolume: sfxVolume.value
  };
}

const currentStageId = computed(() => String(props.island?.currentStage?.id || ""));
const currentProsperityLevel = computed(() => Number(props.island?.prosperityLevel) || 0);

function syncSceneToAudio() {
  const scene = resolveIslandSoundscape(currentStageId.value, currentProsperityLevel.value);

  syncIslandSoundscapeScene({
    stageId: currentStageId.value,
    prosperityLevel: currentProsperityLevel.value
  });
  syncIslandAmbienceScene({ gullVariationCount: scene.gullVariationCount });
}

function startPageAudio() {
  if (document.hidden) return;
  setIslandReading(bottleOpen.value || Boolean(previewStage.value));
  syncSceneToAudio();
  syncIslandAmbiencePreferences(currentAmbiencePreferences());
  startIslandAmbience();
  syncIslandSoundscapePreferences(currentAmbiencePreferences());
  startIslandSoundscape();
  suspendBackgroundMusic({ delayMs: 1200 });
}

function stopPageAudio() {
  stopIslandAmbience();
  stopIslandSoundscape();
  resumeBackgroundMusic();
}

function handleVisibilityChange() {
  if (document.hidden) stopPageAudio();
  else startPageAudio();
}

onMounted(() => {
  startPageAudio();
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

watch([bottleOpen, previewStage], ([bottle, preview]) => {
  setIslandReading(bottle || Boolean(preview));
}, { flush: "sync" });

watch(() => props.dailyChest.showStampReward, (show, previous) => {
  if (!show || previous || document.hidden) return;
  duckIslandForReward();
  playAudioCue("finish");
});

watch(
  () => [currentStageId.value, currentProsperityLevel.value],
  () => {
    syncSceneToAudio();
  }
);

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  stopPageAudio();
  resetIslandAudioFocus();
});

</script>

<template>
  <section class="island-page" aria-label="我的知识岛">
    <header class="island-page__hero">
      <div class="island-page__hero-copy">
        <p class="island-page__eyebrow">每一次探索，都让小岛长大一点</p>
        <h1 class="island-page__title">我的知识岛</h1>
      </div>
      <button class="island-page__back" type="button" @click="goHome()"><span aria-hidden="true">←</span> 返回首页</button>
    </header>

    <div class="island-page__main">
      <div class="island-page__scene-column">
        <div class="island-page__scene-heading">
          <div class="island-page__current"><IslandStageIllustration :stage-id="island.currentStage.id" /><div><strong>当前：{{ island.currentStage.name }}</strong><span>第 {{ stageIndex + 1 }} / {{ island.stageCount }} 个阶段 · {{ island.prosperityLabel }}</span></div></div>
          <button class="island-page__letter" type="button" :class="{ 'is-new': bottleAvailable }" @click="handleBottleOpen"><span class="island-page__letter-dot" v-if="bottleAvailable" aria-hidden="true"></span>{{ bottleAvailable ? '今日漂流瓶' : '重读今日来信' }}<span aria-hidden="true"> ↗</span></button>
        </div>
        <KnowledgeIslandGrowth :island="island" size="hero" :bottle="bottleAvailable" :bottle-line="bottleLine" @bottle-open="handleBottleOpen" @interaction="handleInteraction" @preview-next="previewNext" />
        <div class="island-page__scene-caption">
          <p class="island-page__summary">{{ island.currentStage.summary }}</p>
          <p v-if="guideVisible" class="island-page__guide">试着点点贝壳，听听小岛的回应。</p>
          <p v-else class="island-page__guide">印章让小岛成长，星星让它更加繁荣。</p>
        </div>
      </div>
      <IslandGrowthPanel :island="island" :daily-chest="dailyChest" :claiming="claiming" :error-message="errorMessage" @claim="emit('claim-daily-chest')" @explore="goHome(true)" @preview="previewNext" />
    </div>

    <section class="island-page__roadmap" aria-label="小岛成长路线">
      <div class="island-page__roadmap-head"><h2>小岛成长路线</h2><p>每一枚印章，都会留在这段旅程里。</p></div>
      <ol class="island-page__roadmap-list">
        <li v-for="stage in stageRoadmap" :key="stage.id">
          <button type="button" :class="['island-page__roadmap-stage', { 'island-page__roadmap-stage--current': stage.isCurrent, 'island-page__roadmap-stage--reached': stage.reached }]" :data-role="`island-page-roadmap-${stage.id}`" :aria-current="stage.isCurrent ? 'step' : undefined" :aria-label="`${stage.name}，${stage.reached ? '已解锁' : `还差 ${stage.remaining} 枚印章`}，查看阶段预览`" @click="showStageNote(stage)">
            <span class="island-page__roadmap-image"><IslandStageIllustration :stage-id="stage.id" /></span>
            <span class="island-page__roadmap-name">{{ stage.name }}</span>
            <span class="island-page__roadmap-threshold">{{ stage.isCurrent ? '小岛在这里' : stage.reached ? '已走过' : `还差 ${stage.remaining} 枚` }}</span>
          </button>
        </li>
      </ol>
      <p v-if="roadmapMessage" class="island-page__sr" data-role="island-page-roadmap-message" role="status">{{ roadmapMessage }}</p>
    </section>
    <IslandStagePreview :stage="previewStage" :island="island" @close="previewStage = null" />
    <IslandBottlePanel :open="bottleOpen" :line="readingLine" :recipient="bottleRecipient" @close="bottleOpen = false" />
  </section>
</template>

<style scoped>
.island-page {
  width: 100%;
  max-width: 1240px;
  margin-inline: auto;
  min-width: 0;
  display: grid;
  gap: 24px;
  color: #29424b;
  font-weight: 400;
}

.island-page__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 2px 2px 0;
}

.island-page__eyebrow {
  margin: 0 0 7px;
  font-size: .78rem;
  color: #6a807a;
  letter-spacing: .06em;
}

.island-page__title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", sans-serif;
  font-size: clamp(1.5rem, 2.3vw, 2rem);
  line-height: 1.25;
}

.island-page__back {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
  min-height: 44px;
  padding: 8px 15px;
  border: 1px solid #ceddd7;
  border-radius: 12px;
  background: #ffffffa8;
  color: #426354;
  font: inherit;
  font-size: .85rem;
  cursor: pointer;
}

.island-page__back:hover {
  background: #fff;
  border-color: #7aab95;
}

.island-page__main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 22px;
  align-items: stretch;
}

.island-page__scene-column {
  min-width: 0;
}

.island-page__scene-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
  padding: 0 5px 12px;
}

.island-page__current {
  display: flex;
  align-items: center;
  gap: 10px;
}

.island-page__current > svg {
  width: 58px;
}

.island-page__current > div {
  display: grid;
  gap: 4px;
}

.island-page__current strong {
  font-size: 1rem;
  font-weight: 700;
}

.island-page__current span {
  font-size: .72rem;
  color: #73837b;
}

.island-page__letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid #d8e5dc;
  border-radius: 12px;
  color: #53746a;
  background: #ffffffa8;
  font: inherit;
  font-size: .76rem;
  cursor: pointer;
}

.island-page__letter:hover {
  background: #fff;
  border-color: #80aa95;
}

.island-page__letter-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #bb9250;
  animation: letter-arrived 900ms ease-in-out 2;
}

@keyframes letter-arrived {
  50% {
    box-shadow: 0 0 0 5px #c3a86725;
  }
}

.island-page__scene-caption {
  padding: 15px 6px 0;
}

.island-page__summary {
  margin: 0;
  font-size: .9rem;
  line-height: 1.7;
}

.island-page__guide {
  margin: 5px 0 0;
  color: #72847c;
  font-size: .75rem;
  line-height: 1.7;
}

.island-page__roadmap {
  padding: 22px 0 0;
  border-top: 1px solid #d7e1d7;
}

.island-page__roadmap-head {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 20px;
  align-items: baseline;
  margin-bottom: 14px;
}

.island-page__roadmap h2 {
  margin: 0;
  font-size: 1rem;
}

.island-page__roadmap-head p {
  margin: 0;
  font-size: .76rem;
  color: #748279;
}

.island-page__roadmap-list {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.island-page__roadmap-list li {
  min-width: 0;
}

.island-page__roadmap-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 8px 10px 14px;
  border: 1px solid transparent;
  border-radius: 17px;
  background: #ffffff65;
  color: #3f5955;
  font: inherit;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease;
}

.island-page__roadmap-stage:hover {
  background: #ffffffd9;
  border-color: #c5d9ce;
}

.island-page__roadmap-stage--current {
  background: #f8fff9;
  border-color: #8ab59d;
}

.island-page__roadmap-image {
  display: block;
  width: min(100%, 115px);
  opacity: .76;
  filter: saturate(.6);
}

.island-page__roadmap-stage--reached .island-page__roadmap-image {
  opacity: 1;
  filter: none;
}

.island-page__roadmap-name {
  margin-top: 5px;
  font-size: .84rem;
  font-weight: 700;
}

.island-page__roadmap-threshold {
  margin-top: 5px;
  font-size: .7rem;
  color: #708079;
}

.island-page__roadmap-stage--current .island-page__roadmap-threshold {
  color: #39735b;
}

.island-page button:focus-visible {
  outline: 3px solid #aa853b;
  outline-offset: 3px;
}

.island-page__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

@media (max-width: 1050px) {
  .island-page__main {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
  .island-page {
    max-width: 880px;
  }
}

@media (max-width: 680px) {
  .island-page {
    gap: 19px;
  }
  .island-page__hero {
    gap: 10px;
  }
  .island-page__eyebrow {
    font-size: .66rem;
    letter-spacing: 0;
  }
  .island-page__back {
    font-size: .76rem;
    padding: 8px 10px;
  }
  .island-page__back > span {
    display: none;
  }
  .island-page__scene-heading {
    gap: 6px;
    padding-inline: 0;
  }
  .island-page__current {
    gap: 5px;
  }
  .island-page__current > svg {
    width: 40px;
  }
  .island-page__current strong {
    font-size: .87rem;
  }
  .island-page__letter {
    padding: 7px 8px;
    font-size: .69rem;
    gap: 4px;
  }
  .island-page__scene-caption {
    padding: 12px 2px 0;
  }
  .island-page__summary {
    font-size: .82rem;
  }
  .island-page__guide {
    font-size: .72rem;
  }
  .island-page__roadmap-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px 6px;
  }
  .island-page__roadmap-stage {
    padding: 5px 5px 12px;
  }
  .island-page__roadmap-name {
    font-size: .78rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .island-page__letter-dot {
    animation: none;
  }
  .island-page__roadmap-stage {
    transition: none;
  }
}
</style>
