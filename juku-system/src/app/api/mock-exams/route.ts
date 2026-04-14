import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    studentId, examName, examDate, gradeLevel,
    overallDeviation, overallScore, schoolRank, judgment, subjects, notes,
  } = body;
  if (!studentId || !examName || !examDate || !gradeLevel) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const result = await prisma.mockExamResult.create({
    data: {
      studentId,
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
  return NextResponse.json(result, { status: 201 });
}
