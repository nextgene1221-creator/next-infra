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
  const { subject, materialName, targetPages, startDate, dueDate, notes, status } = body;

  const bigGoal = await prisma.bigGoal.update({
    where: { id },
    data: {
      subject,
      materialName,
      targetPages,
      startDate: new Date(startDate),
      dueDate: new Date(dueDate),
      status: status || "in_progress",
      notes: notes || "",
    },
  });

  return NextResponse.json(bigGoal);
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

  await prisma.learningGoal.updateMany({
    where: { bigGoalId: id },
    data: { bigGoalId: null },
  });
  await prisma.bigGoal.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
