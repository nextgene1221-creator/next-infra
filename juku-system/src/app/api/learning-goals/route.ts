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
  const { studentId, subject, materialName, targetPages, dueDate, notes } = body;

  const goal = await prisma.learningGoal.create({
    data: {
      studentId,
      subject,
      materialName,
      targetPages,
      dueDate: new Date(dueDate),
      status: "in_progress",
      notes: notes || "",
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
