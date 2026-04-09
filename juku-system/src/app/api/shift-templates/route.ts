import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");

  if (teacherId) {
    const template = await prisma.shiftTemplate.findUnique({
      where: { teacherId },
    });
    return NextResponse.json(template);
  }

  const templates = await prisma.shiftTemplate.findMany({
    include: { teacher: { include: { user: true } } },
    orderBy: { teacher: { user: { name: "asc" } } },
  });
  return NextResponse.json(templates);
}

// upsert: 1 講師につき1テンプレート
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { teacherId, weekdays, startTime, endTime } = body;

  const template = await prisma.shiftTemplate.upsert({
    where: { teacherId },
    create: { teacherId, weekdays, startTime, endTime },
    update: { weekdays, startTime, endTime },
  });

  return NextResponse.json(template);
}
