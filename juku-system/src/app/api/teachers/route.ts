import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name, email, subjects, employmentType, phone, status,
    universityFaculty, department, graduationYear, examSubjectsTaken,
    emergencyContact, universityClub, transportAllowanceYen,
  } = body;

  // 交通費（出勤1日あたり）。未指定なら DB 既定の 200 円。
  let transportYen: number | undefined;
  if (transportAllowanceYen !== undefined && transportAllowanceYen !== "") {
    const v = Math.floor(Number(transportAllowanceYen));
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "交通費は 0 円以上で入力してください" }, { status: 400 });
    }
    transportYen = v;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 400 });
  }

  // 新規登録時のパスワードは一律 password123 とし、本人にログイン後変更してもらう
  const passwordHash = await bcrypt.hash("password123", 10);

  const teacher = await prisma.teacher.create({
    data: {
      subjects: JSON.stringify(subjects),
      employmentType,
      phone,
      status: status || "active",
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
          ...(transportYen === undefined ? {} : { transportAllowanceYen: transportYen }),
        },
      },
    },
  });

  return NextResponse.json(teacher, { status: 201 });
}
