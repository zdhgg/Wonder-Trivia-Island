import assert from "node:assert/strict";
import test from "node:test";

import {
  HOME_WELCOME_CACHE_KEY,
  HOME_WELCOME_MAX_LINE_LENGTH,
  HOME_WELCOME_MAX_SPEECH_LENGTH,
  buildHomeWelcomeContextHash,
  buildHomeWelcomeTemporalContext,
  buildHomeWelcomeEyebrow,
  buildHomeWelcomeFallbackLine,
  buildHomeWelcomeFallbackSpeechText,
  buildHomeWelcomeTitle,
  readHomeWelcomeCache,
  writeHomeWelcomeCache
} from "../../frontend/src/utils/homeWelcomeMessage.js";

function assertIncludesOneOf(text, tokens, message) {
  assert.ok(tokens.some((token) => text.includes(token)), `${message}\nreceived: ${text}`);
}

async function withMockWindowStorage(run) {
  const storage = new Map();
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: {
      localStorage: {
        getItem(key) {
          return storage.has(key) ? storage.get(key) : null;
        },
        setItem(key, value) {
          storage.set(key, String(value));
        },
        removeItem(key) {
          storage.delete(key);
        },
        clear() {
          storage.clear();
        }
      }
    }
  });

  try {
    await run(storage);
  } finally {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete globalThis.window;
    }
  }
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

test("front-end home welcome cache does not reuse copy across time bands on the same day", async () => {
  await withMockWindowStorage(async (storage) => {
    const morningDate = new Date(2026, 4, 4, 8, 0, 0);
    const eveningDate = new Date(2026, 4, 4, 21, 0, 0);
    const baseContext = {
      displayName: "小心心",
      grade: "一年级",
      semester: "上册",
      recommendedMode: "challenge",
      reviewDueCount: 0,
      reviewingCount: 0,
      isProfileJustSaved: false,
      isFirstHomeVisitToday: false
    };
    const morningContext = { ...baseContext, ...buildHomeWelcomeTemporalContext(morningDate) };
    const eveningContext = { ...baseContext, ...buildHomeWelcomeTemporalContext(eveningDate) };

    const snapshot = writeHomeWelcomeCache(morningContext, "早上好，小心心。", {
      title: "早晨的小岛在等你",
      speechText: "早上好，小心心，早晨的小岛在等你。",
      source: "test",
      date: morningDate
    });

    assert.ok(snapshot);
    assert.equal(snapshot.contextHash, buildHomeWelcomeContextHash(morningContext));
    assert.equal(storage.has(HOME_WELCOME_CACHE_KEY), true);

    const morningCache = readHomeWelcomeCache(morningContext, morningDate);
    assert.ok(morningCache);
    assert.equal(morningCache.text, "早上好，小心心。");
    assert.equal(morningCache.contextHash, buildHomeWelcomeContextHash(morningContext));

    const eveningCache = readHomeWelcomeCache(eveningContext, eveningDate);
    assert.equal(eveningCache, null);
    assert.notEqual(buildHomeWelcomeContextHash(morningContext), buildHomeWelcomeContextHash(eveningContext));
  });
});

test("front-end home welcome cache does not reuse copy when stateful context changes on the same day", async () => {
  await withMockWindowStorage(async (storage) => {
    const date = new Date(2026, 4, 4, 21, 0, 0);
    const temporalContext = buildHomeWelcomeTemporalContext(date);
    const steadyContext = {
      displayName: "小心心",
      grade: "一年级",
      semester: "上册",
      recommendedMode: "challenge",
      challengeStageLabel: "第7关·启蒙冲线",
      reviewDueCount: 0,
      reviewingCount: 0,
      isProfileJustSaved: false,
      isFirstHomeVisitToday: false,
      ...temporalContext
    };
    const changedCases = [
      {
        label: "reviewDueCount",
        context: {
          ...steadyContext,
          recommendedMode: "review",
          reviewDueCount: 3
        }
      },
      {
        label: "reviewingCount",
        context: {
          ...steadyContext,
          recommendedMode: "review",
          challengeStageLabel: "",
          reviewingCount: 4
        }
      },
      {
        label: "challengeStageLabel",
        context: {
          ...steadyContext,
          challengeStageLabel: "第8关·乘风前行"
        }
      }
    ];

    const snapshot = writeHomeWelcomeCache(steadyContext, "晚上好，小心心。", {
      title: "晚上来啦，小心心",
      speechText: "晚上好，小心心，晚上的小岛在等你。",
      source: "test",
      date
    });

    assert.ok(snapshot);
    assert.equal(storage.has(HOME_WELCOME_CACHE_KEY), true);
    assert.equal(snapshot.contextHash, buildHomeWelcomeContextHash(steadyContext));

    const steadyCache = readHomeWelcomeCache(steadyContext, date);
    assert.ok(steadyCache);
    assert.equal(steadyCache.text, "晚上好，小心心。");

    for (const entry of changedCases) {
      const changedCache = readHomeWelcomeCache(entry.context, date);
      assert.equal(changedCache, null, `${entry.label} should invalidate the cache`);
      assert.notEqual(
        buildHomeWelcomeContextHash(steadyContext),
        buildHomeWelcomeContextHash(entry.context),
        `${entry.label} should change the cache context hash`
      );
    }
  });
});
