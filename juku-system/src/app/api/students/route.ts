import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const students = await prisma.student.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const {
    name, email, password, graduationYear, schoolName,
    parentName, parentPhone, parentEmail, enrollmentDate, status, notes,
    furigana, gender, birthDate, mobilePhone, postalCode, address,
    referrer, track, firstChoiceSchool, desiredFaculty, examSubjects,
    considerRecommendation, eikenPlan, campus,
  } = body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に使用されています" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const student = await prisma.student.create({
    data: {
      graduationYear,
      schoolName,
      parentName,
      parentPhone,
      parentEmail,
      enrollmentDate: new Date(enrollmentDate),
      status: status || "active",
      notes: notes || "",
      furigana: furigana || "",
      gender: gender || "",
      birthDate: birthDate ? new Date(birthDate) : null,
      mobilePhone: mobilePhone || "",
      postalCode: postalCode || "",
      address: address || "",
      referrer: referrer || "",
      track: track || "",
      firstChoiceSchool: firstChoiceSchool || "",
      desiredFaculty: desiredFaculty || "",
      examSubjects: JSON.stringify(Array.isArray(examSubjects) ? examSubjects : []),
      considerRecommendation: !!considerRecommendation,
      eikenPlan: eikenPlan || "",
      campus: campus || "",
      user: {
        create: {
          email,
          passwordHash,
          role: "student",
          name,
        },
      },
    },
  });

  return NextResponse.json(student, { status: 201 });
}
