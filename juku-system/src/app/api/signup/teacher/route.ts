// 一時的な講師サインアップ API（公開、認証不要）。導入完了後に削除する想定。
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name, email, subjects, employmentType, phone,
    universityFaculty, department, graduationYear, examSubjectsTaken,
    emergencyContact, universityClub,
  } = body;

  if (!name || !email || !phone) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.teacher.create({
    data: {
      subjects: JSON.stringify(Array.isArray(subjects) ? subjects : []),
      employmentType: employmentType || "part_time",
      phone,
      status: "active",
      universityFaculty: universityFaculty || "",
      department: department || "",
      graduationYear: graduationYear ? Number(graduationYear) : null,
      examSubjectsTaken: JSON.stringify(Array.isArray(examSubjectsTaken) ? examSubjectsTaken : []),
      emergencyContact: emergencyContact || "",
      universityClub: universityClub || "",
      user: {
        create: {
          email,
          passwordHash,
          role: "teacher",
          name,
        },
      },
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
