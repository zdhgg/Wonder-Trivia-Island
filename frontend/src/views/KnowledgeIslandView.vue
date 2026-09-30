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
// 这一页额外做一件与成长无关的事：让知识岛有一整套「专属环境声」。
//   - 没有自己的按钮、自己的开关、自己的偏好 —— 上一轮那颗「海岛声音」已经删掉，
//     现在它完全跟随全站的声音状态：右上角那一颗静音按钮就是全站唯一的声音入口，
//     它管背景音乐、答题音效，也管这一页的海浪与海鸥；
//   - 默认不出声，而且没发生过用户交互之前一律不出声（深链直接打开也是安静的）；
//     这一层绝不自己制造手势，也不自己去解锁音频引擎 —— 只等既有的全局音频机制
//     （设置页「启用音频」，或右上角静音按钮的取消静音）先拿到那次合法交互；
//   - 组件卸载时暂停并归零，再进来按全局状态恢复；
//   - 播放由 islandAmbience 负责，每种素材各一个实例，快速进出不会叠播。
//
// 还有一件事：持续背景音乐（BGM）只属于这一页。
// 进入时 suspendBackgroundMusic() 把持续音乐的所有权交给知识岛，
// 离开时 resumeBackgroundMusic() 无条件收走 —— 普通页面一律不放持续音乐。
// 这不修改用户的任何全局设置（BGM 开关、音量、偏好一个字都不动），
// 状态只有一个布尔量，反复进出幂等（见 audioEngine 的注释）。
//
// 环境声有两层，都完全跟随全站声音状态：
//   - islandAmbience：海浪循环 + 偶尔一声海鸥（任何阶段都一样）；
//   - islandSoundscape：随阶段 / 繁荣度变化的风、船铃与雾号，
//     鸥鸣间隔也随繁荣度收紧。两层都只在全局允许且引擎已解锁时才响。
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import KnowledgeIslandGrowth from "../components/KnowledgeIslandGrowth.vue";
import { playAudioCue, resumeBackgroundMusic, suspendBackgroundMusic } from "../audio/audioEngine";
import {
  startIslandAmbience,
  stopIslandAmbience,
  syncIslandAmbiencePreferences,
  syncIslandAmbienceScene
} from "../audio/islandAmbience";
import {
  resolveIslandSoundscape,
  startIslandSoundscape,
  stopIslandSoundscape,
  syncIslandSoundscapePreferences,
  syncIslandSoundscapeScene
} from "../audio/islandSoundscape";
import { useAudioStore } from "../stores/useAudioStore";
import { usePageEntryCue } from "../composables/usePageEntryCue";
import { useIslandBottle } from "../composables/useIslandBottle";
import { APP_ROUTE_NAME } from "../router/routes.js";
import {
  KNOWLEDGE_ISLAND_STAGES,
  getKnowledgeIslandStageIndexById
} from "../utils/knowledgeIslandGrowth.js";
import { KNOWLEDGE_ISLAND_PROSPERITY_TIERS } from "../utils/knowledgeIslandProsperity.js";

const props = defineProps({
  island: {
    type: Object,
    required: true
  }
});

const router = useRouter();
const audioStore = useAudioStore();
const { playPageEntryCue } = usePageEntryCue();
// 漂流瓶：每天一只。日期与存储在这一层，组件只收 prop、抛事件。
const { bottleAvailable, bottleLine, openBottle } = useIslandBottle();

// 拆开瓶子的瞬间不能立刻收走瓶子：prop 一变，组件的 watch 会把刚弹出的
// 字条气泡一起清掉。所以先让气泡说完话（约 2.4 秒），再记下「今天拆过了」。
let bottleConsumeTimer = 0;

function handleBottleOpen() {
  if (typeof window === "undefined" || bottleConsumeTimer) {
    return;
  }

  bottleConsumeTimer = window.setTimeout(() => {
    bottleConsumeTimer = 0;
    openBottle();
  }, 2600);
}

const { masterVolume, musicEnabled, sfxEnabled } = storeToRefs(audioStore);

// 把全站声音状态原样递给 islandAmbience / islandSoundscape，由它们决定这一页该响还是该安静。
// 全局状态的变化由 useTriviaApp 里那条声音状态 watcher 统一送达（它同时也监听
// audioReady，异步解锁完成的那个瞬间不会被漏掉）。挂载时这里再同步一次，
// 是为了接住"进入这一页但全局状态自那以后没有变化过"的初始时刻。
function currentAmbiencePreferences() {
  return {
    masterVolume: masterVolume.value,
    musicEnabled: musicEnabled.value,
    sfxEnabled: sfxEnabled.value
  };
}

// 阶段与繁荣度：声景的"配方"输入。阶段顺序仍然只有 knowledgeIslandGrowth 一个来源。
const currentStageId = computed(() => String(props.island?.currentStage?.id || ""));
const currentProsperityLevel = computed(() => Number(props.island?.prosperityLevel) || 0);

// 把「现在岛上该听到什么」同步给两层声音：
//   - islandSoundscape 按阶段加风 / 船铃 / 雾号；
//   - islandAmbience 的鸥鸣间隔按繁荣度收紧（系数来自同一份声景配置）。
function syncSceneToAudio() {
  const scene = resolveIslandSoundscape(currentStageId.value, currentProsperityLevel.value);

  syncIslandSoundscapeScene({
    stageId: currentStageId.value,
    prosperityLevel: currentProsperityLevel.value
  });
  syncIslandAmbienceScene({ gullDelayFactor: scene.gullDelayFactor });
}

onMounted(() => {
  // 持续背景音乐只属于这一页：进入时交给知识岛，离开时彻底收走。
  // 这一步本身不改用户的任何偏好；真正起不起播还要看引擎解没解锁、音量够不够。
  suspendBackgroundMusic();
  // 进来的第一件事只是"按全局状态恢复"，不会绕过交互闸门自己出声。
  syncIslandAmbiencePreferences(currentAmbiencePreferences());
  startIslandAmbience();
  // 阶段化声景：风 / 船铃 / 雾号。同样只在全局允许且已解锁时才会真的响。
  syncSceneToAudio();
  syncIslandSoundscapePreferences(currentAmbiencePreferences());
  startIslandSoundscape();
});

// 全局声音状态的变化（右上角静音按钮、设置页里的开关与音量、音频被解锁）
// 由 useTriviaApp 的声音状态 watcher 统一送达环境声，这一页不再自己监听一遍：
// 同一份状态接两个 watch，容易在改动时只改一处、漏掉另一处。

// 阶段 / 繁荣度一变（领完印章回到这一页、星星涨了），声景立刻换成新配方。
watch(
  () => [currentStageId.value, currentProsperityLevel.value],
  () => {
    syncSceneToAudio();
  }
);

onBeforeUnmount(() => {
  // 离开这一页就把海浪与海鸥彻底停掉（定时器也一并清干净）。
  stopIslandAmbience();
  // 声景同样收干净：风平掉、铃与雾号的调度全部清掉。
  stopIslandSoundscape();
  // 再把持续背景音乐收走：普通页面本来就不放持续音乐，所以这一句之后
  // 整个站点都是安静的。顺序很重要 —— 先静音这一页，再退场。
  resumeBackgroundMusic();
});

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

// ---------------------------------------------------------------------------
// 成长路线图：把 KNOWLEDGE_ISLAND_STAGES 的六个阶段整列摆出来。
// 未解锁的显示剪影 + 锁，点一下告诉孩子还差几枚 —— 期待感是长期留存的核心。
// 这一列只读阶段常量与已经算好的 stampCount，不做任何第二份阈值判定。
// ---------------------------------------------------------------------------
const stageRoadmap = computed(() => {
  const stamps = stampCount.value;
  const currentIndex = Math.max(0, getKnowledgeIslandStageIndexById(props.island?.currentStage?.id));

  return KNOWLEDGE_ISLAND_STAGES.map((stage, index) => ({
    id: stage.id,
    name: stage.name,
    glyph: stage.glyph,
    threshold: stage.threshold,
    reached: stamps >= stage.threshold,
    isCurrent: index === currentIndex,
    remaining: Math.max(0, stage.threshold - stamps)
  }));
});

const roadmapMessage = ref("");
let roadmapMessageTimer = 0;

function showStageNote(stage) {
  playAudioCue("toggle");

  if (stage.isCurrent) {
    roadmapMessage.value = `「${stage.name}」就是小岛现在的样子`;
  } else if (stage.reached) {
    roadmapMessage.value = `「${stage.name}」已经解锁啦`;
  } else {
    roadmapMessage.value = `再集 ${stage.remaining} 枚印章，就能解锁「${stage.name}」`;
  }

  if (typeof window === "undefined") {
    return;
  }

  if (roadmapMessageTimer) {
    window.clearTimeout(roadmapMessageTimer);
  }

  roadmapMessageTimer = window.setTimeout(() => {
    roadmapMessage.value = "";
    roadmapMessageTimer = 0;
  }, 3200);
}

onBeforeUnmount(() => {
  if (roadmapMessageTimer) {
    window.clearTimeout(roadmapMessageTimer);
    roadmapMessageTimer = 0;
  }

  if (bottleConsumeTimer) {
    window.clearTimeout(bottleConsumeTimer);
    bottleConsumeTimer = 0;
  }
});

// 繁荣度档位的星数范围：「0–20 星」「21–62 星」「63+ 星」，阈值直接读常量，不在这里重写。
function tierRangeText(tier) {
  if (tier.maxStars === null || tier.maxStars === undefined) {
    return `${tier.minStars}+ 星`;
  }

  return `${tier.minStars}–${tier.maxStars} 星`;
}

function goHome() {
  // 「返回首页」也是一次页面导航，响一声再走。
  // 知识岛自己的 BGM 与环境声由下面 onBeforeUnmount 收掉，与这一声互不影响。
  void playPageEntryCue();

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
        <button class="island-page__back" type="button" @click="goHome">返回首页</button>
      </div>
    </header>

    <!-- 主体：同一座岛，只是不再被压缩在收藏册的小模块里。
         漂流瓶由这一页的 useIslandBottle 提供：每天一只，拆开就收走。 -->
    <KnowledgeIslandGrowth
      :island="island"
      size="hero"
      :bottle="bottleAvailable"
      :bottle-line="bottleLine"
      @bottle-open="handleBottleOpen"
    />

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
         页面只负责把「已经走到哪一档」画出来，不在这里重新判定星数。
         每档补上星数范围，下面再跟一句本档进度，孩子看得见「下一档还有多远」。 -->
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
        <span class="island-page__tier-range">{{ tierRangeText(tier) }}</span>
      </span>
    </div>

    <p class="island-page__tier-progress" data-role="island-page-tier-progress">
      {{ island.prosperity.nextText }}
      <template v-if="island.prosperity.hasNextTier">
        （这一档已经走了 {{ island.prosperity.progressValue }} / {{ island.prosperity.progressTarget }} 颗）
      </template>
    </p>

    <!-- 成长路线图：六个阶段整列摆出来，未解锁的是剪影 + 锁。
         点任何一格都会告诉孩子这一格差几枚（或已经解锁）。 -->
    <section class="island-page__roadmap" aria-label="小岛成长路线">
      <h2 class="island-page__roadmap-title">小岛成长路线</h2>
      <ol class="island-page__roadmap-list">
        <li v-for="stage in stageRoadmap" :key="stage.id" class="island-page__roadmap-item">
          <button
            type="button"
            :class="[
              'island-page__roadmap-stage',
              {
                'island-page__roadmap-stage--reached': stage.reached,
                'island-page__roadmap-stage--current': stage.isCurrent
              }
            ]"
            :data-role="`island-page-roadmap-${stage.id}`"
            :aria-label="
              stage.reached
                ? `${stage.name}，${stage.threshold} 枚印章，已解锁`
                : `${stage.name}，需要 ${stage.threshold} 枚印章，还差 ${stage.remaining} 枚`
            "
            @click="showStageNote(stage)"
          >
            <span class="island-page__roadmap-glyph" aria-hidden="true">
              {{ stage.reached ? stage.glyph : "🔒" }}
            </span>
            <span class="island-page__roadmap-name">{{ stage.name }}</span>
            <span class="island-page__roadmap-threshold">
              {{ stage.reached ? `${stage.threshold} 枚` : `还差 ${stage.remaining} 枚` }}
            </span>
          </button>
        </li>
      </ol>
      <p
        v-if="roadmapMessage"
        class="island-page__roadmap-message"
        data-role="island-page-roadmap-message"
        role="status"
        aria-live="polite"
      >
        {{ roadmapMessage }}
      </p>
    </section>
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
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 12px;
  border: 1.5px dashed rgba(36, 50, 74, 0.16);
  border-radius: 999px;
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 800;
  opacity: 0.55;
}

.island-page__tier-range {
  font-size: 0.72rem;
  font-weight: 700;
  opacity: 0.85;
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

.island-page__tier-progress {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.84rem;
  font-weight: 800;
  line-height: 1.5;
}

/* ===========================================================================
   成长路线图
   ---------------------------------------------------------------------------
   六个阶段整列摆出：已解锁的显示阶段图标，未解锁的是锁 + 剪影灰。
   当前阶段描一圈边，点任何一格都会给出「还差几枚」的回话。
   =========================================================================== */
.island-page__roadmap {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border: 1.5px solid rgba(36, 50, 74, 0.1);
  border-radius: 20px;
  background: linear-gradient(160deg, #ffffff 0%, #f7fbfe 100%);
  box-shadow: 0 18px 30px -32px rgba(36, 50, 74, 0.4);
}

.island-page__roadmap-title {
  margin: 0;
  color: var(--color-ink);
  font-family: "ZCOOL KuaiLe", "Baloo 2", "Trebuchet MS", sans-serif;
  font-size: 1.05rem;
  line-height: 1.3;
}

.island-page__roadmap-list {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.island-page__roadmap-item {
  min-width: 0;
}

.island-page__roadmap-stage {
  display: grid;
  justify-items: center;
  gap: 4px;
  width: 100%;
  min-height: 96px;
  padding: 10px 6px;
  border: 1.5px solid rgba(36, 50, 74, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--color-ink-soft);
  font: inherit;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.island-page__roadmap-stage:hover,
.island-page__roadmap-stage:focus-visible {
  border-color: rgba(124, 216, 184, 0.5);
  background: rgba(247, 252, 249, 0.98);
  box-shadow: 0 12px 20px -20px rgba(36, 50, 74, 0.42);
  outline: none;
  transform: translateY(-1px);
}

.island-page__roadmap-glyph {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: rgba(238, 244, 248, 0.9);
  font-size: 1.25rem;
  line-height: 1;
  /* 未解锁的格子：图标位置换成锁，整体压灰一点，像剪影。 */
  filter: grayscale(0.9);
  opacity: 0.66;
}

.island-page__roadmap-stage--reached .island-page__roadmap-glyph {
  background: rgba(238, 250, 246, 0.95);
  filter: none;
  opacity: 1;
}

.island-page__roadmap-name {
  color: var(--color-ink);
  font-size: 0.78rem;
  font-weight: 900;
  line-height: 1.3;
  text-align: center;
}

.island-page__roadmap-stage:not(.island-page__roadmap-stage--reached) .island-page__roadmap-name {
  color: var(--color-ink-soft);
}

.island-page__roadmap-threshold {
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 1.2;
  opacity: 0.85;
}

/* 当前阶段：一圈清楚的描边 + 微微发光，一眼认出「小岛现在在这里」。 */
.island-page__roadmap-stage--current {
  border-color: rgba(72, 154, 148, 0.55);
  background: rgba(238, 250, 246, 0.9);
  box-shadow: 0 0 0 3px rgba(124, 216, 184, 0.25);
}

.island-page__roadmap-message {
  margin: 0;
  color: #1f6b51;
  font-size: 0.86rem;
  font-weight: 900;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .island-page__roadmap-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .island-page__roadmap-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .island-page__roadmap-stage {
    transition: none;
  }

  .island-page__roadmap-stage:hover,
  .island-page__roadmap-stage:focus-visible {
    transform: none;
  }
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

  /* 窄屏顶部摘要改成左对齐一列，「返回首页」仍占满一行方便点，
     并保持 42px 的可点高度。 */
  .island-page__hero-side {
    justify-content: flex-start;
    width: 100%;
  }

  .island-page__back {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .island-page__back {
    transition: none;
  }

  .island-page__back:hover,
  .island-page__back:focus-visible {
    transform: none;
  }
}
</style>
