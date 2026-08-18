import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicationPolicyLabel, locationPreferenceLabel } from "@/lib/studentPreferences";
import { generateText } from "ai";

export const maxDuration = 60;

// ① 志望校コンサル（会話式）。診断レコメンドの後、生徒の希望・条件を対話で聞きながら
// 学力(模試)と⑤の大学データを踏まえて具体校を提案し、志望校の絞り込みを手伝う。
// 管理者テスト機能（結果非保存）。

const ALLOWED_MODELS = [
  "anthropic/claude-sonnet-4.6",
  "openai/gpt-4o-mini",
  "anthropic/claude-opus-4.8",
] as const;
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";

const TRACK_LABEL: Record<string, string> = {
  liberal_arts: "文系",
  science: "理系",
  both: "文理未定/両方",
};

function safeJsonArray(raw: string): unknown[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const model =
    typeof body.model === "string" && (ALLOWED_MODELS as readonly string[]).includes(body.model)
      ? body.model
      : DEFAULT_MODEL;
  const rawMessages: unknown = body.messages;

  if (!studentId) {
    return NextResponse.json({ error: "studentId は必須です" }, { status: 400 });
  }
  // メッセージ整形（role は user/assistant のみ、content は文字列、直近20件）
  const messages: ChatMessage[] = Array.isArray(rawMessages)
    ? rawMessages
        .filter(
          (m): m is ChatMessage =>
            !!m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" &&
            m.content.trim().length > 0
        )
        .slice(-20)
    : [];
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "最後は生徒（user）の発言である必要があります" }, { status: 400 });
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

  const examSubjects = safeJsonArray(student.examSubjects);
  const profile = {
    氏名: student.user.name,
    卒業年度: student.graduationYear,
    文理: TRACK_LABEL[student.track] ?? "未設定",
    第一志望: student.firstChoiceSchool || "未設定",
    志望学部: student.desiredFaculty || "未設定",
    受験科目: examSubjects.length ? examSubjects : "未設定",
    推薦検討: student.considerRecommendation ? "あり" : "なし",
    出願思考: applicationPolicyLabel(student.applicationPolicy),
    志望校立地: locationPreferenceLabel(student.locationPreference),
    英検予定: student.eikenPlan || "未設定",
  };
  const mockExams = student.mockExamResults.map((m) => ({
    模試名: m.examName,
    実施日: m.examDate.toISOString().slice(0, 10),
    総合偏差値: m.overallDeviation,
    判定: m.judgment || "未記録",
    科目別: safeJsonArray(m.subjects),
  }));

  // ⑤で収集済みの大学データ（あれば根拠に使う）
  const admissions = await prisma.universityAdmission.findMany({
    include: { university: { select: { name: true, prefecture: true, category: true } } },
    orderBy: { updatedAt: "desc" },
    take: 120,
  });
  const universityData = admissions.map((a) => ({
    大学: a.university.name,
    所在地: a.university.prefecture,
    区分: a.university.category,
    学部: a.faculty,
    方式: a.method,
    科目: a.subjects,
    偏差値目安: a.deviationTarget,
  }));

  const system = [
    "あなたは高校生向けの親身な大学受験の志望校コンサルタントです。生徒本人と対話しています。",
    "目的は、生徒の学力（模試）と希望・条件を踏まえて、具体的な志望校・学部を一緒に絞り込むことです。",
    "",
    "## 進め方",
    "- 会話の最初では、現在の学力・プロフィールに合った大学をいくつかレコメンドとして提示済みです（挑戦/実力相応/安全のバランス）。",
    "- 以降は、生徒の希望や条件（学びたい分野、興味、勤務地・地域、国公私の希望、学費/予算、一人暮らしの可否、通いやすさ、将来の進路など）を**1〜2問ずつ質問して引き出しながら**、条件に合う大学・学部を具体的に提案してください。",
    "- 一度にたくさん質問攻めにしない。生徒が答えやすいよう、会話のテンポを大事に。",
    "- 提案する大学には、なぜ合うか（学力的な位置づけ＋条件との合致）を簡潔に添える。",
    "- 収集済みの大学データがあれば優先して参照する。無い情報は一般的な受験知識で補うが、偏差値や合否は断定せず「参考」として述べる。",
    "- 最終的に生徒が志望校を決める手助けをする。決めつけず、選択肢と判断材料を示す。",
    "- 出力は会話文（Markdown可、箇条書き歓迎）。1回の返答は長くなりすぎないように。",
    "",
    "## 生徒プロフィール",
    JSON.stringify(profile, null, 2),
    "",
    "## 直近の模試結果（新しい順）",
    mockExams.length ? JSON.stringify(mockExams, null, 2) : "（模試データなし）",
    "",
    "## 参考: 収集済みの大学入試データ",
    universityData.length ? JSON.stringify(universityData, null, 2) : "（収集済みデータなし。一般知識で提案）",
  ].join("\n");

  try {
    const started = Date.now();
    const { text, usage } = await generateText({
      model,
      system,
      messages,
      providerOptions: {
        gateway: { user: session.user.id, tags: ["feature:admin-ai-test", "feature:aspiration-consult"] },
      },
    });
    return NextResponse.json({
      reply: text,
      model,
      usage: { inputTokens: usage?.inputTokens ?? null, outputTokens: usage?.outputTokens ?? null },
      elapsedMs: Date.now() - started,
    });
  } catch (e: unknown) {
    const err = e as { statusCode?: number; message?: string };
    const status = err.statusCode ?? 500;
    return NextResponse.json(
      { error: `AI応答に失敗しました (status=${status}): ${err.message ?? "unknown"}` },
      { status: status === 402 || status === 429 ? status : 502 }
    );
  }
}
