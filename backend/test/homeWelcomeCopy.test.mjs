import assert from "node:assert/strict";
import test from "node:test";

import {
  HOME_WELCOME_MAX_LINE_LENGTH,
  HOME_WELCOME_MAX_SPEECH_LENGTH,
  buildHomeWelcomeEyebrow,
  buildHomeWelcomeFallbackLine,
  buildHomeWelcomeFallbackSpeechText,
  buildHomeWelcomeTitle
} from "../../frontend/src/utils/homeWelcomeMessage.js";

function assertIncludesOneOf(text, tokens, message) {
  assert.ok(tokens.some((token) => text.includes(token)), `${message}\nreceived: ${text}`);
}

test("front-end home welcome layers keep time in the eyebrow and speech only", () => {
  const cases = [
    {
      date: new Date(2026, 4, 4, 8, 0, 0),
      eyebrow: "早上好",
      timeTokens: ["早上", "早晨"]
    },
    {
      date: new Date(2026, 4, 4, 12, 0, 0),
      eyebrow: "中午好",
      timeTokens: ["中午"]
    },
    {
      date: new Date(2026, 4, 4, 16, 0, 0),
      eyebrow: "下午好",
      timeTokens: ["下午"]
    },
    {
      date: new Date(2026, 4, 4, 18, 30, 0),
      eyebrow: "傍晚了",
      timeTokens: ["傍晚"]
    },
    {
      date: new Date(2026, 4, 4, 21, 0, 0),
      eyebrow: "晚上好",
      timeTokens: ["晚上"]
    },
    {
      date: new Date(2026, 4, 4, 23, 30, 0),
      eyebrow: "夜深了",
      timeTokens: ["深夜", "夜深"]
    }
  ];

  for (const entry of cases) {
    const summary = buildHomeWelcomeFallbackLine({}, entry.date);
    const speech = buildHomeWelcomeFallbackSpeechText({}, entry.date);
    const title = buildHomeWelcomeTitle({}, { avoidText: summary, date: entry.date });

    assert.equal(buildHomeWelcomeEyebrow({}, entry.date), entry.eyebrow);
    assert.equal(entry.timeTokens.some((token) => summary.includes(token)), false, `summary should not repeat ${entry.eyebrow}`);
    assert.equal(entry.timeTokens.some((token) => title.includes(token)), false, `title should not repeat ${entry.eyebrow}`);
    assertIncludesOneOf(speech, entry.timeTokens, `speech should include ${entry.eyebrow}`);
    assert.ok(summary.length <= HOME_WELCOME_MAX_LINE_LENGTH);
    assert.ok(speech.length <= HOME_WELCOME_MAX_SPEECH_LENGTH);
  }
});

test("front-end home welcome title stays deterministic across dynamic copy refreshes", () => {
  const date = new Date(2026, 4, 4, 16, 0, 0);

  assert.equal(
    buildHomeWelcomeTitle(
      { isFirstHomeVisitToday: true },
      { displayName: "小心心", useCustomName: true, date }
    ),
    "小心心，欢迎回来"
  );
  assert.equal(
    buildHomeWelcomeTitle({ isFirstHomeVisitToday: true }, { date }),
    "今天想去哪座岛看看？"
  );
  assert.equal(
    buildHomeWelcomeTitle(
      { isProfileJustSaved: true },
      { displayName: "小心心", useCustomName: true, date }
    ),
    "新路线准备好了"
  );
});

test("front-end home welcome copy turns progress into a low-pressure next step", () => {
  const date = new Date(2026, 4, 4, 21, 0, 0);
  const cases = [
    {
      context: { displayName: "小心心", reviewDueCount: 3 },
      summaryTokens: ["有 3 道小题", "先去探索"]
    },
    {
      context: { displayName: "小心心", reviewingCount: 4 },
      summaryTokens: ["温习的 4 道小题", "先去探索"]
    },
    {
      context: { displayName: "小心心", challengeStageLabel: "第7关·启蒙冲线" },
      summaryTokens: ["第7关·启蒙冲线", "换条路线"]
    }
  ];

  for (const entry of cases) {
    const summary = buildHomeWelcomeFallbackLine(entry.context, date);
    const speech = buildHomeWelcomeFallbackSpeechText(entry.context, date);

    for (const token of entry.summaryTokens) {
      assert.ok(summary.includes(token), `summary should include ${token}\nreceived: ${summary}`);
    }

    assert.ok(speech.includes("晚上"), `speech should keep one natural greeting\nreceived: ${speech}`);
    assert.equal(["慢慢来", "轻轻来", "不着急", "安心啦"].some((token) => summary.includes(token)), false);
  }
});
