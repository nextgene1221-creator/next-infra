import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicationPolicyLabel, locationPreferenceLabel, URBAN_DEFINITION_NOTE } from "@/lib/studentPreferences";
import { generateObject, jsonSchema } from "ai";
import type { JSONSchema7 } from "json-schema";

export const maxDuration = 60;

// ② 出願戦略ジェネレータ（管理者テスト）。①と同じAI基盤を共用。
// 入力=生徒プロフィール（出願思考/志望校立地を含む）＋模試＋予算＋⑤の大学入試データ。
// 出力=出願プラン（国公立は前期/中期/後期、私立は別枠。各校に挑戦/実力相応/安全）、
// 日程衝突、受験料＋沖縄からの移動/宿泊費概算、リスク。結果は保存しない。

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

// 沖縄からの受験を前提とした費用の既定値（管理者が上書き可能）
const DEFAULT_AIRFARE = 40000; // 沖縄⇔本土 往復航空券の目安（1回の遠征あたり）
const DEFAULT_LODGING = 8000; // 1泊の宿泊費目安

// 出願プラン1件。国公立・私立で共通の形。
type PlanItem = {
  name: string;
  faculty: string;
  method: string;
  tier: "挑戦" | "実力相応" | "安全";
  examDate: string;
  examFeeYen: number | null;
  rationale: string;
};

const planItemSchema: JSONSchema7 = {
  type: "object",
  additionalProperties: false,
  required: ["name", "faculty", "method", "tier", "examDate", "examFeeYen", "rationale"],
  properties: {
    name: { type: "string", description: "大学名" },
    faculty: { type: "string", description: "学部・学科" },
    method: { type: "string", description: "入試方式（一般/共通テスト利用/学校推薦/総合型など）" },
    tier: {
      type: "string",
      enum: ["挑戦", "実力相応", "安全"],
      description: "難易度の位置づけ。国公立・私立それぞれの中で独立に判定すること",
    },
    examDate: { type: "string", description: "試験日（分かれば）" },
    examFeeYen: { type: ["integer", "null"], description: "受験料（円、分かれば）" },
    rationale: { type: "string", description: "この校・方式を薦める理由" },
  },
};

const planArray = (desc: string): JSONSchema7 => ({
  type: "array",
  description: desc,
  items: planItemSchema,
});

const strategySchema = jsonSchema<{
  summary: string;
  publicPlan: { 前期: PlanItem[]; 中期: PlanItem[]; 後期: PlanItem[] };
  privatePlan: PlanItem[];
  scheduleConflicts: { dates: string; description: string }[];
  costEstimate: {
    examFeesTotalYen: number | null;
    tripsAssumed: number | null;
    nightsAssumed: number | null;
    travelTotalYen: number | null;
    lodgingTotalYen: number | null;
    grandTotalYen: number | null;
    notes: string;
  };
  risks: string[];
  advice: string;
}>({
  type: "object",
  additionalProperties: false,
  required: ["summary", "publicPlan", "privatePlan", "scheduleConflicts", "costEstimate", "risks", "advice"],
  properties: {
    summary: { type: "string", description: "出願戦略の総評（3〜4文）。国公立を基本線としたうえでの方針を述べる" },
    publicPlan: {
      type: "object",
      additionalProperties: false,
      description:
        "国公立の出願プラン。前期・中期・後期の3日程それぞれについて、挑戦・実力相応・安全のバランスで提示する。該当校が無い日程は空配列にする（無理に埋めない）。",
      required: ["前期", "中期", "後期"],
      properties: {
        前期: planArray("国公立 前期日程。各 tier から1校程度を目安に。"),
        中期: planArray("国公立 中期日程。実施校は公立大の一部のみと少ないため、該当が無ければ空配列にする。"),
        後期: planArray("国公立 後期日程。各 tier から1校程度を目安に。"),
      },
    },
    privatePlan: planArray(
      "私立の出願候補。国公立とは別枠で、挑戦・実力相応・安全それぞれ1〜2校を目安に提示する。"
    ),
    scheduleConflicts: {
      type: "array",
      description: "試験日の衝突や近接（沖縄からの遠征を考慮）。無ければ空配列。",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dates", "description"],
        properties: {
          dates: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    costEstimate: {
      type: "object",
      additionalProperties: false,
      required: [
        "examFeesTotalYen",
        "tripsAssumed",
        "nightsAssumed",
        "travelTotalYen",
        "lodgingTotalYen",
        "grandTotalYen",
        "notes",
      ],
      properties: {
        examFeesTotalYen: { type: ["integer", "null"], description: "受験料の合計（円）" },
        tripsAssumed: { type: ["integer", "null"], description: "想定した沖縄からの遠征回数（まとめて受験する前提で最小化）" },
        nightsAssumed: { type: ["integer", "null"], description: "想定した総宿泊数" },
        travelTotalYen: { type: ["integer", "null"], description: "移動費（航空券）の合計（円）" },
        lodgingTotalYen: { type: ["integer", "null"], description: "宿泊費の合計（円）" },
        grandTotalYen: { type: ["integer", "null"], description: "受験料＋移動＋宿泊の総額（円）" },
        notes: { type: "string", description: "費用試算の前提・注意（参考値である旨）" },
      },
    },
    risks: { type: "array", items: { type: "string" }, description: "想定リスク" },
    advice: { type: "string", description: "進路指導者向けの総合アドバイス" },
  },
});

function safeJsonArray(raw: string): unknown[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

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
    科目別: safeJsonArray(m.subjects),
  }));

  // ⑤で収集済みの大学入試データを添える（あれば根拠に使う。多すぎるとトークン超過のため上限）
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
    学科: a.department,
    方式: a.method,
    試験日: a.examDate,
    出願期間: a.applicationPeriod,
    科目: a.subjects,
    受験料: a.examFee,
    偏差値目安: a.deviationTarget,
  }));

  const prompt = [
    "あなたは大学受験の出願戦略アドバイザーです。以下の生徒について、出願プランを作成してください。",
    "生徒は**沖縄在住**で、本土受験には航空機での遠征と宿泊が必要です。受験のたびに沖縄を出るのではなく、**日程が近い受験はまとめて1回の遠征**にする前提で、遠征回数と宿泊数を最小化して費用を試算してください。",
    "",
    "## 費用試算の前提（管理者設定・参考値）",
    `- 沖縄⇔本土 往復航空券: 1遠征あたり約 ${airfareYen.toLocaleString()} 円`,
    `- 宿泊費: 1泊あたり約 ${lodgingYen.toLocaleString()} 円`,
    budgetYen ? `- 家庭の予算感: 約 ${budgetYen.toLocaleString()} 円（この範囲を意識）` : "- 家庭の予算感: 指定なし",
    "",
    "## 生徒プロフィール",
    JSON.stringify(profile, null, 2),
    "",
    "## 直近の模試結果（新しい順）",
    mockExams.length ? JSON.stringify(mockExams, null, 2) : "（模試データなし）",
    "",
    "## 参考: 収集済みの大学入試データ（無い項目は一般知識で補ってよいが、断定は避ける）",
    universityData.length ? JSON.stringify(universityData, null, 2) : "（収集済みデータなし。一般的な受験知識で提案する）",
    "",
    "受験料・試験日は上記データにあればそれを使い、無ければ一般的な相場・時期で概算してください（参考値と明記）。",
    "",
    "## 出願プランの組み立て方（必ず守る）",
    "1. **国公立を基本線**とする。`publicPlan` に **前期・中期・後期の3日程それぞれ**のプランを出す。",
    "   - 中期日程は実施校が公立大の一部のみと少ない。該当が無ければ**無理に埋めず空配列**にする。",
    "2. 私立は `privatePlan` として**国公立とは別枠**で出す。国公立の穴埋めではなく、独立した候補群として提示する。",
    "3. `tier`（挑戦 / 実力相応 / 安全）は **国公立と私立でそれぞれ独立に判定**する。国公立の中での安全校と、私立の中での安全校は別物として扱う。",
    "   - 国公立は各日程で挑戦・実力相応・安全から1校程度ずつ、私立は挑戦・実力相応・安全で各1〜2校を目安にする。",
    "4. 生徒の**出願思考**（国公立/私立の志向）と**志望校立地**の希望を必ず反映する。",
    `   - ${URBAN_DEFINITION_NOTE}`,
    "   - 「国公立のみ」なら私立は最小限（または空）に、「私立のみ」なら国公立は最小限に寄せる。ただし理由は summary で説明する。",
    "5. 試験日の衝突/近接と、費用総額（受験料＋移動＋宿泊）を必ず含める。日程が近い受験はまとめて1回の遠征にする。",
  ].join("\n");

  try {
    const started = Date.now();
    const { object, usage } = await generateObject({
      model,
      schema: strategySchema,
      prompt,
      providerOptions: {
        gateway: { user: session.user.id, tags: ["feature:admin-ai-test", "feature:application-strategy"] },
      },
    });

    return NextResponse.json({
      student: { id: student.id, name: student.user.name },
      model,
      assumptions: { budgetYen, airfareYen, lodgingYen, universityDataCount: universityData.length },
      result: object,
      usage: { inputTokens: usage?.inputTokens ?? null, outputTokens: usage?.outputTokens ?? null },
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
