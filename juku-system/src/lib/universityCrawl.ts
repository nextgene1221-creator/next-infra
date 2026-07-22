import { createHash } from "crypto";
import { generateObject, jsonSchema } from "ai";

// 各大学HPから入試情報をAI抽出するためのユーティリティ（依頼⑤）。
// クロール＝対象URLを fetch → HTMLをテキスト化 → Gateway で構造化抽出。

export const CRAWL_MODEL = "anthropic/claude-sonnet-4.6";
const MAX_TEXT_CHARS = 24000; // トークン制御のため本文を上限で切る

export type ExtractedAdmission = {
  faculty: string;
  department: string;
  method: string;
  targetYear: number | null;
  examDate: string;
  applicationPeriod: string;
  subjects: string;
  capacity: number | null;
  deviationTarget: string;
  examFee: number | null;
};

export type ExtractedResult = {
  university: { name: string; prefecture: string; category: string };
  admissions: ExtractedAdmission[];
};

// HTML を素朴にプレーンテキスト化（script/style除去・タグ除去・空白圧縮）
export function htmlToText(html: string): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t　]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
  return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
}

// 差分検知用: 入試情報の主要フィールドから安定ハッシュを生成
export function admissionHash(a: {
  examDate: string;
  applicationPeriod: string;
  subjects: string;
  capacity: number | null;
  deviationTarget: string;
  examFee: number | null;
}): string {
  const norm = [
    a.examDate.trim(),
    a.applicationPeriod.trim(),
    a.subjects.trim(),
    a.capacity ?? "",
    a.deviationTarget.trim(),
    a.examFee ?? "",
  ].join("|");
  return createHash("sha256").update(norm).digest("hex").slice(0, 16);
}

const extractionSchema = jsonSchema<ExtractedResult>({
  type: "object",
  additionalProperties: false,
  required: ["university", "admissions"],
  properties: {
    university: {
      type: "object",
      additionalProperties: false,
      required: ["name", "prefecture", "category"],
      properties: {
        name: { type: "string", description: "大学名。ページから読み取れなければ空文字。" },
        prefecture: { type: "string", description: "所在地の都道府県。不明なら空文字。" },
        category: { type: "string", description: "国立 / 公立 / 私立 のいずれか。不明なら空文字。" },
      },
    },
    admissions: {
      type: "array",
      description:
        "このページに記載されている入試情報。学部×方式などの単位で1件ずつ。記載が無ければ空配列。推測で埋めず、ページ記載の事実のみ抽出する。",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "faculty",
          "department",
          "method",
          "targetYear",
          "examDate",
          "applicationPeriod",
          "subjects",
          "capacity",
          "deviationTarget",
          "examFee",
        ],
        properties: {
          faculty: { type: "string", description: "学部。不明なら空文字。" },
          department: { type: "string", description: "学科・コース。不明なら空文字。" },
          method: {
            type: "string",
            description: "入試方式（一般 / 共通テスト利用 / 学校推薦 / 総合型 など）。不明なら空文字。",
          },
          targetYear: { type: ["integer", "null"], description: "対象年度（西暦）。不明なら null。" },
          examDate: { type: "string", description: "試験日。複数は ; 区切り。不明なら空文字。" },
          applicationPeriod: { type: "string", description: "出願期間。不明なら空文字。" },
          subjects: { type: "string", description: "受験科目。不明なら空文字。" },
          capacity: { type: ["integer", "null"], description: "募集定員。不明なら null。" },
          deviationTarget: { type: "string", description: "偏差値目安。不明なら空文字。" },
          examFee: { type: ["integer", "null"], description: "受験料（円）。不明なら null。" },
        },
      },
    },
  },
});

// テキスト化済みページ本文から入試情報を構造化抽出する
export async function extractAdmissions(
  pageText: string,
  hints: { universityName?: string; sourceUrl: string },
  userId: string
): Promise<ExtractedResult> {
  const prompt = [
    "あなたは大学入試要項の情報抽出アシスタントです。",
    "以下は大学HPのあるページをテキスト化したものです。ここに**明記されている**入試情報のみを構造化して抽出してください。",
    "ページに載っていない項目は推測せず、空文字または null にしてください。入試情報が無いページなら admissions は空配列にします。",
    hints.universityName ? `対象大学（参考）: ${hints.universityName}` : "",
    `ソースURL: ${hints.sourceUrl}`,
    "",
    "## ページ本文",
    pageText || "（本文が取得できませんでした）",
  ]
    .filter(Boolean)
    .join("\n");

  const { object } = await generateObject({
    model: CRAWL_MODEL,
    schema: extractionSchema,
    prompt,
    providerOptions: {
      gateway: { user: userId, tags: ["feature:university-crawl"] },
    },
  });
  return object;
}
