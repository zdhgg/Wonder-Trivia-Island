import { computed } from "vue";
import { storeToRefs } from "pinia";
import { playAudioCue, unlockAudioEngine } from "../audio/audioEngine";
import { useAudioStore } from "../stores/useAudioStore";

// 「点这个按钮会把你带到另一个页面」时的那一声轻短音效。
//
// 它单独成为一个 composable，而不是塞进 useTriviaApp 里，是因为三个地方都要用：
//   - App.vue            —— 大地图的岛卡、闯关地图的关卡、学习地图的课程、顶栏导航…
//   - PracticeHomeView   —— 首页的各个入口
//   - KnowledgeIslandView—— 知识岛的「返回首页」
// 放在这里，三处共用同一份判断，不会各自写一遍"现在该不该响"，
// 也就不会出现"某一页静音了、另一页没静音"这种自相矛盾。
//
// 它只做三件事，顺序不能换：
//   1) 该不该响：看音效通道本身有没有可听音量；
//   2) 第一次点：在这次真实的 click 回调里完成解锁（浏览器只认手势）；
//   3) 解锁成功：响一声。
//
// 关于复用哪个音效：用的是既有的 toggle 素材（sfx-toggle.wav，音量系数 0.78），
// 它本来就是给"点一下"设计的最短音效。刻意不复用 success / finish ——
// 那是"答对了 / 结算了"的语义，用在导航上会让孩子误以为答对。
//
// 不做什么（这些是刻意的）：
//   - 不碰持续 BGM、也不碰知识岛环境声：这一声和它们是三条独立的路；
//   - 不加全局 document 事件监听：只有明确调用的入口才响，不是"点哪儿都响"；
//   - 静音时不改音量、不打开任何通道开关、不偷偷解锁 ——
//     孩子点了没声音，那一定是因为他自己关了声音。
export function usePageEntryCue() {
  const audioStore = useAudioStore();
  const { isSupported, masterVolume, sfxEnabled, sfxVolume } = storeToRefs(audioStore);

  // 只需要问"音效这一路有没有声音"。
  //
  // 刻意不复用 useTriviaApp 里那个 isAudioMuted：它回答的是"全站静不静音"
  // （两个通道都关才算），而这里只关心音效这一路 —— 音乐关掉、只留提示音时，
  // 点入口本来就该有那一声。两者问的不是同一件事，各算各的才不会互相将就。
  const isClickCueAudible = computed(
    () => masterVolume.value > 0 && sfxEnabled.value && sfxVolume.value > 0
  );

  /**
   * 响一次入口音效。返回是否真的响了。
   *
   * 静音时直接返回 false —— 这一步同时挡住了"静音状态下还去解锁引擎"：
   * 用户既然关着声音，就不该因为点了一下按钮而把引擎悄悄解锁。
   */
  async function playPageEntryCue() {
    if (!isSupported.value || !isClickCueAudible.value) {
      return false;
    }

    // 必须在这一次 click 的调用栈里发起，浏览器才认这次手势。
    // unlockAudioEngine() 内部是同步建 AudioContext、同步发起 resume() 的，
    // 所以尽管这里 await 了它，解锁本身仍然发生在手势之内。
    const isReady = await unlockAudioEngine();

    if (!isReady) {
      return false;
    }

    // 引擎解锁之后把这个状态同步给 store：
    // 知识岛那一页靠它决定环境声能不能开始（见 KnowledgeIslandView 的 watch）。
    audioStore.setAudioReady(true);

    return playAudioCue("toggle");
  }

  return { isClickCueAudible, playPageEntryCue };
}
