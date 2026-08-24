import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";

// 自分宛にテスト通知を送る。設定画面の「テスト送信」から呼ぶ。
// dedupeKey に時刻を入れて毎回送れるようにしている。

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const r = await notifyUser(session.user.id, {
    kind: "test",
    dedupeKey: `test:${session.user.id}:${Date.now()}`,
    title: "テスト通知",
    body: "この通知が見えていれば設定は完了です。",
    url: "/",
  });

  if (r.sent.length === 0) {
    return NextResponse.json(
      { error: "送信先の端末がないか、送信に失敗しました。", detail: r.errors },
      { status: 400 },
    );
  }
  return NextResponse.json({ sent: r.sent, errors: r.errors });
}
