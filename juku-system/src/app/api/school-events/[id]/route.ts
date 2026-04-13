import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { schoolId, title, description, startDate, endDate, eventType } = await req.json();
  const event = await prisma.schoolEvent.update({
    where: { id },
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
  return NextResponse.json(event);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.schoolEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
