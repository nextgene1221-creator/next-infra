import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicationPolicyLabel, locationPreferenceLabel } from "@/lib/studentPreferences";
import { generateText } from "ai";

export const maxDuration = 60;

// ② 出願戦略の会話式ブラッシュアップ。最初に提示した戦略に対し、生徒のフィードバック
// （予算・外したい校・方式の希望・日程 等）を受けて戦略を改善する。結果非保存・admin限定。

const ALLOWED_MODELS = [
  "anthropic/claude-sonnet-4.6",
  "openai/gpt-4o-mini",
  "anthropic/claude-opus-4.8",
] as const;
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";
const DEFAULT_AIRFARE = 40000;
const DEFAULT_LODGING = 8000;

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
  const budgetYen = Number.isFinite(Number(body.budgetYen)) && Number(body.budgetYen) > 0 ? Math.floor(Number(body.budgetYen)) : null;
  const airfareYen = Number.isFinite(Number(body.airfareYen)) && Number(body.airfareYen) > 0 ? Math.floor(Number(body.airfareYen)) : DEFAULT_AIRFARE;
  const lodgingYen = Number.isFinite(Number(body.lodgingYen)) && Number(body.lodgingYen) > 0 ? Math.floor(Number(body.lodgingYen)) : DEFAULT_LODGING;

  if (!studentId) {
    return NextResponse.json({ error: "studentId は必須です" }, { status: 400 });
  }
  const messages: ChatMessage[] = Array.isArray(body.messages)
    ? body.messages
        .filter(
          (m: unknown): m is ChatMessage =>
            !!m &&
            ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
            typeof (m as ChatMessage).content === "string" &&
            (m as ChatMessage).content.trim().length > 0
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
  };
  const mockExams = student.mockExamResults.map((m) => ({
    模試名: m.examName,
    実施日: m.examDate.toISOString().slice(0, 10),
    総合偏差値: m.overallDeviation,
    判定: m.judgment || "未記録",
  }));

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
    試験日: a.examDate,
    受験料: a.examFee,
    偏差値目安: a.deviationTarget,
  }));

  const system = [
    "あなたは大学受験の出願戦略アドバイザーです。生徒本人と対話しています。",
    "会話の最初に、あなたは出願プラン（国公立の前期/中期/後期＋私立の別枠、各校の挑戦/実力相応/安全、入試方式、試験日、費用試算）を提示済みです。",
    "以降は生徒のフィードバック（予算を抑えたい、この大学は外したい/加えたい、推薦は使いたくない、日程が厳しい、地元がいい 等）を受けて、**戦略をより良く調整**してください。",
    "",
    "## 方針",
    "- 生徒は**沖縄在住**。本土受験は航空機＋宿泊が必要。日程が近い受験は**まとめて1回の遠征**にして遠征回数・宿泊数・費用を最小化する。",
    `- 費用前提（参考）: 往復航空券 約${airfareYen.toLocaleString()}円/遠征、宿泊 約${lodgingYen.toLocaleString()}円/泊。${budgetYen ? `家庭の予算感 約${budgetYen.toLocaleString()}円。` : ""}`,
    "- フィードバックを反映した**更新後のプラン**を示す。**国公立（前期/中期/後期）と私立は別枠**のまま扱い、挑戦/実力相応/安全は国公立・私立それぞれの中で独立に判定する。変わった費用感も簡潔に示す。",
    "- 収集済みの大学データがあれば優先参照。無い情報は一般知識で参考として述べ、受験料・合否は断定しない。",
    "- 返答は会話文（Markdown可・箇条書き歓迎）。長くなりすぎない。",
    "",
    "## 生徒プロフィール",
    JSON.stringify(profile, null, 2),
    "",
    "## 直近の模試",
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
        gateway: { user: session.user.id, tags: ["feature:admin-ai-test", "feature:strategy-consult"] },
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
