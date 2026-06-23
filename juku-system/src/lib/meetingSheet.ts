// 週次面談シートの項目定義（クライアント/サーバー両用・prisma 非依存）
// 項目の正は spec.md 5.9。

export const CONFIDENCE_OPTIONS = [
  "かなりあった",
  "少しあった",
  "あまりなかった",
  "ほぼなかった",
] as const;

export const PLAN_VS_ACTUAL_OPTIONS = [
  "ほぼ予定通り",
  "少しズレた",
  "大きくズレた",
] as const;

export const DIFF_DIRECTION_OPTIONS = [
  "予定より進みすぎた",
  "予定より進まなかった",
  "進度は同じだが中身が違った",
  "まだ整理できていない",
] as const;

export const SAME_CONDITION_OPTIONS = ["起きそう", "起きなさそう", "分からない"] as const;

// 予定と違った理由（複数選択可・一部にサブ選択あり）
export const DIFF_REASONS: { key: string; label: string; sub: string[] }[] = [
  { key: "time", label: "学習時間（実際に使えた時間）", sub: ["予定より多い", "予定より少ない"] },
  { key: "amount", label: "学習量（問題数やページ）", sub: ["予定より多い", "予定より少ない"] },
  { key: "difficulty", label: "内容の難易度", sub: ["想定より重い", "想定より軽い"] },
  { key: "otherTask", label: "他のタスクを優先した", sub: ["課題", "自分で追加したタスク", "その他"] },
  { key: "health", label: "体調", sub: [] },
  { key: "schedule", label: "予定", sub: [] },
  { key: "none", label: "特になし", sub: [] },
];

export type SheetAnswers = {
  // 【2】学習ログ
  totalHoursTarget: string; // 数値だが入力都合で string 保持
  totalHoursActual: string;
  confidence: string;
  unplannedTasks: string;
  // 【3】ズレ
  planVsActual: string;
  diffReasons: string[]; // DIFF_REASONS の key
  diffReasonSub: Record<string, string>; // key -> 選択したサブラベル
  diffDirection: string;
  sameCondition: string;
  diffNote: string;
  // 【4】来週に向けて
  continueHas: "" | "yes" | "no";
  continueText: string;
  changeHas: "" | "yes" | "no";
  changeText: string;
  // 【5】メモ
  memo: string;
};

export const EMPTY_ANSWERS: SheetAnswers = {
  totalHoursTarget: "",
  totalHoursActual: "",
  confidence: "",
  unplannedTasks: "",
  planVsActual: "",
  diffReasons: [],
  diffReasonSub: {},
  diffDirection: "",
  sameCondition: "",
  diffNote: "",
  continueHas: "",
  continueText: "",
  changeHas: "",
  changeText: "",
  memo: "",
};

// 保存済みJSON（部分的な可能性あり）を完全な SheetAnswers に正規化
export function parseAnswers(json: string | null | undefined): SheetAnswers {
  if (!json) return { ...EMPTY_ANSWERS };
  try {
    const obj = JSON.parse(json) as Partial<SheetAnswers>;
    return {
      ...EMPTY_ANSWERS,
      ...obj,
      diffReasons: Array.isArray(obj.diffReasons) ? obj.diffReasons : [],
      diffReasonSub: obj.diffReasonSub && typeof obj.diffReasonSub === "object" ? obj.diffReasonSub : {},
    };
  } catch {
    return { ...EMPTY_ANSWERS };
  }
}

export const SHEET_INTRO =
  "このシートは、来週の勉強で迷わないための材料を集めるものです。正しい答えを書く必要はありません。事実と、そのときどう感じたかだけ書いてください。";
export const SHEET_OUTRO =
  "上記の内容をもとに面談し、迷わず進められる来週の計画を一緒に考えます。";

// 未提出タグを面談予定日の何日前から出すか
export const REMIND_DAYS_BEFORE = 3;
