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
  const body = await req.json();
  const {
    examName, examDate, gradeLevel,
    overallDeviation, overallScore, schoolRank, judgment, subjects, notes,
  } = body;

  const result = await prisma.mockExamResult.update({
    where: { id },
    data: {
      examName,
      examDate: new Date(examDate),
      gradeLevel,
      overallDeviation: overallDeviation !== null && overallDeviation !== undefined ? Number(overallDeviation) : null,
      overallScore: overallScore !== null && overallScore !== undefined ? Number(overallScore) : null,
      schoolRank: schoolRank !== null && schoolRank !== undefined ? Number(schoolRank) : null,
      judgment: judgment || "",
      subjects: JSON.stringify(Array.isArray(subjects) ? subjects : []),
      notes: notes || "",
    },
  });
  return NextResponse.json(result);
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
  await prisma.mockExamResult.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
