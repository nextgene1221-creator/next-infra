import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vapidPublicKey } from "@/lib/notify";

// プッシュ通知の端末登録（アプリ化 Phase 1 / 2026-08-24）。
// ブラウザ・PWA は Web Push の購読情報を、Capacitor のネイティブアプリは FCM トークンを送ってくる。
// 1 ユーザーが複数端末を持つ前提で、endpoint / fcmToken を一意キーに upsert する。

/** クライアントが購読を作るのに必要な VAPID 公開鍵を返す */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const devices = await prisma.pushDevice.count({ where: { userId: session.user.id } });
  return NextResponse.json({ vapidPublicKey: vapidPublicKey(), devices });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const platform = typeof body.platform === "string" ? body.platform : "web";
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) || "";

  if (platform === "web") {
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    const p256dh = typeof body.p256dh === "string" ? body.p256dh : "";
    const auth = typeof body.auth === "string" ? body.auth : "";
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "購読情報が不足しています" }, { status: 400 });
    }
    // 端末を買い替えた・別アカウントで入り直した場合に備え、endpoint の持ち主を上書きする
    const device = await prisma.pushDevice.upsert({
      where: { endpoint },
      create: { userId: session.user.id, platform: "web", endpoint, p256dh, auth, userAgent },
      update: { userId: session.user.id, p256dh, auth, userAgent, lastSeenAt: new Date() },
    });
    return NextResponse.json({ id: device.id });
  }

  if (platform === "android" || platform === "ios") {
    const fcmToken = typeof body.fcmToken === "string" ? body.fcmToken : "";
    if (!fcmToken) return NextResponse.json({ error: "fcmToken は必須です" }, { status: 400 });
    const device = await prisma.pushDevice.upsert({
      where: { fcmToken },
      create: { userId: session.user.id, platform, fcmToken, userAgent },
      update: { userId: session.user.id, platform, userAgent, lastSeenAt: new Date() },
    });
    return NextResponse.json({ id: device.id });
  }

  return NextResponse.json({ error: "platform は web / android / ios のみです" }, { status: 400 });
}

/** 通知を切る（購読解除） */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const fcmToken = typeof body.fcmToken === "string" ? body.fcmToken : "";

  await prisma.pushDevice.deleteMany({
    where: {
      userId: session.user.id,
      ...(endpoint ? { endpoint } : {}),
      ...(fcmToken ? { fcmToken } : {}),
    },
  });
  return NextResponse.json({ success: true });
}
