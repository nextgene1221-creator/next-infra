"use client";

import { useState } from "react";
import StudyScheduleEditor from "@/components/StudyScheduleEditor";
import ClassDayEditor, { type ClassDayItem } from "@/components/ClassDayEditor";
import SeminarManager from "@/app/(authenticated)/seminar/SeminarManager";
import MeetingSheetForm from "@/components/MeetingSheetForm";
import { type SheetAnswers } from "@/lib/meetingSheet";

export type GoalSummary = {
  subject: string;
  materialName: string;
  targetPages: number;
  done: number;
  dueDate: string;
  status: string;
};
export type ProgressRow = {
  date: string;
  subject: string;
  material: string;
  topic: string;
  pagesCompleted: number;
  teacherName: string;
};
type SeminarUnit = { id: string; subject: string; name: string; printCount: number; level: string };
type SeminarPrint = {
  id: string;
  printUnitId: string;
  printNo: number;
  scheduledDate: string;
  completedDate: string | null;
};

export type LatestSheet = {
  id: string;
  status: string;
  answers: SheetAnswers;
  studentName: string;
  meetingDateLabel: string;
  submittedAtLabel: string;
};

export type MeetingPlanData = {
  role: string;
  examSubjects: string[];
  studySchedule: { weekday: number; hours: number; slots: { subject: string; minutes: number }[] }[];
  classDays: ClassDayItem[];
  teachers: { id: string; name: string }[];
  goals: GoalSummary[];
  recentProgress: ProgressRow[];
  seminarUnits: SeminarUnit[];
  seminarPrints: SeminarPrint[];
  latestSheet: LatestSheet | null;
};

const TABS = [
  { key: "progress", label: "学習進捗" },
  { key: "sheet", label: "週次シート" },
  { key: "schedule", label: "次週の学習予定" },
  { key: "classDays", label: "授業日" },
  { key: "seminar", label: "ゼミ予定" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function MeetingPlanModal({
  studentId,
  data,
  onClose,
}: {
  studentId: string;
  data: MeetingPlanData;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("progress");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-dark">面談時の予定設定</h2>
          <button onClick={onClose} className="text-dark/60 hover:text-dark text-xl leading-none">✕</button>
        </div>

        {/* タブ */}
        <div className="flex gap-1 px-4 pt-3 border-b border-gray-100 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-sm rounded-t-md transition-colors ${
                tab === t.key
                  ? "bg-primary text-white font-medium"
                  : "text-charcoal hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 本文 */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "progress" && <ProgressView goals={data.goals} progress={data.recentProgress} />}

          {tab === "sheet" && (
            data.latestSheet ? (
              <div className="space-y-2">
                <p className="text-xs text-dark/60">
                  状態: {data.latestSheet.status === "submitted" ? "提出済" : "下書き"}
                  {data.latestSheet.submittedAtLabel && `（提出: ${data.latestSheet.submittedAtLabel}）`}
                  ／ 閲覧のみ
                </p>
                <MeetingSheetForm
                  readOnly
                  sheetId={data.latestSheet.id}
                  studentName={data.latestSheet.studentName}
                  meetingDateLabel={data.latestSheet.meetingDateLabel}
                  initialStatus={data.latestSheet.status}
                  initialAnswers={data.latestSheet.answers}
                />
              </div>
            ) : (
              <p className="text-sm text-dark/50">週次面談シートはまだ提出されていません。</p>
            )
          )}

          {tab === "schedule" && (
            <div>
              <p className="text-xs text-dark/60 mb-3">
                次週の学習予定（自習時間）を編集します。曜日ごとの科目別時間を設定してください。
              </p>
              <StudyScheduleEditor
                studentId={studentId}
                initialSchedule={data.studySchedule}
                examSubjects={data.examSubjects}
              />
            </div>
          )}

          {tab === "classDays" && (
            <ClassDayEditor
              studentId={studentId}
              initialClassDays={data.classDays}
              teachers={data.teachers}
            />
          )}

          {tab === "seminar" && (
            <SeminarManager
              embedded
              role={data.role}
              units={data.seminarUnits}
              students={[]}
              selectedStudentId={studentId}
              studentPrints={data.seminarPrints}
              examSubjects={data.examSubjects}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressView({ goals, progress }: { goals: GoalSummary[]; progress: ProgressRow[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-dark mb-2">大目標 / 指標</h3>
        {goals.length === 0 ? (
          <p className="text-xs text-dark/50">大目標が登録されていません</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-dark/60 border-b border-gray-100">
                <th className="text-left py-1 pr-2">科目</th>
                <th className="text-left py-1 pr-2">教材</th>
                <th className="text-right py-1 pr-2">進捗</th>
                <th className="text-right py-1 pr-2">目標</th>
                <th className="text-right py-1">期日</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g, i) => {
                const pct = g.targetPages > 0 ? Math.round((g.done / g.targetPages) * 100) : 0;
                return (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1 pr-2">{g.subject}</td>
                    <td className="py-1 pr-2">{g.materialName}</td>
                    <td className="py-1 pr-2 text-right">{g.done}p ({pct}%)</td>
                    <td className="py-1 pr-2 text-right">{g.targetPages}p</td>
                    <td className="py-1 text-right">{new Date(g.dueDate).toLocaleDateString("ja-JP")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-dark mb-2">最近の学習進捗</h3>
        {progress.length === 0 ? (
          <p className="text-xs text-dark/50">進捗記録がありません</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-dark/60 border-b border-gray-100">
                <th className="text-left py-1 pr-2">日付</th>
                <th className="text-left py-1 pr-2">科目</th>
                <th className="text-left py-1 pr-2">教材</th>
                <th className="text-left py-1 pr-2">内容</th>
                <th className="text-right py-1 pr-2">ページ</th>
                <th className="text-left py-1">講師</th>
              </tr>
            </thead>
            <tbody>
              {progress.map((p, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1 pr-2 whitespace-nowrap">{new Date(p.date).toLocaleDateString("ja-JP")}</td>
                  <td className="py-1 pr-2">{p.subject}</td>
                  <td className="py-1 pr-2">{p.material}</td>
                  <td className="py-1 pr-2">{p.topic}</td>
                  <td className="py-1 pr-2 text-right">{p.pagesCompleted}p</td>
                  <td className="py-1">{p.teacherName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
