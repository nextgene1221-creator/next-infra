import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateObject, jsonSchema } from "ai";

// 管理者テスト機能（①志望校診断AI の検証用）。
// AI基盤の疎通・構造化出力・生徒データ接続を本番リスクなく確認するための使い捨てエンドポイント。
// 結果は保存しない。生徒公開もしない（admin限定）。

// 初期テストで切替可能なモデル（実測で疎通確認済みの現行slug）
// 無料枠（$5/月クレジット）で使えるのは sonnet-4.6 / gpt-4o-mini のみ。
// haiku-4.5 / opus-4.8 は有料クレジットのトップアップで解放される（それまでは403）。
const ALLOWED_MODELS = [
  "anthropic/claude-sonnet-4.6", // 既定・無料枠で利用可（品質良好）
  "openai/gpt-4o-mini", // 低コストの比較用・無料枠で利用可
  "anthropic/claude-opus-4.8", // 最高品質・要有料クレジット
] as const;
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";

const TRACK_LABEL: Record<string, string> = {
  liberal_arts: "文系",
  science: "理系",
  both: "文理未定/両方",
};

const diagnosisSchema = jsonSchema<{
  summary: string;
  schools: {
    name: string;
    positioning: "挑戦" | "実力相応" | "安全";
    assessment: string;
    rationale: string;
  }[];
  weakSubjects: { subject: string; comment: string; recommendedAction: string }[];
  overallAdvice: string;
}>({
  type: "object",
  additionalProperties: false,
  required: ["summary", "schools", "weakSubjects", "overallAdvice"],
  properties: {
    summary: { type: "string", description: "生徒の現状の総評（3〜4文）" },
    schools: {
      type: "array",
      description: "志望校ごとの位置づけ。志望校が1つでも、関連する併願候補を含め2〜4件挙げてよい。",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "positioning", "assessment", "rationale"],
        properties: {
          name: { type: "string", description: "大学・学部名" },
          positioning: { type: "string", enum: ["挑戦", "実力相応", "安全"] },
          assessment: { type: "string", description: "合格可能性の所見（定性的でよい）" },
          rationale: { type: "string", description: "その判断の根拠" },
        },
      },
    },
    weakSubjects: {
      type: "array",
      description: "弱点科目と推奨アクション",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["subject", "comment", "recommendedAction"],
        properties: {
          subject: { type: "string" },
          comment: { type: "string" },
          recommendedAction: { type: "string" },
        },
      },
    },
    overallAdvice: { type: "string", description: "進路指導者向けの総合アドバイス" },
  },
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const model =
    typeof body.model === "string" &&
    (ALLOWED_MODELS as readonly string[]).includes(body.model)
      ? body.model
      : DEFAULT_MODEL;

  if (!studentId) {
    return NextResponse.json({ error: "studentId は必須です" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true } },
      mockExamResults: { orderBy: { examDate: "desc" }, take: 5 },
    },
  });
  if (!student) {
    return NextResponse.json({ error: "生徒が見つかりません" }, { status: 404 });
  }

  // 入力スナップショット（プロフィール＋直近模試）を組み立て
  const examSubjects = safeJsonArray(student.examSubjects);
  const profile = {
    氏名: student.user.name,
    卒業年度: student.graduationYear,
    文理: TRACK_LABEL[student.track] ?? "未設定",
    第一志望: student.firstChoiceSchool || "未設定",
    志望学部: student.desiredFaculty || "未設定",
    受験科目: examSubjects.length ? examSubjects : "未設定",
    推薦検討: student.considerRecommendation ? "あり" : "なし",
    英検予定: student.eikenPlan || "未設定",
  };
  const mockExams = student.mockExamResults.map((m) => ({
    模試名: m.examName,
    実施日: m.examDate.toISOString().slice(0, 10),
    学年: m.gradeLevel,
    総合偏差値: m.overallDeviation,
    判定: m.judgment || "未記録",
    科目別: safeJsonArray(m.subjects),
  }));

  const hasSignal = student.firstChoiceSchool || mockExams.length > 0;
  if (!hasSignal) {
    return NextResponse.json(
      { error: "この生徒には志望校・模試データが未登録のため診断できません（テスト対象を変えてください）" },
      { status: 422 }
    );
  }

  const prompt = [
    "あなたは大学受験の進路指導を補助するアシスタントです。",
    "以下の生徒プロフィールと直近の模試結果をもとに、志望校診断を作成してください。",
    "大学ごとの公式な偏差値・判定テーブルは提供されていないため、一般的な受験知識に基づく参考所見として、断定を避けた表現で述べてください。",
    "",
    "## 生徒プロフィール",
    JSON.stringify(profile, null, 2),
    "",
    "## 直近の模試結果（新しい順・最大5件）",
    mockExams.length ? JSON.stringify(mockExams, null, 2) : "（模試データなし）",
  ].join("\n");

  try {
    const started = Date.now();
    const { object, usage } = await generateObject({
      model,
      schema: diagnosisSchema,
      prompt,
      providerOptions: {
        gateway: {
          user: session.user.id,
          tags: ["feature:admin-ai-test", "feature:aspiration-diagnosis"],
        },
      },
    });

    return NextResponse.json({
      student: { id: student.id, name: student.user.name },
      model,
      input: { profile, mockExams },
      result: object,
      usage: {
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
      },
      elapsedMs: Date.now() - started,
    });
  } catch (e: unknown) {
    const err = e as { statusCode?: number; message?: string };
    const status = err.statusCode ?? 500;
    return NextResponse.json(
      { error: `AI生成に失敗しました (status=${status}): ${err.message ?? "unknown"}` },
      { status: status === 402 || status === 429 ? status : 502 }
    );
  }
}

function safeJsonArray(raw: string): unknown[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
