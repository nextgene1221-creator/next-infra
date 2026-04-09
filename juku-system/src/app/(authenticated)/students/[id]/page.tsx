import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import LearningGoals from "./LearningGoals";
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
      learningGoals: {
        orderBy: { dueDate: "asc" },
        include: { progressRecords: { select: { pagesCompleted: true } } },
      },
      meetings: {
        orderBy: { date: "desc" },
        include: { teacher: { include: { user: true } } },
      },
    },
  });

  if (!student) notFound();

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
            {student.notes && (
              <div className="flex">
                <dt className="w-32 text-sm text-dark/60">備考</dt>
                <dd className="text-sm text-dark">{student.notes}</dd>
              </div>
            )}
          </dl>
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
          <LearningGoals studentId={id} initialGoals={student.learningGoals} />
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
