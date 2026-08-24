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
  // 編集画面（管理者専用）からのみ使う。パスワードハッシュを含む user を返すため管理者に限定する。
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, transportAllowanceYen: true },
      },
    },
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
  const {
    name, email, subjects, employmentType, phone, status,
    universityFaculty, department, graduationYear, examSubjectsTaken,
    emergencyContact, universityClub, transportAllowanceYen,
  } = body;

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 交通費（出勤1日あたり）は User 側。未指定なら現状維持、負値・非数は弾く。
  let transportYen: number | undefined;
  if (transportAllowanceYen !== undefined && transportAllowanceYen !== "") {
    const v = Math.floor(Number(transportAllowanceYen));
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "交通費は 0 円以上で入力してください" }, { status: 400 });
    }
    transportYen = v;
  }

  await prisma.user.update({
    where: { id: teacher.userId },
    data: { name, email, ...(transportYen === undefined ? {} : { transportAllowanceYen: transportYen }) },
  });

  const updated = await prisma.teacher.update({
    where: { id },
    data: {
      subjects: JSON.stringify(subjects),
      employmentType,
      phone,
      status,
      universityFaculty: universityFaculty || "",
      department: department || "",
      graduationYear: graduationYear ? Number(graduationYear) : null,
      examSubjectsTaken: JSON.stringify(Array.isArray(examSubjectsTaken) ? examSubjectsTaken : []),
      emergencyContact: emergencyContact || "",
      universityClub: universityClub || "",
    },
  });

  return NextResponse.json(updated);
}
