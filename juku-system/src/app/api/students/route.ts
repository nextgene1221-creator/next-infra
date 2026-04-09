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
    name, email, password, graduationYear, schoolName,
    parentName, parentPhone, parentEmail, enrollmentDate, status, notes,
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
