// Tone.js BGM 的音乐数据（只被 toneBgm.js 使用）。
//
// 这里是纯数据，不含任何 Tone / WebAudio 调用，所以单测可以直接断言它。
//
// 节奏：135 BPM（要求 7：132–138）。四四拍，一拍 = 1 小节 / 4 拍。
// 135 BPM 比原来那版 24 秒素材（约 120 BPM 等效）略快，但没有任何鼓点，
// 推进感来自 pluck 与 bell 的疏密变化，而不是打击乐 —— 所以是"轻快"而不是"催促"。
//
// 循环：7 段共 28 小节，Transport.loop 直接首尾相接，没有文件边界也没有接缝。
//
// 音色分工：
//   pad   —— 每小节一个长和弦，底色，音量最低
//   bass  —— soft mallet，每小节 1-2 个短音；**不是**每拍一击
//   pluck —— 明亮短音，主要的"清脆"来源，每小节数量随段落变化
//   lead  —— 旋律，最轻但最清楚
//   bell  —— 高八度稀疏点缀，每两小节一个，负责空气感
//
// 每个 section 的 gain 构成一条慢速起伏的弧线（轻 → 亮 → 暖 → 开阔 → 柔 →
// 有力 → 收），这既是听感上的"呼吸"，也让 28 小节不会听成同一句型。

export const BGM_TEMPO_BPM = 135;

export const BGM_RHYTHM = Object.freeze({
  beatsPerBar: 4,
  // 一拍的时长（四分音符），Tone 的 "1i" = 1 quarter。
  quarterNote: 1
});

/**
 * 7 个段落。每段 4 小节，共 28 小节。
 * chords  : 每小节依次用的和弦（音名数组，按小节循环）
 * bass    : 每小节的软 mallet 音，位置由数组下标 × 0.5 拍决定
 * pluck   : 每小节的短音，位置由 pluckTiming 决定
 * lead    : 每小节的旋律音，位置由 leadTiming 决定
 * bell    : 每两小节一个高八度点缀
 * gain    : 这一段的整体力度
 * padLength: 和弦床长度（小节数），变化让段落轮廓不同
 */
export const BGM_SECTIONS = Object.freeze([
  // 1. C 大调，安静开场：pluck 最少，只有 pad + 很少的 lead。
  {
    id: "dawn",
    label: "开场",
    bars: 4,
    gain: 0.62,
    padLength: 0.9,
    chords: [
      ["C4", "E4", "G4"],
      ["A3", "C4", "E4"],
      ["F3", "A3", "C4"],
      ["G3", "B3", "D4"]
    ],
    bass: ["C3"],
    pluck: ["C5", "E5", "G5"],
    pluckTiming: [0.5, 1.5, 2.5],
    lead: ["E5", "G5"],
    leadTiming: [1, 3],
    leadLengths: [1.5, 1],
    bell: ["C6", "E6"]
  },
  // 2. F 大调，最明亮：pluck 变密，lead 上到高音区。
  {
    id: "sparkle",
    label: "明亮",
    bars: 4,
    gain: 1.0,
    padLength: 1,
    chords: [
      ["F3", "A3", "C4"],
      ["C4", "E4", "G4"],
      ["D4", "F4", "A4"],
      ["G3", "B3", "D4"]
    ],
    bass: ["F2", "C3"],
    pluck: ["C5", "F5", "A5", "G5", "E5"],
    pluckTiming: [0.5, 1, 2, 2.5, 3.5],
    lead: ["A5", "C6", "G5"],
    leadTiming: [1, 2, 3],
    leadLengths: [0.5, 0.5, 1],
    bell: ["F6", "A5"]
  },
  // 3. D 小调，温暖：回到低一些的中音区，pluck 变稀。
  {
    id: "warm",
    label: "温暖",
    bars: 4,
    gain: 0.78,
    padLength: 1.1,
    chords: [
      ["D4", "F4", "A4"],
      ["A3", "C4", "E4"],
      ["B3", "D4", "F4"],
      ["G3", "B3", "D4"]
    ],
    bass: ["D3", "A2"],
    pluck: ["F5", "A4", "D5"],
    pluckTiming: [0.5, 2, 3.5],
    lead: ["D5", "F5", "C5"],
    leadTiming: [0.5, 2, 3],
    leadLengths: [1, 0.5, 1],
    bell: ["A5", "F5"]
  },
  // 4. G 大调，最开阔：pad 最长，lead 高，bell 更多。
  {
    id: "open",
    label: "开阔",
    bars: 4,
    gain: 0.7,
    padLength: 1.3,
    chords: [
      ["G3", "B3", "D4"],
      ["D4", "F4", "A4"],
      ["E3", "G3", "B3"],
      ["C4", "E4", "G4"]
    ],
    bass: ["G2"],
    pluck: ["D5", "B5", "G5"],
    pluckTiming: [1, 2.5, 3.5],
    lead: ["B5", "D6", "G5"],
    leadTiming: [0.5, 2, 3.5],
    leadLengths: [0.5, 0.5, 1.5],
    bell: ["G6", "D6", "B5"]
  },
  // 5. C 大调，柔落：回到最轻的一段，为下一轮蓄力。
  {
    id: "settle",
    label: "柔和",
    bars: 4,
    gain: 0.66,
    padLength: 1,
    chords: [
      ["C4", "E4", "G4"],
      ["F3", "A3", "C4"],
      ["D4", "F4", "A4"],
      ["G3", "B3", "D4"]
    ],
    bass: ["C3", "F2"],
    pluck: ["E5", "C5", "G5"],
    pluckTiming: [1, 2, 3],
    lead: ["G5", "E5", "C5"],
    leadTiming: [0.5, 2, 3.5],
    leadLengths: [1, 1, 1.5],
    bell: ["C6", "G5"]
  },
  // 6. A 小调，最有推进：pluck 密度最高，但依然没有鼓点。
  {
    id: "forward",
    label: "推进",
    bars: 4,
    gain: 0.95,
    padLength: 0.95,
    chords: [
      ["A3", "C4", "E4"],
      ["F3", "A3", "C4"],
      ["C4", "E4", "G4"],
      ["G3", "B3", "D4"]
    ],
    bass: ["A2", "F2"],
    pluck: ["A4", "C5", "E5", "D5", "C5", "E5"],
    pluckTiming: [0.5, 1, 1.5, 2.5, 3, 3.5],
    lead: ["E5", "A5", "C6", "D6"],
    leadTiming: [0.5, 1.5, 2.5, 3.5],
    leadLengths: [0.5, 0.5, 0.5, 0.5],
    bell: ["A5", "E6", "C6"]
  },
  // 7. F→C 大调，收束：回到第 1 段的调性，让循环听起来是一个整体。
  {
    id: "home",
    label: "收束",
    bars: 4,
    gain: 0.74,
    padLength: 1.2,
    chords: [
      ["F3", "A3", "C4"],
      ["C4", "E4", "G4"],
      ["G3", "B3", "D4"],
      ["C4", "E4", "G4"]
    ],
    bass: ["F2", "C3"],
    pluck: ["A4", "C5", "E5", "G5"],
    pluckTiming: [0.5, 1.5, 2.5, 3.5],
    lead: ["C5", "E5", "G5", "E5"],
    leadTiming: [0.5, 1.5, 2.5, 3.5],
    leadLengths: [1, 0.5, 0.5, 1],
    bell: ["C6", "G5", "E6"]
  }
]);

/** 整个循环的小节数（7 × 4 = 28）。 */
export const BGM_TOTAL_BARS = BGM_SECTIONS.reduce((total, section) => total + section.bars, 0);

/** 整个循环的拍数，供 Transport.loopEnd 使用。 */
export const BGM_TOTAL_BEATS = BGM_TOTAL_BARS * BGM_RHYTHM.beatsPerBar;

/** 一个循环在 135 BPM 下大约多少秒（供文档与测试参考）。 */
export const BGM_LOOP_SECONDS = (BGM_TOTAL_BEATS / BGM_TEMPO_BPM) * 60;
