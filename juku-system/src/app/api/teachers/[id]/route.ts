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
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(teacher);
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
  const { name, email, subjects, employmentType, phone, status } = body;

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.update({
    where: { id: teacher.userId },
    data: { name, email },
  });

  const updated = await prisma.teacher.update({
    where: { id },
    data: {
      subjects: JSON.stringify(subjects),
      employmentType,
      phone,
      status,
    },
  });

  return NextResponse.json(updated);
}
