import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { crawlAndStore } from "@/lib/universityCrawl";

export const maxDuration = 60; // fetch + AI抽出で時間がかかるため延長（Hobby上限60s）

// 大学HPをクロールして入試情報を収集・保存する（依頼⑤）。admin限定・手動実行。
// 実処理は lib/universityCrawl の crawlAndStore（定期再クロールと共用）。

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await crawlAndStore({
    sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "",
    universityName: typeof body.universityName === "string" ? body.universityName : "",
    prefecture: typeof body.prefecture === "string" ? body.prefecture : "",
    category: typeof body.category === "string" ? body.category : "",
    userId: session.user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    university: result.university,
    sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "",
    extractedCount: result.extractedCount,
    created: result.created,
    updated: result.updated,
    unchanged: result.unchanged,
    changes: result.changes,
  });
}
