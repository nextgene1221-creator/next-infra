import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import SeminarManager from "./SeminarManager";

export default async function SeminarPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requireAuth();
  const role = session.user.role;
  const params = await searchParams;

  const units = await prisma.printUnit.findMany({
    orderBy: [{ subject: "asc" }, { name: "asc" }],
  });

  // 生徒の場合は自分のID
  let currentStudentId: string | undefined;
  let examSubjects: string[] = [];
  if (role === "student") {
    const student = await prisma.student.findFirst({ where: { userId: session.user.id } });
    if (student) {
      currentStudentId = student.id;
      examSubjects = JSON.parse(student.examSubjects || "[]");
    }
  }

  // 管理者/講師の場合は生徒一覧
  let students: { id: string; name: string }[] = [];
  const selectedStudentId = role === "student" ? currentStudentId : params.studentId;
  if (role !== "student") {
    const raw = await prisma.student.findMany({
      where: { status: "active" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    });
    students = raw.map((s) => ({ id: s.id, name: s.user.name }));
    // 選択された生徒の受験科目を取得
    if (selectedStudentId) {
      const student = raw.find((s) => s.id === selectedStudentId);
      if (student) {
        const fullStudent = await prisma.student.findUnique({ where: { id: selectedStudentId } });
        if (fullStudent) examSubjects = JSON.parse(fullStudent.examSubjects || "[]");
      }
    }
  }

  // 選択された生徒のプリント情報
  let studentPrints: {
    id: string;
    printUnitId: string;
    printNo: number;
    scheduledDate: string;
    completedDate: string | null;
  }[] = [];
  if (selectedStudentId) {
    const raw = await prisma.studentPrint.findMany({
      where: { studentId: selectedStudentId },
      orderBy: [{ printUnit: { subject: "asc" } }, { printUnit: { name: "asc" } }, { printNo: "asc" }],
    });
    studentPrints = raw.map((p) => ({
      id: p.id,
      printUnitId: p.printUnitId,
      printNo: p.printNo,
      scheduledDate: p.scheduledDate.toISOString(),
      completedDate: p.completedDate?.toISOString() || null,
    }));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">ゼミ管理</h1>
      <SeminarManager
        role={role}
        units={units.map((u) => ({ id: u.id, subject: u.subject, name: u.name, printCount: u.printCount }))}
        students={students}
        selectedStudentId={selectedStudentId}
        studentPrints={studentPrints}
        examSubjects={examSubjects}
      />
    </div>
  );
}
