import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(student);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const {
    name, email, graduationYear, schoolName,
    parentName, parentPhone, parentEmail, enrollmentDate, status, notes,
    furigana, gender, birthDate, mobilePhone, postalCode, address,
    referrer, track, firstChoiceSchool, desiredFaculty, examSubjects,
    considerRecommendation, eikenPlan, campus,
  } = body;

  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.update({
    where: { id: student.userId },
    data: { name, email },
  });

  const updated = await prisma.student.update({
    where: { id },
    data: {
      graduationYear,
      schoolName,
      parentName,
      parentPhone,
      parentEmail,
      enrollmentDate: new Date(enrollmentDate),
      status,
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
    },
  });

  return NextResponse.json(updated);
}
