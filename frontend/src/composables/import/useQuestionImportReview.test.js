import { describe, expect, it } from "vitest";
import {
  rowAnswerLabel,
  rowHasDetails,
  rowMetaList,
  rowOptionList
} from "./useQuestionImportReview";

// 修复后（新批次）落盘的行：带完整 options / explanation。
const freshRow = {
  rowNumber: 2,
  subject: "数学",
  grade: "二年级",
  semester: "上册",
  knowledgeTag: "条件上手",
  type: "乘法应用",
  content: "题目要求填写乘法口诀。下面哪一个符合要求？",
  imageUrl: "",
  options: [
    { key: "A", text: "三六十八" },
    { key: "B", text: "3×6=18" },
    { key: "C", text: "18÷3=6" },
    { key: "D", text: "3+6=9" }
  ],
  answer: "A",
  explanation: "题目要的是乘法口诀，口诀用汉字写成一句，所以选「三六十八」。",
  difficulty: 1,
  status: "valid",
  issues: []
};

// 修复前（旧批次）落盘的行：完全没有 options / explanation。
const legacyRow = {
  rowNumber: 2,
  subject: "数学",
  grade: "二年级",
  semester: "上册",
  knowledgeTag: "条件上手",
  type: "乘法应用",
  content: "题目要求填写乘法口诀。下面哪一个符合要求？",
  imageUrl: "",
  answer: "A",
  difficulty: 1,
  status: "valid",
  issues: []
};

// 校验失败的行：options 存在但文本为空。
const emptyOptionRow = {
  ...freshRow,
  options: [
    { key: "A", text: "" },
    { key: "B", text: "" },
    { key: "C", text: "" },
    { key: "D", text: "" }
  ],
  answer: "",
  explanation: ""
};

describe("rowOptionList", () => {
  it("保留新批次的四个选项", () => {
    expect(rowOptionList(freshRow)).toHaveLength(4);
    expect(rowOptionList(freshRow)[0]).toEqual({ key: "A", text: "三六十八" });
  });

  it("旧批次缺失 options 时返回空数组而不报错", () => {
    expect(rowOptionList(legacyRow)).toEqual([]);
    expect(rowOptionList({})).toEqual([]);
    expect(rowOptionList(null)).toEqual([]);
  });

  it("过滤掉空文本选项", () => {
    expect(rowOptionList(emptyOptionRow)).toEqual([]);
  });
});

describe("rowAnswerLabel", () => {
  it("把答案字母和选项文本拼成可核对的摘要", () => {
    expect(rowAnswerLabel(freshRow)).toBe("A · 三六十八");
  });

  it("答案指向别的选项时摘要随之改变", () => {
    expect(rowAnswerLabel({ ...freshRow, answer: "C" })).toBe("C · 18÷3=6");
  });

  it("旧批次没有选项时降级只显示字母", () => {
    expect(rowAnswerLabel(legacyRow)).toBe("A");
  });

  it("没有答案时显示占位符", () => {
    expect(rowAnswerLabel({ ...legacyRow, answer: "" })).toBe("—");
    expect(rowAnswerLabel({})).toBe("—");
  });

  it("选项文本过长时截断", () => {
    const longRow = {
      ...freshRow,
      options: [{ key: "A", text: "这是一个特别长的选项文本用来验证截断行为" }]
    };

    expect(rowAnswerLabel(longRow)).toBe("A · 这是一个特别长的选项文本用来...");
  });
});

describe("rowMetaList", () => {
  it("汇总题型、标签与难度", () => {
    expect(rowMetaList(freshRow)).toEqual(["乘法应用", "标签 条件上手", "难度 1"]);
  });

  it("缺字段时只返回存在的项", () => {
    expect(rowMetaList({ type: "乘法应用" })).toEqual(["乘法应用"]);
    expect(rowMetaList({})).toEqual([]);
  });
});

describe("rowHasDetails", () => {
  it("新批次有展开内容", () => {
    expect(rowHasDetails(freshRow)).toBe(true);
  });

  it("旧批次没有可展开内容，页面应走优雅提示分支", () => {
    expect(rowHasDetails(legacyRow)).toBe(false);
  });

  it("只有配图也算有详情", () => {
    expect(rowHasDetails({ ...legacyRow, imageUrl: "/images/q.png" })).toBe(true);
  });
});
