// 教学演示规格的纯校验 / 归一化模块。
//
// 设计边界（Phase 1 修订后）：
// - Wonder-Trivia-Island 不做任何模型推理，也不需要一个模型供应商 SDK。
// - 外部 Harness 自己生成候选 demo spec，通过 External AI Gateway 提交。
// - 本模块是唯一的“受控规格”入口：任何进入 teaching_demo_drafts 的 spec
//   都必须先通过这里的白名单校验，浏览器只渲染归一化后的结构化字段。
// 因此这里只保留纯函数，不引入任何网络调用或模型客户端。

const SUPPORTED_TEACHING_DEMO_TYPES = Object.freeze(["comparison_demo", "micro_animation"]);
const SUPPORTED_TEACHING_DEMO_TYPE_SET = new Set(SUPPORTED_TEACHING_DEMO_TYPES);

// steps[].focus 的白名单：Renderer 只认识这些取值，其余一律拒绝。
const DEMO_FOCUS = Object.freeze({
  comparison_demo: Object.freeze(["left", "right", "both", "takeaway"]),
  micro_animation: Object.freeze(["groups", "each_group", "roles", "expression", "total"])
});

const SPEC_KEYS = Object.freeze([
  "template",
  "title",
  "summary",
  "scene",
  "steps",
  "labels",
  "takeaway",
  "question"
]);
const COMPARISON_SCENE_KEYS = Object.freeze(["left", "right"]);
const COMPARISON_SIDE_KEYS = Object.freeze(["label", "value", "description"]);
const MICRO_SCENE_KEYS = Object.freeze([
  "groupCount",
  "itemsPerGroup",
  "groupLabel",
  "itemLabel",
  "perGroupLabel",
  "groupCountLabel",
  "expression",
  "totalLabel"
]);
const STEP_KEYS = Object.freeze(["title", "text", "focus"]);

const MAX_STEPS = 6;
const MAX_LABELS = 8;
const MAX_SPEC_JSON_LENGTH = 64 * 1024;
const GROUP_COUNT_MIN = 1;
const GROUP_COUNT_MAX = 6;
const ITEMS_PER_GROUP_MIN = 1;
const ITEMS_PER_GROUP_MAX = 8;

// 明确拒绝可执行内容：HTML / SVG 标签、Vue 模板表达式、脚本协议、内联事件、DOM/脚本调用。
// 只匹配「像标记或代码」的形态，"3<5" 这类正常数学文本不会被误伤。
const FORBIDDEN_TEXT_RULES = Object.freeze([
  { pattern: /<[a-zA-Z!/]/, label: "HTML / SVG 标签" },
  { pattern: /\{\{|\}\}/, label: "Vue 模板表达式" },
  { pattern: /javascript\s*:|vbscript\s*:|data\s*:\s*text\/html/i, label: "可执行链接协议" },
  { pattern: /\son[a-z]+\s*=/i, label: "内联事件处理" },
  { pattern: /v-html|v-bind|innerhtml|document\.|\beval\s*\(/i, label: "脚本或 DOM 代码" }
]);

const MICRO_SCENE_NUMERIC_RULE_TEXT = `groupCount 必须是 ${GROUP_COUNT_MIN} 到 ${GROUP_COUNT_MAX} 的整数，itemsPerGroup 必须是 ${ITEMS_PER_GROUP_MIN} 到 ${ITEMS_PER_GROUP_MAX} 的整数。`;

function createTeachingDemoSpecError(message, issues = []) {
  const error = new Error(message);
  error.statusCode = 422;
  error.details = Array.isArray(issues) ? issues.slice(0, 12) : [];
  return error;
}

function isSupportedTeachingDemoType(value) {
  return SUPPORTED_TEACHING_DEMO_TYPE_SET.has(value);
}

function hasOnlyKeys(value, keys) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => keys.includes(key))
  );
}

function findForbiddenTextIssue(value) {
  return FORBIDDEN_TEXT_RULES.find((rule) => rule.pattern.test(value)) || null;
}

function requireString(value, label, maxLength, issues) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    issues.push(`${label} 必须是长度不超过 ${maxLength} 的非空文本。`);
    return "";
  }

  const normalized = value.trim();
  const forbidden = findForbiddenTextIssue(normalized);

  if (forbidden) {
    issues.push(`${label} 不能包含${forbidden.label}。`);
    return "";
  }

  return normalized;
}

function requireOptionalText(value, label, maxLength, issues) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (typeof value !== "string" || value.length > maxLength) {
    issues.push(`${label} 必须是长度不超过 ${maxLength} 的文本。`);
    return "";
  }

  const normalized = value.trim();
  const forbidden = findForbiddenTextIssue(normalized);

  if (forbidden) {
    issues.push(`${label} 不能包含${forbidden.label}。`);
    return "";
  }

  return normalized;
}

function validateComparisonScene(scene, issues) {
  if (!hasOnlyKeys(scene, COMPARISON_SCENE_KEYS)) {
    issues.push("comparison_demo.scene 只能包含 left、right，且必须是对象。");
    return null;
  }

  const normalized = {};

  for (const side of COMPARISON_SCENE_KEYS) {
    const card = scene[side];

    if (!hasOnlyKeys(card, COMPARISON_SIDE_KEYS)) {
      issues.push(`comparison_demo.scene.${side} 只能包含 label、value、description。`);
      normalized[side] = { label: "", value: "", description: "" };
      continue;
    }

    normalized[side] = {
      label: requireString(card.label, `scene.${side}.label`, 80, issues),
      value: requireString(card.value, `scene.${side}.value`, 180, issues),
      description: requireString(card.description, `scene.${side}.description`, 500, issues)
    };
  }

  return normalized;
}

function validateMicroScene(scene, issues) {
  if (!hasOnlyKeys(scene, MICRO_SCENE_KEYS)) {
    issues.push("micro_animation.scene 只允许使用受控的分组字段。");
    return null;
  }

  const { groupCount, itemsPerGroup } = scene;
  const isGroupCountValid =
    typeof groupCount === "number" &&
    Number.isInteger(groupCount) &&
    groupCount >= GROUP_COUNT_MIN &&
    groupCount <= GROUP_COUNT_MAX;
  const isItemsPerGroupValid =
    typeof itemsPerGroup === "number" &&
    Number.isInteger(itemsPerGroup) &&
    itemsPerGroup >= ITEMS_PER_GROUP_MIN &&
    itemsPerGroup <= ITEMS_PER_GROUP_MAX;

  if (!isGroupCountValid || !isItemsPerGroupValid) {
    issues.push(`micro_animation.scene 越界：${MICRO_SCENE_NUMERIC_RULE_TEXT}`);
  }

  return {
    groupCount: isGroupCountValid ? groupCount : 0,
    itemsPerGroup: isItemsPerGroupValid ? itemsPerGroup : 0,
    groupLabel: requireString(scene.groupLabel, "scene.groupLabel", 80, issues),
    itemLabel: requireString(scene.itemLabel, "scene.itemLabel", 80, issues),
    perGroupLabel: requireString(scene.perGroupLabel, "scene.perGroupLabel", 120, issues),
    groupCountLabel: requireString(scene.groupCountLabel, "scene.groupCountLabel", 120, issues),
    expression: requireString(scene.expression, "scene.expression", 120, issues),
    totalLabel: requireString(scene.totalLabel, "scene.totalLabel", 120, issues)
  };
}

function validateSteps(steps, type, issues) {
  if (!Array.isArray(steps) || steps.length < 1 || steps.length > MAX_STEPS) {
    issues.push(`steps 必须包含 1 到 ${MAX_STEPS} 个步骤。`);
    return [];
  }

  const allowedFocus = DEMO_FOCUS[type];

  return steps.map((step, index) => {
    if (!hasOnlyKeys(step, STEP_KEYS)) {
      issues.push(`steps[${index}] 只能包含 title、text、focus。`);
    }

    if (!allowedFocus.includes(step?.focus)) {
      issues.push(`steps[${index}].focus 不属于 ${type} 的白名单：${allowedFocus.join("、")}。`);
    }

    return {
      title: requireString(step?.title, `steps[${index}].title`, 120, issues),
      text: requireString(step?.text, `steps[${index}].text`, 500, issues),
      focus: allowedFocus.includes(step?.focus) ? step.focus : allowedFocus[0]
    };
  });
}

function validateLabels(labels, issues) {
  if (!Array.isArray(labels)) {
    issues.push("labels 必须是数组。");
    return [];
  }

  if (labels.length > MAX_LABELS) {
    issues.push(`labels 最多只能包含 ${MAX_LABELS} 项。`);
  }

  return labels.slice(0, MAX_LABELS).map((label, index) => requireString(label, `labels[${index}]`, 80, issues));
}

/**
 * 把外部提交的任意值归一化为受控 demo spec。
 * 任何未通过白名单的内容都会抛 422（带 details 列表），调用方不得绕过。
 */
function normalizeTeachingDemoSpec(raw, expectedType) {
  if (!isSupportedTeachingDemoType(expectedType)) {
    throw createTeachingDemoSpecError("教学演示类型不受支持。", [
      `interventionType 仅支持：${SUPPORTED_TEACHING_DEMO_TYPES.join("、")}。`
    ]);
  }

  const issues = [];

  if (!hasOnlyKeys(raw, SPEC_KEYS)) {
    issues.push(`演示规格只能包含这些字段：${SPEC_KEYS.join("、")}。`);
  }

  if (raw?.template !== expectedType) {
    issues.push(`template 必须是 ${expectedType}。`);
  }

  const normalized = {
    template: expectedType,
    title: requireString(raw?.title, "title", 120, issues),
    summary: requireString(raw?.summary, "summary", 400, issues),
    scene: expectedType === "comparison_demo"
      ? validateComparisonScene(raw?.scene, issues)
      : validateMicroScene(raw?.scene, issues),
    steps: validateSteps(raw?.steps, expectedType, issues),
    labels: validateLabels(raw?.labels, issues),
    takeaway: requireString(raw?.takeaway, "takeaway", 500, issues),
    question: requireOptionalText(raw?.question, "question", 240, issues)
  };

  if (!normalized.scene) {
    issues.push("scene 结构无效。");
  }

  let serialized = "";

  try {
    serialized = JSON.stringify(normalized);
  } catch {
    issues.push("演示规格无法序列化。");
  }

  if (!serialized || serialized.length > MAX_SPEC_JSON_LENGTH) {
    issues.push("演示规格内容过大。");
  }

  if (issues.length > 0) {
    throw createTeachingDemoSpecError("教学演示规格未通过系统白名单校验。", issues);
  }

  return normalized;
}

module.exports = {
  SUPPORTED_TEACHING_DEMO_TYPES,
  DEMO_FOCUS,
  MAX_SPEC_JSON_LENGTH,
  isSupportedTeachingDemoType,
  normalizeTeachingDemoSpec
};
