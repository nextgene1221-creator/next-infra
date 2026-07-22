import { createHash } from "crypto";
import { generateObject, jsonSchema } from "ai";
import { prisma } from "@/lib/prisma";

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
  userId: string,
  model: string = CRAWL_MODEL
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
    model,
    schema: extractionSchema,
    prompt,
    providerOptions: {
      gateway: { user: userId, tags: ["feature:university-crawl"] },
    },
  });
  return object;
}

export type CrawlChange = {
  faculty: string;
  method: string;
  type: "新規" | "更新" | "変更なし";
  summary?: string;
};

export type CrawlStoreResult =
  | { ok: false; status: number; error: string }
  | {
      ok: true;
      university: { id: string; name: string };
      extractedCount: number;
      created: number;
      updated: number;
      unchanged: number;
      changes: CrawlChange[];
    };

// 1ページを取得→抽出→大学マスタ/入試情報を差分検知しつつ保存する共通処理。
// 手動クロール(/api/admin/universities/crawl)と定期再クロール(/api/cron)で共用。
export async function crawlAndStore(opts: {
  sourceUrl: string;
  universityName?: string;
  prefecture?: string;
  category?: string;
  userId: string;
  model?: string;
}): Promise<CrawlStoreResult> {
  const { sourceUrl, userId } = opts;
  const universityName = (opts.universityName || "").trim();
  const prefectureHint = (opts.prefecture || "").trim();
  const categoryHint = (opts.category || "").trim();

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("protocol");
  } catch {
    return { ok: false, status: 400, error: "有効なURL（http/https）を指定してください" };
  }

  // 1) ページ取得
  let html = "";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "juku-system-crawler/1.0 (admission info collector)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, status: 502, error: `ページ取得に失敗しました (HTTP ${res.status})` };
    html = await res.text();
  } catch (e) {
    return { ok: false, status: 502, error: `ページ取得に失敗しました: ${e instanceof Error ? e.message : String(e)}` };
  }

  const pageText = htmlToText(html);

  // 2) AI抽出
  let extracted: ExtractedResult;
  try {
    extracted = await extractAdmissions(pageText, { universityName, sourceUrl }, userId, opts.model);
  } catch (e: unknown) {
    const err = e as { statusCode?: number; message?: string };
    const status = err.statusCode ?? 500;
    return { ok: false, status: status === 402 || status === 429 ? status : 502, error: `AI抽出に失敗しました (status=${status}): ${err.message ?? "unknown"}` };
  }

  const uniName = (universityName || extracted.university.name || "").trim();
  if (!uniName) {
    return { ok: false, status: 422, error: "大学名を特定できませんでした。大学名を明示して再実行してください。" };
  }

  // 3) 大学マスタ upsert
  const existingUni = await prisma.university.findUnique({ where: { name: uniName } });
  const university = existingUni
    ? await prisma.university.update({
        where: { id: existingUni.id },
        data: {
          prefecture: prefectureHint || extracted.university.prefecture || existingUni.prefecture,
          category: categoryHint || extracted.university.category || existingUni.category,
          website: existingUni.website || `${parsed.protocol}//${parsed.host}`,
        },
      })
    : await prisma.university.create({
        data: {
          name: uniName,
          prefecture: prefectureHint || extracted.university.prefecture,
          category: categoryHint || extracted.university.category,
          website: `${parsed.protocol}//${parsed.host}`,
        },
      });

  // 4) 入試情報を差分検知しながら upsert
  const now = new Date();
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const changes: CrawlChange[] = [];

  for (const a of extracted.admissions) {
    const hash = admissionHash(a);
    const existing = await prisma.universityAdmission.findFirst({
      where: {
        universityId: university.id,
        faculty: a.faculty,
        department: a.department,
        method: a.method,
        targetYear: a.targetYear,
      },
    });

    if (!existing) {
      await prisma.universityAdmission.create({
        data: {
          universityId: university.id,
          faculty: a.faculty,
          department: a.department,
          method: a.method,
          targetYear: a.targetYear,
          examDate: a.examDate,
          applicationPeriod: a.applicationPeriod,
          subjects: a.subjects,
          capacity: a.capacity,
          deviationTarget: a.deviationTarget,
          examFee: a.examFee,
          sourceUrl,
          contentHash: hash,
          lastCrawledAt: now,
        },
      });
      created++;
      changes.push({ faculty: a.faculty, method: a.method, type: "新規" });
    } else if (existing.contentHash !== hash) {
      const before = {
        examDate: existing.examDate,
        applicationPeriod: existing.applicationPeriod,
        subjects: existing.subjects,
        capacity: existing.capacity,
        deviationTarget: existing.deviationTarget,
        examFee: existing.examFee,
      };
      const after = {
        examDate: a.examDate,
        applicationPeriod: a.applicationPeriod,
        subjects: a.subjects,
        capacity: a.capacity,
        deviationTarget: a.deviationTarget,
        examFee: a.examFee,
      };
      const changedFields = (Object.keys(after) as (keyof typeof after)[]).filter(
        (k) => String(before[k] ?? "") !== String(after[k] ?? "")
      );
      const summary = `${a.faculty || "(学部不明)"} ${a.method || ""}: ${changedFields.join(", ")} が変更`;
      await prisma.universityAdmission.update({
        where: { id: existing.id },
        data: {
          examDate: a.examDate,
          applicationPeriod: a.applicationPeriod,
          subjects: a.subjects,
          capacity: a.capacity,
          deviationTarget: a.deviationTarget,
          examFee: a.examFee,
          sourceUrl,
          contentHash: hash,
          lastCrawledAt: now,
        },
      });
      await prisma.admissionRevision.create({
        data: { admissionId: existing.id, summary, diff: JSON.stringify({ before, after, changedFields }), sourceUrl },
      });
      updated++;
      changes.push({ faculty: a.faculty, method: a.method, type: "更新", summary });
    } else {
      await prisma.universityAdmission.update({ where: { id: existing.id }, data: { lastCrawledAt: now } });
      unchanged++;
      changes.push({ faculty: a.faculty, method: a.method, type: "変更なし" });
    }
  }

  return {
    ok: true,
    university: { id: university.id, name: university.name },
    extractedCount: extracted.admissions.length,
    created,
    updated,
    unchanged,
    changes,
  };
}
