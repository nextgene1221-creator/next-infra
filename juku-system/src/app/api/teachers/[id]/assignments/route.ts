import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function authorize(teacherId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false as const, status: 401, error: "Unauthorized" };
  if (session.user.role === "admin") return { ok: true as const };
  if (session.user.role === "teacher") {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (teacher && teacher.userId === session.user.id) return { ok: true as const };
  }
  return { ok: false as const, status: 403, error: "Forbidden" };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authorize(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const assignments = await prisma.studentAssignment.findMany({
    where: { teacherId: id },
    include: { student: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(assignments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authorize(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { studentId } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  try {
    const assignment = await prisma.studentAssignment.create({
      data: { teacherId: id, studentId },
      include: { student: { include: { user: true } } },
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "既に割り当て済みです" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authorize(id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  await prisma.studentAssignment.deleteMany({
    where: { teacherId: id, studentId },
  });
  return NextResponse.json({ ok: true });
}
