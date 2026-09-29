<script setup>
// 我的知识岛：长期成长的独立页面（/knowledge-island）。
//
// 这一页只做两件事：
//   1. 把 KnowledgeIslandGrowth 放大成整页的主画面（size="hero"）；
//   2. 用同一份岛屿 ViewModel 说清楚「现在是什么样、还差多少」。
//
// 它不读 localStorage、不调接口、不数印章、不比阈值：
//   - 阶段 / 进度 / 下一阶段 / 繁荣度全部来自 knowledgeIslandGrowth 的纯函数结果；
//   - 页面不新增任何成长规则，也不引入第二份知识岛状态。
//   收藏册里的「我的知识岛」入口卡与首页摘要读的是同一套纯函数输入，
//   所以三处永远是同一个阶段、同一档繁荣度、同一颗星星。
//
// 这一页额外做一件与成长无关的事：海浪环境声。
//   - 开关状态读既有的 useAudioStore（记住的地方还是同一个 localStorage key），
//     不新增 DB、API 或第二套偏好机制；
//   - 默认是关的，而且没发生过用户交互之前一律不出声（深链直接打开也是安静的）；
//   - 组件卸载时暂停并归零，再进来按偏好恢复；
//   - 播放由 islandAmbience 里的单个 Audio 实例负责，快速进出不会叠出两层海浪；
//   - 刻意不去解锁整台应用的音频引擎：点这个开关只该多出一片海，
//     不该顺手把全站背景音乐也一起叫醒。
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import KnowledgeIslandGrowth from "../components/KnowledgeIslandGrowth.vue";
import {
  startIslandAmbience,
  stopIslandAmbience,
  subscribeIslandAmbience,
  syncIslandAmbiencePreferences,
  unlockIslandAmbience
} from "../audio/islandAmbience";
import { useAudioStore } from "../stores/useAudioStore";
import { APP_ROUTE_NAME } from "../router/routes.js";
import { getKnowledgeIslandStageIndexById } from "../utils/knowledgeIslandGrowth.js";
import { KNOWLEDGE_ISLAND_PROSPERITY_TIERS } from "../utils/knowledgeIslandProsperity.js";

const props = defineProps({
  island: {
    type: Object,
    required: true
  }
});

const router = useRouter();
const audioStore = useAudioStore();

const { islandAmbienceEnabled, masterVolume } = storeToRefs(audioStore);

// 「想听」「正在响」「记下来了」是三件事，控件上分别对应三个信号：
//   data-enabled —— 记住的选择（localStorage 里那一位）；
//   data-playing —— 此刻真的在不在响；
//   图标 / aria-pressed —— 跟着「此刻有没有声音」走。
// 之所以图标跟播放状态而不是跟偏好：刷新之后偏好还在，但新文档里用户还没交互过，
// 浏览器不允许自动出声。这时如果图标显示"开"，孩子点了反而会把它关掉 ——
// 所以图标必须诚实地说"现在没有声音"，点一下就真的把它放出来。
const isAmbiencePlaying = ref(false);
let unsubscribeAmbience = null;

const ambienceGlyph = computed(() => (isAmbiencePlaying.value ? "🔊" : "🔇"));
const ambienceToggleClass = computed(() => [
  "island-page__ambience",
  { "island-page__ambience--on": isAmbiencePlaying.value }
]);

function currentAmbiencePreferences() {
  return {
    islandAmbienceEnabled: islandAmbienceEnabled.value,
    masterVolume: masterVolume.value
  };
}

function toggleAmbience() {
  // 正在响 → 关掉；没有在响 → 点一下就放出来（这一次点击本身就是用户手势）。
  if (isAmbiencePlaying.value) {
    audioStore.setIslandAmbienceEnabled(false);
    syncIslandAmbiencePreferences(currentAmbiencePreferences());
    return;
  }

  unlockIslandAmbience();
  audioStore.setIslandAmbienceEnabled(true);
  syncIslandAmbiencePreferences(currentAmbiencePreferences());
}

onMounted(() => {
  unsubscribeAmbience = subscribeIslandAmbience((playing) => {
    isAmbiencePlaying.value = playing;
  });
  // 进来的第一件事只是"按偏好恢复"，不会绕过交互闸门自己出声。
  syncIslandAmbiencePreferences(currentAmbiencePreferences());
  startIslandAmbience();
});

onBeforeUnmount(() => {
  if (unsubscribeAmbience) {
    unsubscribeAmbience();
    unsubscribeAmbience = null;
  }

  // 离开这一页就把海浪停下来并归零：不在别的页面上继续响。
  stopIslandAmbience();
});

// 设置页里改了总音量，这一页正在响的海浪要立刻跟着变，
// 否则会出现"图标显示开着、其实被静音了"的错觉。
watch(
  () => masterVolume.value,
  () => {
    syncIslandAmbiencePreferences(currentAmbiencePreferences());
  }
);

// 顶部摘要：阶段 + 繁荣度各说一次，不重复下面的成长信息网格。
const stageName = computed(() => props.island?.currentStage?.name || "");
const stageGlyph = computed(() => props.island?.currentStage?.glyph || "🏝️");
const stageSummary = computed(() => props.island?.currentStage?.summary || "");
const prosperityKey = computed(() => String(props.island?.prosperityKey || "basic"));
const stampCount = computed(() => Number(props.island?.stampCount) || 0);
const starCount = computed(() => Number(props.island?.prosperityStarCount) || 0);

// 「第几 / 共几个阶段」：阶段顺序仍然只由 knowledgeIslandGrowth 解释，这里只是问一句。
const stagePosition = computed(() => {
  const stageIndex = getKnowledgeIslandStageIndexById(props.island?.currentStage?.id);
  const stageCount = Number(props.island?.stageCount) || 0;
  const safeIndex = stageIndex >= 0 ? stageIndex : 0;

  return `第 ${safeIndex + 1} / ${stageCount} 个阶段`;
});

function goHome() {
  void router.push({ name: APP_ROUTE_NAME.HOME });
}
</script>

<template>
  <section class="island-page" aria-label="我的知识岛">
    <header class="island-page__hero">
      <div class="island-page__hero-copy">
        <p class="island-page__eyebrow">长期成长 · 跨章节累计</p>
        <h1 class="island-page__title">我的知识岛</h1>
        <p class="island-page__lead">印章让小岛成长，星星让小岛更加繁荣。</p>
      </div>

      <div class="island-page__hero-side">
        <p class="island-page__hero-stage">
          <span class="island-page__hero-glyph" aria-hidden="true">{{ stageGlyph }}</span>
          <span class="island-page__hero-stage-text">
            <strong>当前：{{ stageName }}</strong>
            <span :class="['island-page__hero-prosperity', `island-page__hero-prosperity--${prosperityKey}`]">
              {{ island.prosperityLabel }}
            </span>
          </span>
        </p>
        <button
          :class="ambienceToggleClass"
          type="button"
          data-role="island-ambience-toggle"
          :data-enabled="islandAmbienceEnabled ? 'true' : 'false'"
          :data-playing="isAmbiencePlaying ? 'true' : 'false'"
          :aria-pressed="isAmbiencePlaying"
          aria-label="海浪声"
          :title="isAmbiencePlaying ? '关掉海浪声' : '听听海浪声'"
          @click="toggleAmbience"
        >
          <span class="island-page__ambience-glyph" aria-hidden="true">{{ ambienceGlyph }}</span>
          <span class="island-page__ambience-text">海浪声</span>
        </button>
        <button class="island-page__back" type="button" @click="goHome">返回首页</button>
      </div>
    </header>

    <!-- 主体：同一座岛，只是不再被压缩在收藏册的小模块里。 -->
    <KnowledgeIslandGrowth :island="island" size="hero" />

    <p class="island-page__summary">{{ stageSummary }}</p>

    <section class="island-page__stats" aria-label="知识岛成长信息">
      <article class="island-page__stat">
        <span class="island-page__stat-label">当前阶段</span>
        <strong class="island-page__stat-value">{{ stageName }}</strong>
        <span class="island-page__stat-note">{{ stagePosition }}</span>
      </article>

      <article class="island-page__stat">
        <span class="island-page__stat-label">探险印章</span>
        <strong class="island-page__stat-value" data-role="island-page-stamp-count">{{ stampCount }} 枚</strong>
        <span class="island-page__stat-note">每开一次今日宝箱多一枚</span>
      </article>

      <article class="island-page__stat">
        <span class="island-page__stat-label">繁荣度</span>
        <strong :class="['island-page__stat-value', `island-page__stat-value--${prosperityKey}`]">
          {{ island.prosperityLabel }}
        </strong>
        <span class="island-page__stat-note">{{ island.prosperity.summary }}</span>
      </article>

      <article class="island-page__stat">
        <span class="island-page__stat-label">累计星星</span>
        <strong class="island-page__stat-value" data-role="island-page-star-count">{{ starCount }} 颗</strong>
        <span class="island-page__stat-note">全部章节加起来的好成绩</span>
      </article>

      <article class="island-page__stat island-page__stat--wide">
        <span class="island-page__stat-label">下一枚印章</span>
        <!-- 直接说 knowledgeIslandGrowth 已经算好的那句话：同一件事全站只有一种说法。 -->
        <strong class="island-page__stat-value" data-role="island-page-next">{{ island.nextText }}</strong>
        <span v-if="!island.isMaxStage" class="island-page__stat-note">
          这一阶段已经走了 {{ island.progressText }} 枚
        </span>
      </article>
    </section>

    <!-- 繁荣度三档：档位名称与顺序都直接读 knowledgeIslandProsperity 的常量，
         页面只负责把「已经走到哪一档」画出来，不在这里重新判定星数。 -->
    <div class="island-page__tiers" aria-label="繁荣度三个档位">
      <span
        v-for="tier in KNOWLEDGE_ISLAND_PROSPERITY_TIERS"
        :key="tier.key"
        :class="[
          'island-page__tier',
          `island-page__tier--${tier.key}`,
          { 'island-page__tier--reached': Number(island.prosperityLevel) >= tier.level }
        ]"
      >
        {{ tier.label }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.island-page {
  display: grid;
  min-width: 0;
  /* 桌面端整页收进一个居中的内容列。
     以前这一页是「一张铺满首屏的大画面 + 下面一排小卡片」，
     画面几乎顶满整屏，成长信息要一直往下滑才看得到。
     现在整页（含标题、场景、成长信息）共用一条约 1050px 的列：
       - 16:9 的画面盒随之稳定在约 1024 × 576，1440 宽下不再占满首屏；
       - 行距与标题一起收一档，省下的高度全部留给「首屏底部看得见成长信息」；
       - 820 / 390 窄屏本来就比这条列窄，仍然是接近满宽的整幅画面。
     这里只改"画多大"，不碰 400×225 的世界坐标，也不碰任何阶段规则。 */
  width: 100%;
  max-width: 1050px;
  margin-inline: auto;
  gap: 12px;
}

.island-page__hero {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  /* 顶部摘要收紧一档：整页已经收进内容列，
     再把这一块压薄一点，首屏底部就能露出下面的成长信息。 */
  padding: 12px 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(173, 235, 255, 0.42) 0%, rgba(173, 235, 255, 0) 36%),
    linear-gradient(180deg, rgba(255, 253, 248, 0.96) 0%, rgba(255, 255, 255, 0.88) 100%);
  box-shadow:
    0 22px 34px -36px rgba(36, 50, 74, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.island-page__hero-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.island-page__eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  line-height: 1.3;
}

.island-page__title {
  margin: 0;
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.55rem;
  line-height: 1.12;
}

.island-page__lead {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.5;
}

.island-page__hero-side {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-width: 0;
}

.island-page__hero-stage {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  min-width: 0;
}

.island-page__hero-glyph {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(72, 154, 148, 0.24);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  font-size: 1.3rem;
  line-height: 1;
}

.island-page__hero-stage-text {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--color-ink);
  font-size: 1.05rem;
}

.island-page__hero-prosperity {
  padding: 2px 10px;
  border: 1px solid rgba(72, 154, 148, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #2f7a6c;
  font-size: 0.8rem;
  font-weight: 900;
}

.island-page__hero-prosperity--lush {
  border-color: rgba(52, 138, 92, 0.32);
  background: rgba(240, 252, 240, 0.86);
  color: #2f7a4c;
}

.island-page__hero-prosperity--flourishing {
  border-color: rgba(198, 141, 26, 0.36);
  background: rgba(255, 249, 226, 0.9);
  color: #8a5a00;
}

.island-page__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 顶部摘要压薄了，但按钮本身仍保持 42px 的可点高度 ——
     省下来的高度来自标题行距，不是来自把按钮变小。 */
  min-height: 42px;
  padding: 9px 18px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.island-page__back:hover,
.island-page__back:focus-visible {
  border-color: rgba(124, 216, 184, 0.5);
  background: rgba(247, 252, 249, 0.98);
  box-shadow: 0 16px 24px -24px rgba(36, 50, 74, 0.42);
  outline: none;
  transform: translateY(-1px);
}

/* 海浪声开关：看得清、但不抢眼。
   它和「返回首页」并排放在同一块里，两者高度一致（都是 42px），
   所以顶部摘要不会因为多了一个按钮而变高一行。 */
.island-page__ambience {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  padding: 9px 14px;
  border: 1.5px solid rgba(36, 50, 74, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--color-ink-soft);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.island-page__ambience:hover,
.island-page__ambience:focus-visible {
  border-color: rgba(124, 216, 184, 0.5);
  background: rgba(247, 252, 249, 0.98);
  box-shadow: 0 16px 24px -24px rgba(36, 50, 74, 0.42);
  outline: none;
  transform: translateY(-1px);
}

/* 打开时给一点很浅的暖色，暗示"现在有海浪声"；关闭态保持中性灰。 */
.island-page__ambience--on {
  border-color: rgba(72, 154, 148, 0.34);
  background: rgba(238, 250, 246, 0.92);
  color: #2f7a6c;
}

.island-page__ambience-glyph {
  font-size: 1.05rem;
  line-height: 1;
}

.island-page__summary {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.6;
}

/* 成长信息：宽屏一行四格，窄屏折成两格；最后一格独占一整行。 */
.island-page__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.island-page__stat {
  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 0;
  padding: 14px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 20px;
  background: linear-gradient(160deg, #ffffff 0%, #f7fbfe 100%);
  box-shadow: 0 18px 30px -32px rgba(36, 50, 74, 0.4);
}

.island-page__stat--wide {
  grid-column: 1 / -1;
}

.island-page__stat-label {
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.island-page__stat-value {
  min-width: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.35rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.island-page__stat-value--basic {
  color: #2f7a6c;
}

.island-page__stat-value--lush {
  color: #2f7a4c;
}

.island-page__stat-value--flourishing {
  color: #8a5a00;
}

.island-page__stat-note {
  min-width: 0;
  color: var(--color-ink-soft);
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.5;
}

.island-page__tiers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.island-page__tier {
  padding: 4px 12px;
  border: 1.5px dashed rgba(36, 50, 74, 0.16);
  border-radius: 999px;
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 800;
  opacity: 0.55;
}

.island-page__tier--reached {
  border-style: solid;
  opacity: 1;
}

.island-page__tier--basic.island-page__tier--reached {
  border-color: rgba(72, 154, 148, 0.36);
  background: rgba(238, 250, 246, 0.9);
  color: #2f7a6c;
}

.island-page__tier--lush.island-page__tier--reached {
  border-color: rgba(52, 138, 92, 0.36);
  background: rgba(240, 252, 240, 0.9);
  color: #2f7a4c;
}

.island-page__tier--flourishing.island-page__tier--reached {
  border-color: rgba(198, 141, 26, 0.4);
  background: rgba(255, 249, 226, 0.92);
  color: #8a5a00;
}

@media (max-width: 900px) {
  .island-page__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .island-page {
    gap: 12px;
  }

  .island-page__hero {
    padding: 16px 14px;
    border-radius: 22px;
  }

  .island-page__title {
    font-size: 1.6rem;
  }

  /* 窄屏顶部摘要改成左对齐一列，按钮仍占满一行方便点。 */
  .island-page__hero-side {
    justify-content: flex-start;
    width: 100%;
  }

  .island-page__back {
    width: 100%;
  }

  /* 窄屏：开关与「返回首页」各占一行，都保持 42px 的可点高度。 */
  .island-page__ambience {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .island-page__back,
  .island-page__ambience {
    transition: none;
  }

  .island-page__back:hover,
  .island-page__back:focus-visible,
  .island-page__ambience:hover,
  .island-page__ambience:focus-visible {
    transform: none;
  }
}
</style>
