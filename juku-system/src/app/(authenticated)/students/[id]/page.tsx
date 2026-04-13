import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import GoalsPanel from "./GoalsPanel";
import MeetingRecords from "@/components/MeetingRecords";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth(["admin", "teacher"]);
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: true,
      progressRecords: {
        include: { teacher: { include: { user: true } } },
        orderBy: { date: "desc" },
        take: 10,
      },
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
        orderBy: { date: "desc" },
        include: { teacher: { include: { user: true } } },
      },
      assignments: {
        include: { teacher: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student) notFound();

  // 期日超過かつ達成済の週次目標を自動で完了扱い（進捗は保存したまま、一覧から消える）
  const now = new Date();
  const autoCompleteTargets: string[] = [];
  for (const bg of student.bigGoals) {
    for (const w of bg.weeklyGoals) {
      if (w.status === "completed") continue;
      if (new Date(w.dueDate) >= now) continue;
      const done = w.progressRecords.reduce((s, r) => s + r.pagesCompleted, 0);
      if (done >= w.targetPages) autoCompleteTargets.push(w.id);
    }
  }
  if (autoCompleteTargets.length > 0) {
    await prisma.learningGoal.updateMany({
      where: { id: { in: autoCompleteTargets } },
      data: { status: "completed" },
    });
    for (const bg of student.bigGoals) {
      for (const w of bg.weeklyGoals) {
        if (autoCompleteTargets.includes(w.id)) w.status = "completed";
      }
    }
  }

  const examSubjects = student.examSubjects
    ? (JSON.parse(student.examSubjects) as string[])
    : [];
  const campusLabel = student.campus === "shuri" ? "首里校舎" : student.campus === "naha" ? "那覇校舎" : "";
  const trackLabel =
    student.track === "liberal_arts" ? "文系" :
    student.track === "science" ? "理系" :
    student.track === "both" ? "どちらも" : "";
  const genderLabel =
    student.gender === "male" ? "男性" :
    student.gender === "female" ? "女性" :
    student.gender === "other" ? "その他" : "";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">{student.user.name}</h1>
        <Link
          href={`/students/${id}/edit`}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
        >
          編集
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">基本情報</h2>
          <dl className="space-y-3">
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">メール</dt>
              <dd className="text-sm text-dark">{student.user.email}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">卒業年度</dt>
              <dd className="text-sm text-dark">{student.graduationYear}年度卒</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">高校名</dt>
              <dd className="text-sm text-dark">{student.schoolName}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">ステータス</dt>
              <dd className="text-sm text-dark">
                {student.status === "active" ? "在籍" : student.status === "inactive" ? "休塾" : "退塾"}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">入塾日</dt>
              <dd className="text-sm text-dark">
                {new Date(student.enrollmentDate).toLocaleDateString("ja-JP")}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">保護者名</dt>
              <dd className="text-sm text-dark">{student.parentName}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">保護者電話</dt>
              <dd className="text-sm text-dark">{student.parentPhone}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">保護者メール</dt>
              <dd className="text-sm text-dark">{student.parentEmail}</dd>
            </div>
            {student.furigana && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">ふりがな</dt>
                <dd className="text-sm text-dark">{student.furigana}</dd>
              </div>
            )}
            {genderLabel && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">性別</dt>
                <dd className="text-sm text-dark">{genderLabel}</dd>
              </div>
            )}
            {student.birthDate && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">生年月日</dt>
                <dd className="text-sm text-dark">
                  {new Date(student.birthDate).toLocaleDateString("ja-JP")}
                </dd>
              </div>
            )}
            {student.mobilePhone && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">携帯電話</dt>
                <dd className="text-sm text-dark">{student.mobilePhone}</dd>
              </div>
            )}
            {student.postalCode && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">郵便番号</dt>
                <dd className="text-sm text-dark">{student.postalCode}</dd>
              </div>
            )}
            {student.address && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">住所</dt>
                <dd className="text-sm text-dark">{student.address}</dd>
              </div>
            )}
            {campusLabel && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">入塾校舎</dt>
                <dd className="text-sm text-dark">{campusLabel}</dd>
              </div>
            )}
            {student.referrer && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">紹介者</dt>
                <dd className="text-sm text-dark">{student.referrer}</dd>
              </div>
            )}
            {trackLabel && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">文理</dt>
                <dd className="text-sm text-dark">{trackLabel}</dd>
              </div>
            )}
            {student.firstChoiceSchool && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">第1志望校</dt>
                <dd className="text-sm text-dark">{student.firstChoiceSchool}</dd>
              </div>
            )}
            {student.desiredFaculty && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">志望学部系統</dt>
                <dd className="text-sm text-dark">{student.desiredFaculty}</dd>
              </div>
            )}
            {examSubjects.length > 0 && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">受験科目</dt>
                <dd className="text-sm text-dark">{examSubjects.join(", ")}</dd>
              </div>
            )}
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">総合・推薦</dt>
              <dd className="text-sm text-dark">{student.considerRecommendation ? "検討あり" : "検討なし"}</dd>
            </div>
            {student.eikenPlan && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">英検受験予定</dt>
                <dd className="text-sm text-dark">{student.eikenPlan}</dd>
              </div>
            )}
            {student.notes && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">備考</dt>
                <dd className="text-sm text-dark">{student.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">担当講師</h2>
          {student.assignments.length === 0 ? (
            <p className="text-dark/60 text-sm">担当講師がいません</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {student.assignments.map((a) => (
                <li key={a.id} className="py-2">
                  <Link href={`/teachers/${a.teacher.id}`} className="text-sm hover:underline">
                    {a.teacher.user.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">最近の学習進捗</h2>
          {student.progressRecords.length === 0 ? (
            <p className="text-dark/60 text-sm">進捗記録がありません</p>
          ) : (
            <ul className="space-y-2">
              {student.progressRecords.map((record) => (
                <li key={record.id} className="p-2 bg-surface rounded">
                  <Link href={`/progress/${record.id}`} className="hover:underline">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">[{record.subject}] {record.material}</span>
                      <span className="text-xs text-dark/60">
                        {record.pagesCompleted}ページ
                      </span>
                    </div>
                    <p className="text-xs text-dark/60 mt-1">
                      {new Date(record.date).toLocaleDateString("ja-JP")} / {record.teacher.user.name}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Learning Goals */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <GoalsPanel studentId={id} initialBigGoals={student.bigGoals} />
        </div>

        {/* Meeting Records */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <MeetingRecords
            studentId={id}
            initialMeetings={student.meetings}
            currentUserName={session.user.name}
          />
        </div>
      </div>
    </div>
  );
}
