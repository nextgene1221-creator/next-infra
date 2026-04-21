import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import StudyScheduleEditor from "@/components/StudyScheduleEditor";
import Link from "next/link";

export default async function StudySchedulePage() {
  const session = await requireAuth();
  const role = session.user.role;

  if (role === "student") {
    const student = await prisma.student.findFirst({
      where: { userId: session.user.id },
      include: { studySchedule: { orderBy: { weekday: "asc" } } },
    });
    if (!student) {
      return <p className="text-dark/60">生徒情報が見つかりません</p>;
    }
    const examSubjects: string[] = student.examSubjects
      ? JSON.parse(student.examSubjects)
      : [];
    return (
      <div>
        <h1 className="text-2xl font-bold text-dark mb-2">学習スケジュール</h1>
        <p className="text-sm text-dark/60 mb-6">曜日ごとに科目と学習時間（10分単位）を設定してください。</p>
        <div className="bg-white rounded-lg shadow p-6">
          <StudyScheduleEditor
            studentId={student.id}
            initialSchedule={student.studySchedule.map((s) => ({
              weekday: s.weekday,
              hours: s.hours,
              slots: JSON.parse(s.slots || "[]"),
            }))}
            examSubjects={examSubjects}
          />
        </div>
      </div>
    );
  }

  // admin / teacher: 生徒一覧から選択
  const students = await prisma.student.findMany({
    where: { status: "active" },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">学習スケジュール（生徒選択）</h1>
      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {students.length === 0 ? (
          <p className="p-4 text-dark/60 text-sm">在籍生徒がいません</p>
        ) : (
          students.map((s) => (
            <Link
              key={s.id}
              href={`/students/${s.id}`}
              className="block p-4 hover:bg-surface text-sm"
            >
              <span className="font-medium text-primary">{s.user.name}</span>
              <span className="ml-2 text-dark/60">{s.schoolName}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
