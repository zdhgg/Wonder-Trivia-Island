import assert from "node:assert/strict";
import test from "node:test";

import {
  HOME_WELCOME_CACHE_KEY,
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

test("front-end home welcome copy respects the requested time band", () => {
  const cases = [
    {
      date: new Date(2026, 4, 4, 8, 0, 0),
      eyebrow: "早上好",
      lineTokens: ["早上", "早晨"],
      speechTokens: ["早上", "早晨"],
      titleTokens: ["早晨"]
    },
    {
      date: new Date(2026, 4, 4, 12, 0, 0),
      eyebrow: "中午好",
      lineTokens: ["中午"],
      speechTokens: ["中午"],
      titleTokens: ["中午"]
    },
    {
      date: new Date(2026, 4, 4, 16, 0, 0),
      eyebrow: "下午好",
      lineTokens: ["下午"],
      speechTokens: ["下午"],
      titleTokens: ["下午"]
    },
    {
      date: new Date(2026, 4, 4, 18, 30, 0),
      eyebrow: "傍晚了",
      lineTokens: ["傍晚"],
      speechTokens: ["傍晚"],
      titleTokens: ["傍晚"]
    },
    {
      date: new Date(2026, 4, 4, 21, 0, 0),
      eyebrow: "晚上好",
      lineTokens: ["晚上"],
      speechTokens: ["晚上"],
      titleTokens: ["晚上"]
    },
    {
      date: new Date(2026, 4, 4, 23, 30, 0),
      eyebrow: "夜深了",
      lineTokens: ["深夜", "夜深"],
      speechTokens: ["深夜", "夜深"],
      titleTokens: ["夜深"]
    }
  ];

  for (const entry of cases) {
    const summary = buildHomeWelcomeFallbackLine({}, entry.date);
    const speech = buildHomeWelcomeFallbackSpeechText({}, entry.date);
    const title = buildHomeWelcomeTitle({}, { avoidText: summary, date: entry.date });

    assert.equal(buildHomeWelcomeEyebrow({}, entry.date), entry.eyebrow);
    assertIncludesOneOf(summary, entry.lineTokens, `summary should match ${entry.eyebrow}`);
    assertIncludesOneOf(speech, entry.speechTokens, `speech should match ${entry.eyebrow}`);
    assertIncludesOneOf(title, entry.titleTokens, `title should match ${entry.eyebrow}`);
  }
});

test("front-end home welcome copy keeps a warm tone regardless of quiz progress", () => {
  const date = new Date(2026, 4, 4, 21, 0, 0);
  const cases = [
    {
      context: { displayName: "小心心", reviewDueCount: 3 },
      lineTokens: ["晚上", "慢慢来"],
      speechTokens: ["晚上", "慢慢来"]
    },
    {
      context: { displayName: "小心心", reviewingCount: 4 },
      lineTokens: ["晚上", "慢慢来"],
      speechTokens: ["晚上", "慢慢来"]
    },
    {
      context: { displayName: "小心心", challengeStageLabel: "第7关·启蒙冲线" },
      lineTokens: ["晚上", "慢慢来"],
      speechTokens: ["晚上", "慢慢来"]
    }
  ];

  for (const entry of cases) {
    const summary = buildHomeWelcomeFallbackLine(entry.context, date);
    const speech = buildHomeWelcomeFallbackSpeechText(entry.context, date);

    assertIncludesOneOf(summary, entry.lineTokens, `summary should stay warm regardless of progress\nreceived: ${summary}`);
    assertIncludesOneOf(speech, entry.speechTokens, `speech should stay warm regardless of progress\nreceived: ${speech}`);
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
