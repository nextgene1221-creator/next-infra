import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { parseGradeLevels, normalizeExamName } from "@/lib/mockExamMaster";
import MockExamsMasterManager, {
  type MockExamView,
  type UnregisteredName,
} from "./MockExamsMasterManager";

export const dynamic = "force-dynamic";

// 模試マスタ（新規依頼 B-7）。模試「結果」は生徒詳細の模試パネル側で扱う。
// マスタの中身は開発側で流し込まず、**管理者がこの画面から登録する**（オーナー指示 2026-08-18）。
export default async function MockExamsMasterPage() {
  const session = await requireAuth(["admin", "teacher"]);

  const [exams, usedNames] = await Promise.all([
    prisma.mockExam.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { results: true } } },
    }),
    // 既存の模試結果で実際に使われている模試名と、その件数
    prisma.mockExamResult.groupBy({
      by: ["examName"],
      _count: { _all: true },
      orderBy: { examName: "asc" },
    }),
  ]);

  const initial: MockExamView[] = exams.map((e) => ({
    id: e.id,
    name: e.name,
    provider: e.provider,
    gradeLevels: parseGradeLevels(e.gradeLevels),
    sortOrder: e.sortOrder,
    active: e.active,
    usedCount: e._count.results,
  }));

  // マスタ未登録の模試名（＝管理者が登録を検討すべきもの）
  const registered = new Set(exams.map((e) => e.name));
  const unregistered: UnregisteredName[] = usedNames
    .filter((u) => u.examName.trim() && !registered.has(u.examName))
    .map((u) => ({ name: u.examName, count: u._count._all }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"));

  // 表記ゆれの候補（登録済み・未登録をまたいで、正規化キーが同じもの）
  const allNames = [...exams.map((e) => e.name), ...unregistered.map((u) => u.name)];
  const byKey = new Map<string, string[]>();
  for (const n of allNames) {
    const k = normalizeExamName(n);
    byKey.set(k, [...(byKey.get(k) ?? []), n]);
  }
  const variantGroups = Array.from(byKey.values()).filter((g) => g.length > 1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">模試マスタ</h1>
      <p className="text-sm text-dark/60 mb-4">
        模試結果を登録するときに選ぶ模試名を管理します。生徒ごとに名前を手入力すると表記ゆれ（「全統記述」「全統記述模試」など）で集計がずれるため、
        ここに登録したものから選ぶ運用にします。無効化した模試は新規の選択肢から外れますが、既存の記録はそのまま残ります。
      </p>
      <MockExamsMasterManager
        isAdmin={session.user.role === "admin"}
        initialExams={initial}
        unregistered={unregistered}
        variantGroups={variantGroups}
      />
    </div>
  );
}
