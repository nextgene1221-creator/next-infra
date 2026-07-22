import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crawlAndStore } from "@/lib/universityCrawl";

export const maxDuration = 60;

// 大学入試情報の定期再クロール（依頼⑤の"追跡"）。GitHub Actions から週次で呼ぶ想定。
// 1回の呼び出しで「最も長く再クロールされていないURLを1件」だけ処理し60s以内に収める。
// GitHub Actions 側で done=true になるまでループすることで、保存済みURLを1巡する。
// 変更検知時は管理者へアラート。コストを抑えるため安価な gpt-4o-mini を使用。

const CRON_MODEL = "openai/gpt-4o-mini";
const STALE_HOURS = 12; // これより新しく再クロール済みのURLは今回の巡回では対象外

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get("token") === secret) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET 未設定" }, { status: 500 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staleBefore = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000);

  // sourceUrl があり、まだ今回巡回で再クロールしていない（古い or 未クロール）ものを1件
  const target = await prisma.universityAdmission.findFirst({
    where: {
      sourceUrl: { not: "" },
      OR: [{ lastCrawledAt: null }, { lastCrawledAt: { lt: staleBefore } }],
    },
    orderBy: [{ lastCrawledAt: { sort: "asc", nulls: "first" } }],
    include: { university: { select: { name: true } } },
  });

  if (!target) {
    return NextResponse.json({ done: true, message: "再クロール対象なし（すべて最新）" });
  }

  const result = await crawlAndStore({
    sourceUrl: target.sourceUrl,
    universityName: target.university.name,
    userId: "cron",
    model: CRON_MODEL,
  });

  // 巡回の進行保証: このURLの全 admission を最新化する（ページから再抽出されなかった
  // 既存レコードも含め lastCrawledAt を更新）。これで同じURLを無限に選ばず次へ進む。
  await prisma.universityAdmission.updateMany({
    where: { sourceUrl: target.sourceUrl },
    data: { lastCrawledAt: new Date() },
  });

  if (!result.ok) {
    return NextResponse.json({
      done: false,
      processed: { university: target.university.name, sourceUrl: target.sourceUrl },
      error: result.error,
    });
  }

  // 変更検知（新規 or 更新）があれば管理者へアラート
  let alertsCreated = 0;
  if (result.created > 0 || result.updated > 0) {
    const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } });
    const changeLines = result.changes
      .filter((c) => c.type !== "変更なし")
      .map((c) => `・[${c.type}] ${c.faculty || "(学部不明)"} ${c.method}${c.summary ? ` — ${c.summary}` : ""}`)
      .join("\n");
    const message = `${result.university.name} の入試情報に変更を検知しました（新規${result.created}/更新${result.updated}）。\n${changeLines}\n出所: ${target.sourceUrl}`;
    for (const admin of admins) {
      await prisma.alert.create({
        data: {
          userId: admin.id,
          type: "general",
          title: `大学入試情報の変更: ${result.university.name}`,
          message,
        },
      });
      alertsCreated++;
    }
  }

  return NextResponse.json({
    done: false,
    processed: {
      university: result.university.name,
      sourceUrl: target.sourceUrl,
      created: result.created,
      updated: result.updated,
      unchanged: result.unchanged,
    },
    alertsCreated,
  });
}
