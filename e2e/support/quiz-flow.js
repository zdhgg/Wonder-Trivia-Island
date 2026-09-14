const { expect } = require("@playwright/test");

// 练习流程的共享测试辅助：只负责「读懂当前这道题」与「确定性地选择某个选项」。
// 说明：低年级（一、二年级）用的是气球选项，它的 aria-label 不带 A/B/C/D 标号，
// 所以这里不靠标号定位，而是按渲染顺序定位，并用接口数据做一次文本交叉校验。

const OPTION_KEYS = ["A", "B", "C", "D"];
const FEEDBACK_LABEL_SUFFIXES = ["回答正确", "正确答案", "本次选择", "正在核对"];

function isRandomQuestionsResponse(response) {
  return response.url().includes("/api/questions/random") && response.status() === 200;
}

// 收集题库接口返回的题目批次。
// 注意：useQuizSession 的 loadQuestions() 会 abort 上一次请求，被取消的请求读不到响应体
// （Playwright 会报 "No data found for resource"），所以这里主动忽略读取失败，
// 收集到的最后一批就是页面实际采用的那批（随后还会用选项文本交叉校验）。
function collectQuestionBatches(page) {
  const batches = [];

  function onResponse(response) {
    if (!isRandomQuestionsResponse(response)) {
      return;
    }

    response
      .text()
      .then((rawBody) => {
        const payload = JSON.parse(rawBody);

        if (Array.isArray(payload?.data) && payload.data.length > 0) {
          batches.push(payload.data);
        }
      })
      .catch(() => {
        // 请求被应用取消，忽略这一批
      });
  }

  page.on("response", onResponse);

  return {
    batches,
    dispose: () => page.off("response", onResponse)
  };
}

// 先挂上监听再触发入口，避免题库接口先返回导致漏抓。
async function startPracticeAndCaptureQuestions(page, triggerEntry) {
  const collector = collectQuestionBatches(page);

  try {
    await triggerEntry();

    await expect
      .poll(() => collector.batches.length, { message: "等待题库接口返回题目" })
      .toBeGreaterThan(0);

    return collector.batches[collector.batches.length - 1];
  } finally {
    collector.dispose();
  }
}

function normalizeOptionLabel(rawLabel) {
  let text = String(rawLabel || "").trim();

  // 策略/航行选项的 aria-label 形如「A，蓝天」，气球选项只有「蓝天」。
  text = text.replace(/^[A-D]，/, "");

  for (const suffix of FEEDBACK_LABEL_SUFFIXES) {
    if (text.endsWith(`，${suffix}`)) {
      text = text.slice(0, -(suffix.length + 1));
    }
  }

  return text;
}

function optionButtons(page) {
  // 选项可能是 AnswerOption（策略/航行）或 BalloonOption（气球），二者都是该容器下的直接 button。
  return page.locator(".quiz-card__options > button");
}

async function readDisplayedOptionLabels(page) {
  return optionButtons(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("aria-label") || "")
  );
}

async function readAnsweredCount(page) {
  const label = await page.getByLabel(/答题进度/).getAttribute("aria-label");
  const matched = /已答\s*(\d+)/.exec(String(label || ""));

  if (!matched) {
    throw new Error(`读不到答题进度：${label}`);
  }

  return Number.parseInt(matched[1], 10);
}

// 等到页面真的渲染出这道题：按选项文本轮询（基于真实条件，不用固定等待）。
async function waitForQuestionDisplayed(page, question) {
  const expectedTexts = (question.options || []).map((option) => String(option.text || "").trim());

  await expect(optionButtons(page)).toHaveCount(expectedTexts.length);
  await expect
    .poll(async () => (await readDisplayedOptionLabels(page)).map(normalizeOptionLabel), {
      message: `等待题目 ${question.id} 显示到页面上`
    })
    .toEqual(expectedTexts);
}

// 断言页面当前显示的确实是接口返回的第 index 道题，并返回这道题的数据。
async function resolveDisplayedQuestion(page, questions, index = 0) {
  const question = questions[index];

  if (!question) {
    throw new Error(`接口只返回了 ${questions.length} 道题，取不到第 ${index + 1} 道。`);
  }

  await waitForQuestionDisplayed(page, question);

  return question;
}

// 用页面自身的判题接口确定正确答案。
// /api/questions/submit 是无副作用的判题接口（只返回对错与正确答案，不写库），
// 因此可以安全地当作测试预言机使用。
async function fetchCorrectAnswer(page, questionId) {
  const response = await page.request.post("/api/questions/submit", {
    data: { questionId, selectedOption: OPTION_KEYS[0] }
  });

  if (!response.ok()) {
    throw new Error(`判题接口返回 ${response.status()}`);
  }

  const payload = await response.json();
  const correctAnswer = String(payload?.correctAnswer || "").trim();

  if (!OPTION_KEYS.includes(correctAnswer)) {
    throw new Error(`判题接口没有返回有效答案：${JSON.stringify(payload)}`);
  }

  return correctAnswer;
}

function pickWrongOptionKey(correctAnswer) {
  const wrongKey = OPTION_KEYS.find((key) => key !== correctAnswer);

  if (!wrongKey) {
    throw new Error(`无法为正确答案 ${correctAnswer} 找到错误选项`);
  }

  return wrongKey;
}

// 选项顺序与接口返回顺序一致（已由 resolveDisplayedQuestion 交叉校验）。
async function clickOptionByKey(page, question, optionKey) {
  const index = (question.options || []).findIndex((option) => option.key === optionKey);

  if (index < 0) {
    throw new Error(`题目 ${question.id} 里找不到选项 ${optionKey}`);
  }

  await optionButtons(page).nth(index).click();
}

function progressMeter(page) {
  return page.getByLabel(/答题进度/);
}

module.exports = {
  OPTION_KEYS,
  startPracticeAndCaptureQuestions,
  waitForQuestionDisplayed,
  resolveDisplayedQuestion,
  fetchCorrectAnswer,
  pickWrongOptionKey,
  clickOptionByKey,
  readAnsweredCount,
  progressMeter
};
