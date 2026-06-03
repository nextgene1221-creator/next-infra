import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// weekdays を JSON 文字列 "[0..6]" に正規化（0=日..6=土、重複除去・昇順、不正値は除外）
function normalizeWeekdays(input: unknown): string {
  if (!Array.isArray(input)) return "[]";
  const set = new Set<number>();
  for (const v of input) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0 && n <= 6) set.add(n);
  }
  return JSON.stringify([...set].sort((a, b) => a - b));
}

async function ensureTeacherCanModify(
  routineId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const routine = await prisma.routineTask.findUnique({ where: { id: routineId } });
  if (!routine) return { ok: false, status: 404, error: "Not found" };
  const teacher = await prisma.teacher.findFirst({ where: { userId } });
  if (!teacher || routine.teacherId !== teacher.id) {
    return { ok: false, status: 403, error: "他の講師のルーティンタスクは操作できません" };
  }
  return { ok: true };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  if (session.user.role === "teacher") {
    const check = await ensureTeacherCanModify(id, session.user.id);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
  }

  const body = await req.json();
  const { studentId, title, description, type, weekdays } = body;

  const routine = await prisma.routineTask.update({
    where: { id },
    data: {
      studentId: studentId || null,
      // subject は廃止 (既存値はそのまま)
      title,
      description: description || "",
      type: type || "通常",
      weekdays: normalizeWeekdays(weekdays),
    },
  });

  return NextResponse.json(routine);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  if (session.user.role === "teacher") {
    const check = await ensureTeacherCanModify(id, session.user.id);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
  }

  await prisma.routineTask.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
