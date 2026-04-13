import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { studentId, subject, materialName, targetPages, startDate, dueDate, notes } = body;
  if (!studentId || !subject || !materialName || !targetPages || !startDate || !dueDate) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const bigGoal = await prisma.bigGoal.create({
    data: {
      studentId,
      subject,
      materialName,
      targetPages,
      startDate: new Date(startDate),
      dueDate: new Date(dueDate),
      status: "in_progress",
      notes: notes || "",
    },
  });

  return NextResponse.json(bigGoal, { status: 201 });
}
