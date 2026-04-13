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
    name, email, password, subjects, employmentType, phone, status,
    universityFaculty, department, graduationYear, examSubjectsTaken,
    emergencyContact, universityClub,
  } = body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

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
        },
      },
    },
  });

  return NextResponse.json(teacher, { status: 201 });
}
