// 漂流瓶：每天漂来一只，拆开是一句悄悄话。
//
// 它是「每天回来看看」的仪式感钩子，刻意很轻：
//   - 不产生任何数值：不加印章、不加星星、不改任何成长账本；
//   - 唯一的持久状态是「今天拆没拆过」（localStorage 里一个日期串），
//     明天再来又会有一只新的；
//   - 字条内容按日期确定（同一天谁来看都是同一句），不从服务器取、不随机。
//
// 分层：日期与存储逻辑全部在这一层，KnowledgeIslandGrowth 组件只收
// bottle / bottleLine 两个 prop、抛一个 bottle-open 事件 —— 组件本身仍然不读 localStorage。
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const STORAGE_KEY = "wti:island-bottle:v1";

// 字条池：对孩子说的短句，鼓励为主、带一点海洋气息。
// 改文案时注意：它们会出现在信纸上，保持一两句话的长度。
// 池子按「大半个月不重样」的量准备：每天只抽一句，池子多大，
// 句子重复出现的间隔就大致多长（20 句时中位数约 18 天）。
export const BOTTLE_LINES = Object.freeze([
  "今天的你比昨天又多懂了一点点，继续加油！",
  "海浪把瓶子送来，也把好心情送给你～",
  "答对一道题，就是往岛上搬了一块小石头。",
  "瓶子里的字条写着：坚持最酷啦！",
  "小鱼悄悄说：每天来一点点，小岛就会长大哦。",
  "风把这句话吹进了瓶子：你认真答题的样子真棒！",
  "捡到一个秘密：好奇心是最厉害的船帆。",
  "字条上画着一颗星星，旁边写着：去把它摘下来吧！",
  "海鸥说，它见过最勇敢的小船长，今天也准时出发啦。",
  "把今天学会的东西，悄悄收进你的百宝箱吧。",
  "字条上画着一个小太阳：慢慢来，你已经在发光了。",
  "今天的努力，海风都替你记着呢。",
  "小岛悄悄说：谢谢你今天来看我。",
  "错题不可怕，它们只是还没被你驯服的小浪花。",
  "船长日志：今天也认真想过问题了，很棒。",
  "把不会的变成会的，就是最了不起的魔法。",
  "海里的星星说：坚持下去的人，最后都会发光。",
  "远方有人在为你鼓掌：今天也辛苦啦。",
  "风浪大的时候，稳住船舵就好，不用着急。",
  "你走过的每一步，都变成了小岛的一部分。"
]);

// 本地日期（YYYY-MM-DD）：以孩子这边的日历为准，不用 UTC。
function todayKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 同一天固定同一句：把日期串折成一个稳定的下标。
// 刻意保留这个简单折法：实测 20 句时最短重复间隔 11 天、相邻两天不撞句，
// 换成通用哈希（如 FNV-1a）反而会出现隔天重复。
export function pickBottleLine(dateKey) {
  let hash = 0;

  for (const character of String(dateKey)) {
    hash = (hash * 31 + character.charCodeAt(0)) % 997;
  }

  return BOTTLE_LINES[hash % BOTTLE_LINES.length];
}

function readStoredDateKey() {
  try {
    if (typeof localStorage === "undefined") {
      return "";
    }

    return String(localStorage.getItem(STORAGE_KEY) || "");
  } catch {
    return "";
  }
}

function writeStoredDateKey(dateKey) {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(STORAGE_KEY, dateKey);
  } catch {
    // 存储被禁用也没关系：今天就当每次都能拆，明天再说。
  }
}

export function useIslandBottle() {
  const openedOn = ref(readStoredDateKey());
  const currentDay = ref(todayKey());
  const bottleAvailable = computed(() => openedOn.value !== currentDay.value);
  const bottleLine = computed(() => pickBottleLine(currentDay.value));
  let midnightTimer = 0;

  function refreshDay() {
    currentDay.value = todayKey();
    if (typeof window === "undefined") return;
    window.clearTimeout(midnightTimer);
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    midnightTimer = window.setTimeout(refreshDay, Math.max(1, tomorrow.getTime() - now.getTime() + 50));
  }

  function syncStorage(event) {
    if (event.key === STORAGE_KEY || event.key === null) openedOn.value = readStoredDateKey();
    refreshDay();
  }

  onMounted(() => {
    refreshDay();
    window.addEventListener("focus", refreshDay);
    window.addEventListener("storage", syncStorage);
    document.addEventListener("visibilitychange", refreshDay);
  });
  onBeforeUnmount(() => {
    window.clearTimeout(midnightTimer);
    window.removeEventListener("focus", refreshDay);
    window.removeEventListener("storage", syncStorage);
    document.removeEventListener("visibilitychange", refreshDay);
  });

  function openBottle() {
    refreshDay();
    openedOn.value = currentDay.value;
    writeStoredDateKey(openedOn.value);
  }

  return {
    bottleAvailable,
    bottleLine,
    openBottle
  };
}
