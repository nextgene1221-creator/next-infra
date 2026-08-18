// 模試マスタの初期投入＋既存データの紐付け（新規依頼 B-7 / 確認事項 (a)）。
//
// 方針:
//  1. 既存 MockExamResult.examName の distinct 一覧を抽出し、マスタに未登録のものを作成する
//  2. examName が**完全一致**するマスタにだけ mockExamId を自動で紐付ける
//  3. 表記ゆれ（似ているが一致しない名前）は**自動で寄せない**。一覧を出して人間が判断する
//
// 実行: npx tsx prisma/seed-mock-exams.ts
// ※ 本番 DB への実行は playbook §3 によりオーナー判断送り。

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

// 表記ゆれ検出用: 記号・空白・「模試」の有無を落とした正規化キー
function normalizeKey(name: string): string {
  return name
    .replace(/[\s　]/g, "")
    .replace(/[・,，.．\-−―ー]/g, "")
    .replace(/模試$/, "")
    .toLowerCase();
}

async function main() {
  const results = await prisma.mockExamResult.findMany({
    select: { id: true, examName: true, mockExamId: true },
  });
  const names = Array.from(new Set(results.map((r) => r.examName.trim()).filter(Boolean))).sort();

  console.log(`既存の模試結果: ${results.length} 件 / 異なる模試名: ${names.length} 種類`);

  // 1) マスタ作成
  let created = 0;
  for (const [i, name] of names.entries()) {
    const existing = await prisma.mockExam.findUnique({ where: { name } });
    if (existing) continue;
    await prisma.mockExam.create({ data: { name, sortOrder: i } });
    created++;
  }
  console.log(`マスタ新規作成: ${created} 件`);

  // 2) 完全一致のみ自動紐付け
  const masters = await prisma.mockExam.findMany({ select: { id: true, name: true } });
  const byName = new Map(masters.map((m) => [m.name, m.id]));
  let linked = 0;
  for (const r of results) {
    if (r.mockExamId) continue;
    const id = byName.get(r.examName.trim());
    if (!id) continue;
    await prisma.mockExamResult.update({ where: { id: r.id }, data: { mockExamId: id } });
    linked++;
  }
  console.log(`完全一致で自動紐付け: ${linked} 件`);

  // 3) 表記ゆれ候補の提示（自動では寄せない）
  const groups = new Map<string, string[]>();
  for (const name of names) {
    const key = normalizeKey(name);
    groups.set(key, [...(groups.get(key) || []), name]);
  }
  const suspicious = Array.from(groups.values()).filter((g) => g.length > 1);
  if (suspicious.length === 0) {
    console.log("表記ゆれの候補はありませんでした。");
  } else {
    console.log("\n⚠ 表記ゆれの可能性がある模試名（自動では統合していません。模試マスタ画面で整理してください）:");
    for (const g of suspicious) console.log("  - " + g.join(" / "));
  }

  const unlinked = await prisma.mockExamResult.count({ where: { mockExamId: null } });
  console.log(`\n未紐付けの模試結果: ${unlinked} 件`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
