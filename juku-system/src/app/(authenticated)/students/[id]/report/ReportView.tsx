"use client";

type BigGoalSummary = {
  id: string;
  subject: string;
  materialName: string;
  startDate: string;
  dueDate: string;
  targetPages: number;
  expected: number;
  actual: number;
};

type WeeklyGoal = {
  id: string;
  bigGoalTitle: string;
  subject: string;
  materialName: string;
  startDate: string | null;
  dueDate: string;
  targetPages: number;
  done: number;
  status: string;
};

type Exam = {
  id: string;
  examName: string;
  examDate: string;
  gradeLevel: string;
  overallDeviation: number | null;
  schoolRank: number | null;
  judgment: string;
  subjects: { subject: string; deviation: number | null; score: number | null }[];
};

type Comment = {
  id: string;
  date: string;
  teacherName: string;
  parentComment: string;
};

const GRADE_LABEL: Record<string, string> = {
  high1: "高1", high2: "高2", high3: "高3", ronin: "浪人",
};
const CAMPUS_LABEL: Record<string, string> = { shuri: "首里校舎", naha: "那覇校舎" };

export default function ReportView({
  student,
  reportFrom,
  reportTo,
  bigGoals,
  weeklyGoals,
  exams,
  comments,
  assignedTeachers,
}: {
  student: { name: string; schoolName: string; graduationYear: number; firstChoiceSchool: string; campus: string };
  reportFrom: string;
  reportTo: string;
  bigGoals: BigGoalSummary[];
  weeklyGoals: WeeklyGoal[];
  exams: Exam[];
  comments: Comment[];
  assignedTeachers: string[];
}) {
  // 模試折れ線（総合偏差値）
  const examPoints = exams
    .filter((e) => e.overallDeviation != null)
    .map((e) => ({
      date: new Date(e.examDate),
      name: e.examName,
      grade: e.gradeLevel,
      deviation: e.overallDeviation as number,
    }));

  const minDev = examPoints.length ? Math.min(30, ...examPoints.map((p) => p.deviation)) : 30;
  const maxDev = examPoints.length ? Math.max(75, ...examPoints.map((p) => p.deviation)) : 75;
  const chartW = 600, chartH = 180, padL = 32, padR = 8, padT = 10, padB = 24;
  const minT = examPoints.length ? examPoints[0].date.getTime() : 0;
  const maxT = examPoints.length ? examPoints[examPoints.length - 1].date.getTime() : 1;
  const sx = (t: number) => padL + ((t - minT) / Math.max(1, maxT - minT)) * (chartW - padL - padR);
  const sy = (v: number) => padT + (1 - (v - minDev) / Math.max(1, maxDev - minDev)) * (chartH - padT - padB);

  const reportDateLabel = `${new Date(reportFrom).toLocaleDateString("ja-JP")} 〜 ${new Date(reportTo).toLocaleDateString("ja-JP")}`;

  return (
    <div className="report-root">
      {/* 画面用コントロール */}
      <div className="no-print bg-surface p-3 mb-4 rounded-md flex items-center justify-between">
        <p className="text-sm text-dark/70">
          印刷ダイアログで「PDFとして保存」を選んでください。
        </p>
        <button
          onClick={() => window.print()}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
        >
          印刷 / PDF保存
        </button>
      </div>

      <div className="report-page bg-white p-6 max-w-4xl mx-auto text-sm leading-relaxed">
        {/* ヘッダー */}
        <header className="border-b-2 border-dark pb-3 mb-4">
          <h1 className="text-xl font-bold">学習状況報告書</h1>
          <p className="text-xs text-dark/70 mt-1">対象期間: {reportDateLabel}</p>
        </header>

        {/* 生徒情報 */}
        <section className="mb-4">
          <h2 className="font-semibold border-l-4 border-primary pl-2 mb-2">生徒情報</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div><dt className="inline text-dark/60">氏名: </dt><dd className="inline font-medium">{student.name}</dd></div>
            <div><dt className="inline text-dark/60">学校: </dt><dd className="inline">{student.schoolName}</dd></div>
            <div><dt className="inline text-dark/60">卒業年度: </dt><dd className="inline">{student.graduationYear}年度</dd></div>
            <div><dt className="inline text-dark/60">入塾校舎: </dt><dd className="inline">{CAMPUS_LABEL[student.campus] || "-"}</dd></div>
            <div className="col-span-2"><dt className="inline text-dark/60">第1志望校: </dt><dd className="inline">{student.firstChoiceSchool || "-"}</dd></div>
            <div className="col-span-2"><dt className="inline text-dark/60">担当講師: </dt><dd className="inline">{assignedTeachers.length ? assignedTeachers.join("、") : "-"}</dd></div>
          </dl>
        </section>

        {/* 大目標 */}
        <section className="mb-4">
          <h2 className="font-semibold border-l-4 border-primary pl-2 mb-2">大目標の進捗</h2>
          {bigGoals.length === 0 ? (
            <p className="text-dark/60 text-xs">大目標が設定されていません</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-surface">
                  <th className="border border-gray-300 px-2 py-1 text-left">教材</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">期間</th>
                  <th className="border border-gray-300 px-2 py-1 text-right">目標</th>
                  <th className="border border-gray-300 px-2 py-1 text-right">予定</th>
                  <th className="border border-gray-300 px-2 py-1 text-right">実績</th>
                  <th className="border border-gray-300 px-2 py-1 text-right">達成率</th>
                </tr>
              </thead>
              <tbody>
                {bigGoals.map((bg) => {
                  const achieve = bg.targetPages > 0 ? Math.round((bg.actual / bg.targetPages) * 100) : 0;
                  const expRate = bg.expected > 0 ? Math.round((bg.actual / bg.expected) * 100) : null;
                  return (
                    <tr key={bg.id}>
                      <td className="border border-gray-300 px-2 py-1">[{bg.subject}] {bg.materialName}</td>
                      <td className="border border-gray-300 px-2 py-1">
                        {new Date(bg.startDate).toLocaleDateString("ja-JP")}〜{new Date(bg.dueDate).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{bg.targetPages}p</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{bg.expected}p</td>
                      <td className="border border-gray-300 px-2 py-1 text-right font-medium">{bg.actual}p</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">
                        {achieve}%
                        {expRate != null && <span className="text-[10px] text-dark/60 ml-1">(予定比 {expRate}%)</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* 直近1ヶ月の週次目標 */}
        <section className="mb-4">
          <h2 className="font-semibold border-l-4 border-primary pl-2 mb-2">直近1ヶ月の週次目標（予実）</h2>
          {weeklyGoals.length === 0 ? (
            <p className="text-dark/60 text-xs">直近1ヶ月の週次目標がありません</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-surface">
                  <th className="border border-gray-300 px-2 py-1 text-left">所属大目標</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">週次教材</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">期間</th>
                  <th className="border border-gray-300 px-2 py-1 text-right">目標p</th>
                  <th className="border border-gray-300 px-2 py-1 text-right">実績p</th>
                  <th className="border border-gray-300 px-2 py-1 text-center">状態</th>
                </tr>
              </thead>
              <tbody>
                {weeklyGoals.map((w) => {
                  const achieved = w.done >= w.targetPages;
                  return (
                    <tr key={w.id}>
                      <td className="border border-gray-300 px-2 py-1">{w.bigGoalTitle}</td>
                      <td className="border border-gray-300 px-2 py-1">{w.materialName}</td>
                      <td className="border border-gray-300 px-2 py-1">
                        {w.startDate ? new Date(w.startDate).toLocaleDateString("ja-JP") : "?"}
                        〜{new Date(w.dueDate).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{w.targetPages}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right font-medium">{w.done}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center">
                        {achieved ? "達成" : w.status === "completed" ? "完了" : "進行中"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* 模試結果推移 */}
        <section className="mb-4">
          <h2 className="font-semibold border-l-4 border-primary pl-2 mb-2">模試結果の推移（総合偏差値）</h2>
          {examPoints.length === 0 ? (
            <p className="text-dark/60 text-xs">模試の記録がありません</p>
          ) : (
            <>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-[180px] border border-gray-200">
                {[30, 40, 50, 60, 70].filter((v) => v >= minDev && v <= maxDev).map((v) => (
                  <g key={v}>
                    <line x1={padL} x2={chartW - padR} y1={sy(v)} y2={sy(v)} stroke="#e5e7eb" />
                    <text x={padL - 4} y={sy(v) + 3} textAnchor="end" fontSize={9} fill="#6b7280">{v}</text>
                  </g>
                ))}
                {examPoints.length >= 2 && (
                  <path
                    d={examPoints.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.date.getTime()).toFixed(1)},${sy(p.deviation).toFixed(1)}`).join(" ")}
                    fill="none" stroke="#1f2937" strokeWidth={1.8}
                  />
                )}
                {examPoints.map((p, i) => (
                  <g key={i}>
                    <circle cx={sx(p.date.getTime())} cy={sy(p.deviation)} r={3} fill="#1f2937" />
                    <text x={sx(p.date.getTime())} y={sy(p.deviation) - 6} textAnchor="middle" fontSize={8} fill="#111827">{p.deviation}</text>
                  </g>
                ))}
              </svg>
              <table className="w-full text-xs border-collapse mt-2">
                <thead>
                  <tr className="bg-surface">
                    <th className="border border-gray-300 px-2 py-1 text-left">実施日</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">学年</th>
                    <th className="border border-gray-300 px-2 py-1 text-left">模試名</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">偏差値</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">校内順位</th>
                    <th className="border border-gray-300 px-2 py-1 text-center">判定</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((e) => (
                    <tr key={e.id}>
                      <td className="border border-gray-300 px-2 py-1">{new Date(e.examDate).toLocaleDateString("ja-JP")}</td>
                      <td className="border border-gray-300 px-2 py-1">{GRADE_LABEL[e.gradeLevel] || e.gradeLevel}</td>
                      <td className="border border-gray-300 px-2 py-1">{e.examName}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{e.overallDeviation ?? "-"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{e.schoolRank ?? "-"}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center">{e.judgment || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        {/* コメント */}
        <section className="mb-4">
          <h2 className="font-semibold border-l-4 border-primary pl-2 mb-2">講師からのコメント（直近1ヶ月）</h2>
          {comments.length === 0 ? (
            <p className="text-dark/60 text-xs">対象期間のコメントがありません</p>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="border border-gray-200 rounded p-2">
                  <p className="text-[11px] text-dark/60">
                    {new Date(c.date).toLocaleDateString("ja-JP")} / {c.teacherName}
                  </p>
                  <p className="whitespace-pre-wrap mt-1 text-xs">{c.parentComment}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="text-[10px] text-dark/50 border-t pt-2 mt-4">
          発行日: {new Date().toLocaleDateString("ja-JP")}
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          aside, header.md\\:hidden { display: none !important; }
          .report-root { margin: 0 !important; padding: 0 !important; }
          .report-page { box-shadow: none !important; padding: 10mm !important; max-width: 100% !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}
