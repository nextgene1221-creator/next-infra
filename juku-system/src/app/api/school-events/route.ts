import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const schoolId = searchParams.get("schoolId");

  const events = await prisma.schoolEvent.findMany({
    where: {
      ...(schoolId ? { schoolId } : {}),
      ...(from || to
        ? {
            startDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: { school: true },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { schoolId, title, description, startDate, endDate, eventType } = await req.json();
  if (!schoolId || !title || !startDate) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }
  const event = await prisma.schoolEvent.create({
    data: {
      schoolId,
      title,
      description: description || "",
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      eventType: eventType || "その他",
    },
    include: { school: true },
  });
  return NextResponse.json(event, { status: 201 });
}
