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
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { subject, materialName, targetPages, dueDate, notes, status } = body;

  const goal = await prisma.learningGoal.update({
    where: { id },
    data: {
      subject,
      materialName,
      targetPages,
      dueDate: new Date(dueDate),
      status: status || "in_progress",
      notes: notes || "",
    },
  });

  return NextResponse.json(goal);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  // 紐づく進捗の goalId を null に
  await prisma.progressRecord.updateMany({
    where: { goalId: id },
    data: { goalId: null },
  });

  await prisma.learningGoal.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
