import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { title, message, type, audience, userIds } = await req.json();
  if (!title || !message) {
    return NextResponse.json({ error: "タイトルと本文は必須です" }, { status: 400 });
  }
  const alertType = type || "general";

  let targetUserIds: string[] = [];
  if (audience === "all_students") {
    const users = await prisma.user.findMany({ where: { role: "student" }, select: { id: true } });
    targetUserIds = users.map((u) => u.id);
  } else if (audience === "all_teachers") {
    const users = await prisma.user.findMany({ where: { role: "teacher" }, select: { id: true } });
    targetUserIds = users.map((u) => u.id);
  } else if (audience === "all_users") {
    const users = await prisma.user.findMany({ where: { role: { in: ["student", "teacher"] } }, select: { id: true } });
    targetUserIds = users.map((u) => u.id);
  } else if (audience === "specific" && Array.isArray(userIds)) {
    targetUserIds = userIds;
  } else {
    return NextResponse.json({ error: "audience が不正です" }, { status: 400 });
  }

  if (targetUserIds.length === 0) {
    return NextResponse.json({ error: "対象ユーザーがいません" }, { status: 400 });
  }

  await prisma.alert.createMany({
    data: targetUserIds.map((uid) => ({
      userId: uid,
      type: alertType,
      title,
      message,
      isRead: false,
    })),
  });

  return NextResponse.json({ ok: true, sent: targetUserIds.length });
}
