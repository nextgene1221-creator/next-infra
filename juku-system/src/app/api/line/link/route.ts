import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const CODE_TTL_MS = 10 * 60 * 1000; // 10分

// 連携コードを発行（本人セッション）
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = String(crypto.randomInt(100000, 1000000)); // 6桁
  const expires = new Date(Date.now() + CODE_TTL_MS);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lineLinkCode: code, lineLinkExpires: expires },
  });

  return NextResponse.json({
    code,
    expiresAt: expires.toISOString(),
    friendUrl: process.env.LINE_FRIEND_URL || "",
  });
}

// 連携解除（本人セッション）
export async function DELETE() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lineUserId: null, lineLinkCode: null, lineLinkExpires: null },
  });

  return NextResponse.json({ ok: true });
}
