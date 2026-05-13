import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RESET_PASSWORD = "password123";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  }

  // admin: 全 user 対象。teacher: 対象が student の場合のみ可。それ以外は 403
  const role = session.user.role;
  const allowed =
    role === "admin" || (role === "teacher" && target.role === "student");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(RESET_PASSWORD, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  return NextResponse.json({
    success: true,
    resetPassword: RESET_PASSWORD,
    userName: target.name,
  });
}
