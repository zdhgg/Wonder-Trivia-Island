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
import { computed, ref } from "vue";

const STORAGE_KEY = "wti:island-bottle:v1";

// 字条池：对孩子说的短句，鼓励为主、带一点海洋气息。
// 改文案时注意：它们会出现在回话气泡里，保持一两句话的长度。
const BOTTLE_LINES = Object.freeze([
  "今天的你比昨天又多懂了一点点，继续加油！",
  "海浪把瓶子送来，也把好心情送给你～",
  "答对一道题，就是往岛上搬了一块小石头。",
  "瓶子里的字条写着：坚持最酷啦！",
  "小鱼悄悄说：每天来一点点，小岛就会长大哦。",
  "风把这句话吹进了瓶子：你认真答题的样子真棒！",
  "捡到一个秘密：好奇心是最厉害的船帆。",
  "字条上画着一颗星星，旁边写着：去把它摘下来吧！"
]);

// 本地日期（YYYY-MM-DD）：以孩子这边的日历为准，不用 UTC。
function todayKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 同一天固定同一句：把日期串折成一个稳定的下标。
function pickLine(dateKey) {
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
  // 已经拆过的日期；与今天不同 → 今天这只还没拆。
  const openedOn = ref(readStoredDateKey());

  const bottleAvailable = computed(() => openedOn.value !== todayKey());
  const bottleLine = computed(() => pickLine(todayKey()));

  function openBottle() {
    openedOn.value = todayKey();
    writeStoredDateKey(openedOn.value);
  }

  return {
    bottleAvailable,
    bottleLine,
    openBottle
  };
}
