// 「担当＝佐藤駿」への自動割当バグの後始末（デプロイ後に一度だけ実行）。
// findFirst()フォールバックにより管理者作成の記録が最初の講師(佐藤駿)へ誤って割り当てられていた。
// 該当記録の teacherId を null（担当なし）にする。
//
// ⚠️ 前提: teacher を null 安全に表示する新コードが**本番にデプロイ済み**であること。
//    旧コード(record.teacher.user.name をnull前提で参照)が動いている状態で実行すると本番が落ちる。
//
//   実行: npx tsx prisma/cleanup-sato-teacher.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const sato = await prisma.teacher.findFirst({ where: { user: { name: "佐藤駿" } }, include: { user: true } });
  if (!sato) {
    console.log("佐藤駿(講師) が見つかりません。処理を中止します。");
    return;
  }
  console.log("対象講師: 佐藤駿", sato.id, sato.user.email);

  const [pBefore, tBefore, mBefore] = await Promise.all([
    prisma.progressRecord.count({ where: { teacherId: sato.id } }),
    prisma.task.count({ where: { teacherId: sato.id } }),
    prisma.meeting.count({ where: { teacherId: sato.id } }),
  ]);
  console.log(`変更前の紐づき件数 → 進捗:${pBefore} タスク:${tBefore} 面談:${mBefore}`);

  const p = await prisma.progressRecord.updateMany({ where: { teacherId: sato.id }, data: { teacherId: null } });
  const t = await prisma.task.updateMany({ where: { teacherId: sato.id }, data: { teacherId: null } });
  const m = await prisma.meeting.updateMany({ where: { teacherId: sato.id }, data: { teacherId: null } });
  console.log(`null化した件数 → 進捗:${p.count} タスク:${t.count} 面談:${m.count}`);

  const after = await prisma.progressRecord.count({ where: { teacherId: sato.id } });
  console.log("処理後の佐藤駿ひもづき進捗:", after, after === 0 ? "✅ 完了" : "❌ 残あり");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
