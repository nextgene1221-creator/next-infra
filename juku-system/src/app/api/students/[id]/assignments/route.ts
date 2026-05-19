import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 生徒側からの担当講師管理。teacher側の /api/teachers/[id]/assignments と対称。
// 認可: admin はすべて操作可、teacher は自身の担当付け外しのみ可。

async function authorizeBase() {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false as const, status: 401, error: "Unauthorized", session: null };
  if (session.user.role === "student") return { ok: false as const, status: 403, error: "Forbidden", session };
  return { ok: true as const, session };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeBase();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const assignments = await prisma.studentAssignment.findMany({
    where: { studentId: id },
    include: { teacher: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(assignments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await authorizeBase();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { teacherId } = await req.json();
  if (!teacherId) return NextResponse.json({ error: "teacherId required" }, { status: 400 });

  if (auth.session.user.role === "teacher") {
    const me = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!me || me.userId !== auth.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const assignment = await prisma.studentAssignment.create({
      data: { teacherId, studentId: id },
      include: { teacher: { include: { user: true } } },
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "既に割り当て済みです" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await authorizeBase();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");
  if (!teacherId) return NextResponse.json({ error: "teacherId required" }, { status: 400 });

  if (auth.session.user.role === "teacher") {
    const me = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!me || me.userId !== auth.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.studentAssignment.deleteMany({
    where: { teacherId, studentId: id },
  });
  return NextResponse.json({ ok: true });
}
