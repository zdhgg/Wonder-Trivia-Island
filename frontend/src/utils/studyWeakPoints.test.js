import { describe, expect, it } from "vitest";
import {
  STUDY_WEAK_POINT_LIBRARY,
  WEAK_POINT_GRADE_OPTIONS,
  findWeakPointById,
  getWeakPointSubjects,
  getWeakPoints,
  matchWeakPoints
} from "./studyWeakPoints.js";

describe("studyWeakPoints", () => {
  it("exposes grade two for both subjects", () => {
    expect(WEAK_POINT_GRADE_OPTIONS).toContain("二年级");
    expect(getWeakPointSubjects("二年级")).toEqual(["数学", "语文"]);
    expect(getWeakPoints("二年级", "数学").length).toBeGreaterThan(0);
    expect(getWeakPoints("二年级", "语文").length).toBeGreaterThan(0);
  });

  it("gives every weak point a stable id, a tag, and searchable keywords", () => {
    const seenIds = new Set();

    for (const grade of Object.keys(STUDY_WEAK_POINT_LIBRARY)) {
      for (const subject of getWeakPointSubjects(grade)) {
        for (const weakPoint of getWeakPoints(grade, subject)) {
          expect(weakPoint.id, `${grade}${subject}`).toBeTruthy();
          expect(weakPoint.label).toBeTruthy();
          expect(weakPoint.knowledgeTag).toBeTruthy();
          expect(weakPoint.hint).toBeTruthy();
          expect(Array.isArray(weakPoint.keywords)).toBe(true);
          expect(weakPoint.keywords.length).toBeGreaterThan(0);
          expect(seenIds.has(weakPoint.id), `重复的专项 id：${weakPoint.id}`).toBe(false);
          seenIds.add(weakPoint.id);
        }
      }
    }
  });

  it("returns all weak points when no keyword is given", () => {
    const all = getWeakPoints("二年级", "数学");
    expect(matchWeakPoints(all, "")).toHaveLength(all.length);
    expect(matchWeakPoints(all, "   ")).toHaveLength(all.length);
  });

  it("matches parent wording that differs from the label", () => {
    // 老师常说的是“乘数位置关系”“几个几”，条目名里并没有这几个字，
    // 必须靠 keywords 命中，否则家长搜不到。
    const mathPoints = getWeakPoints("二年级", "数学");

    const byTeacherWording = matchWeakPoints(mathPoints, "乘数位置关系");
    expect(byTeacherWording.map((item) => item.knowledgeTag)).toContain("乘法");

    const byShorthand = matchWeakPoints(mathPoints, "几个几");
    expect(byShorthand.map((item) => item.knowledgeTag)).toContain("乘法");

    const byAverage = matchWeakPoints(mathPoints, "平均分");
    expect(byAverage.map((item) => item.knowledgeTag)).toContain("除法");
  });

  it("matches by label and by hint text too", () => {
    const chinesePoints = getWeakPoints("二年级", "语文");

    expect(matchWeakPoints(chinesePoints, "标点").map((item) => item.knowledgeTag)).toContain("标点符号");
    expect(matchWeakPoints(chinesePoints, "关联词").map((item) => item.knowledgeTag)).toContain("关联词");
  });

  it("returns nothing for a keyword that matches no weak point", () => {
    expect(matchWeakPoints(getWeakPoints("二年级", "数学"), "文言文翻译")).toEqual([]);
  });

  it("finds a weak point by id with its grade and subject attached", () => {
    const found = findWeakPointById("g2-math-multiply");

    expect(found).not.toBeNull();
    expect(found.grade).toBe("二年级");
    expect(found.subject).toBe("数学");
    expect(found.knowledgeTag).toBe("乘法");

    expect(findWeakPointById("g2-math-multiply-typo")).toBeNull();
    expect(findWeakPointById("")).toBeNull();
    expect(findWeakPointById()).toBeNull();
  });
});
