import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllCampuses } from "@/lib/studyRoom";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campuses = await getAllCampuses();
  return NextResponse.json(campuses);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { code, label, closeTime, sortOrder } = await req.json();
  if (!code || !label) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }
  try {
    const c = await prisma.campus.create({
      data: {
        code: String(code).trim(),
        label: String(label).trim(),
        closeTime: closeTime || "21:00",
        sortOrder: Number(sortOrder) || 0,
      },
    });
    return NextResponse.json(c, { status: 201 });
  } catch {
    return NextResponse.json({ error: "同じコードの校舎が既に存在します" }, { status: 400 });
  }
}
