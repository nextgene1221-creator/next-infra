import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReportView from "./ReportView";

const MS_DAY = 24 * 60 * 60 * 1000;

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth(["admin", "teacher"]);
  const { id } = await params;

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * MS_DAY);

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: true,
      bigGoals: {
        orderBy: { dueDate: "asc" },
        include: {
          weeklyGoals: {
            orderBy: { dueDate: "asc" },
            include: { progressRecords: { select: { pagesCompleted: true, date: true } } },
          },
        },
      },
      meetings: {
        where: { date: { gte: monthAgo }, parentComment: { not: "" } },
        orderBy: { date: "desc" },
        include: { teacher: { include: { user: true } } },
      },
      mockExamResults: { orderBy: { examDate: "asc" } },
      assignments: { include: { teacher: { include: { user: true } } } },
    },
  });
  if (!student) notFound();

  // 直近1ヶ月分の週次目標（開始日 or 期日が monthAgo 以降）
  const recentWeekly = student.bigGoals.flatMap((bg) =>
    bg.weeklyGoals
      .filter((w) => {
        const ref = new Date(w.startDate || w.dueDate).getTime();
        return ref >= monthAgo.getTime();
      })
      .map((w) => ({
        bigGoalTitle: `[${bg.subject}] ${bg.materialName}`,
        id: w.id,
        subject: w.subject,
        materialName: w.materialName,
        startDate: w.startDate,
        dueDate: w.dueDate,
        targetPages: w.targetPages,
        done: w.progressRecords.reduce((s, r) => s + r.pagesCompleted, 0),
        status: w.status,
      }))
  );

  // 大目標進捗サマリー
  const bigGoalsSummary = student.bigGoals.map((bg) => {
    const start = new Date(bg.startDate).getTime();
    const end = new Date(bg.dueDate).getTime();
    const totalDays = Math.max(1, (end - start) / MS_DAY);
    const pagesPerDay = bg.targetPages / totalDays;
    const elapsed = Math.max(0, Math.min(totalDays, (now.getTime() - start) / MS_DAY));
    const expected = Math.round(pagesPerDay * elapsed);
    const actual = bg.weeklyGoals.reduce(
      (sum, w) => sum + w.progressRecords.reduce((a, r) => a + r.pagesCompleted, 0),
      0
    );
    return {
      id: bg.id,
      subject: bg.subject,
      materialName: bg.materialName,
      startDate: bg.startDate.toISOString(),
      dueDate: bg.dueDate.toISOString(),
      targetPages: bg.targetPages,
      expected,
      actual,
    };
  });

  const exams = student.mockExamResults.map((r) => ({
    id: r.id,
    examName: r.examName,
    examDate: r.examDate.toISOString(),
    gradeLevel: r.gradeLevel,
    overallDeviation: r.overallDeviation,
    schoolRank: r.schoolRank,
    judgment: r.judgment,
    subjects: JSON.parse(r.subjects) as { subject: string; deviation: number | null; score: number | null }[],
  }));

  const comments = student.meetings.map((m) => ({
    id: m.id,
    date: m.date.toISOString(),
    teacherName: m.teacher.user.name,
    parentComment: m.parentComment,
  }));

  const assignedTeachers = student.assignments.map((a) => a.teacher.user.name);

  return (
    <ReportView
      student={{
        name: student.user.name,
        schoolName: student.schoolName,
        graduationYear: student.graduationYear,
        firstChoiceSchool: student.firstChoiceSchool,
        campus: student.campus,
      }}
      reportFrom={monthAgo.toISOString()}
      reportTo={now.toISOString()}
      bigGoals={bigGoalsSummary}
      weeklyGoals={recentWeekly.map((w) => ({
        ...w,
        startDate: w.startDate ? w.startDate.toISOString() : null,
        dueDate: w.dueDate.toISOString(),
      }))}
      exams={exams}
      comments={comments}
      assignedTeachers={assignedTeachers}
    />
  );
}
