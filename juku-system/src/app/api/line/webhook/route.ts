import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineSignature, replyText } from "@/lib/line";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: { events?: LineEvent[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  for (const event of body.events ?? []) {
    try {
      if (event.type === "follow") {
        await handleFollow(event);
      } else if (event.type === "message" && event.message?.type === "text") {
        await handleTextMessage(event);
      }
    } catch (e) {
      // 1イベントの失敗で全体を止めない（LINEは200を期待）
      console.error("LINE webhook event error:", (e as Error).message);
    }
  }

  return NextResponse.json({ ok: true });
}

// 友だち追加時の案内
async function handleFollow(event: LineEvent) {
  if (!event.replyToken) return;
  await replyText(
    event.replyToken,
    "友だち追加ありがとうございます！\n通知を受け取るには、システムの「プロフィール」画面に表示された6桁の連携コードをこのトークに送信してください。"
  );
}

// 6桁コードによるアカウント連携
async function handleTextMessage(event: LineEvent) {
  const lineUserId = event.source?.userId;
  const text = (event.message?.text || "").trim();
  if (!lineUserId) return;

  const code = text.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) {
    if (event.replyToken) {
      await replyText(
        event.replyToken,
        "連携コードは6桁の数字です。システムの「プロフィール」画面で発行したコードを送信してください。"
      );
    }
    return;
  }

  const user = await prisma.user.findFirst({
    where: { lineLinkCode: code, lineLinkExpires: { gt: new Date() } },
  });

  if (!user) {
    if (event.replyToken) {
      await replyText(
        event.replyToken,
        "コードが無効か、有効期限が切れています。プロフィール画面でコードを再発行してからもう一度お試しください。"
      );
    }
    return;
  }

  // この LINE userId が既に別ユーザーに連携済みなら弾く
  const existing = await prisma.user.findUnique({ where: { lineUserId } });
  if (existing && existing.id !== user.id) {
    if (event.replyToken) {
      await replyText(
        event.replyToken,
        "このLINEアカウントは既に別のユーザーに連携されています。運営にお問い合わせください。"
      );
    }
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lineUserId, lineLinkCode: null, lineLinkExpires: null },
  });

  if (event.replyToken) {
    await replyText(
      event.replyToken,
      `連携が完了しました！${user.name} さんとして通知をお届けします🎉`
    );
  }
}
