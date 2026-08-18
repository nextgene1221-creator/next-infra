// 模試マスタの共通定義（クライアント/サーバー両用・prisma 非依存）。
// 対象学年の値は MockExamResult.gradeLevel と揃える（high1 / high2 / high3 / ronin）。

export const MOCK_EXAM_GRADE_LEVELS = [
  { value: "high1", label: "高1" },
  { value: "high2", label: "高2" },
  { value: "high3", label: "高3" },
  { value: "ronin", label: "浪人" },
] as const;

// マスタに無い模試を入力するための選択肢（B-7 (b): 自由入力は残す）
export const OTHER_EXAM_VALUE = "__other__";

export function parseGradeLevels(json: string | null | undefined): string[] {
  try {
    const v = JSON.parse(json || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
