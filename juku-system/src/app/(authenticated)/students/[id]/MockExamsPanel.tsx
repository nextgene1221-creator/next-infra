"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export const MOCK_SUBJECTS = ["英語", "国語", "数学", "理科", "社会"] as const;
export const GRADE_LEVELS = [
  { value: "high1", label: "高1" },
  { value: "high2", label: "高2" },
  { value: "high3", label: "高3" },
  { value: "ronin", label: "浪人" },
] as const;
const JUDGMENTS = ["A", "B", "C", "D", "E"] as const;

type SubjectEntry = { subject: string; deviation: number | null; score: number | null };

export type ExamResult = {
  id: string;
  studentId?: string;
  examName: string;
  examDate: string;
  gradeLevel: string;
  overallDeviation: number | null;
  overallScore: number | null;
  schoolRank: number | null;
  judgment: string;
  subjects: SubjectEntry[];
  notes: string;
};

export type AnonymousResult = {
  alumniKey: string;
  examDate: string;
  gradeLevel: string;
  overallDeviation: number | null;
  schoolRank: number | null;
  subjects: SubjectEntry[];
};

// グラフの X 軸（学年×月）順序値へ
function gradeOrder(grade: string): number {
  switch (grade) {
    case "high1": return 0;
    case "high2": return 12;
    case "high3": return 24;
    case "ronin": return 36;
    default: return 0;
  }
}
// 4月を学年の起点として「学年内の月オフセット (0..11)」を返す
function monthOffsetInGrade(date: Date): number {
  const m = date.getMonth() + 1; // 1..12
  return m >= 4 ? m - 4 : m + 8;
}
function xValue(grade: string, dateIso: string): number {
  return gradeOrder(grade) + monthOffsetInGrade(new Date(dateIso));
}
function xLabel(x: number): string {
  if (x < 0) return "";
  const grade = x < 12 ? "高1" : x < 24 ? "高2" : x < 36 ? "高3" : "浪";
  const off = x - Math.floor(x / 12) * 12;
  const m = ((off + 3) % 12) + 1; // 0→4月, 1→5月...
  return `${grade}/${m}月`;
}

export default function MockExamsPanel({
  studentId,
  initialResults,
  alumniResults,
}: {
  studentId: string;
  initialResults: ExamResult[];
  alumniResults: AnonymousResult[];
}) {
  const router = useRouter();
  const [results, setResults] = useState<ExamResult[]>(initialResults);
  const [tab, setTab] = useState<string>("overall"); // overall / rank / 英語 ...

  // フォーム
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [gradeLevel, setGradeLevel] = useState("high3");
  const [overallDeviation, setOverallDeviation] = useState<string>("");
  const [overallScore, setOverallScore] = useState<string>("");
  const [schoolRank, setSchoolRank] = useState<string>("");
  const [judgment, setJudgment] = useState("");
  const [subjects, setSubjects] = useState<SubjectEntry[]>(
    MOCK_SUBJECTS.map((s) => ({ subject: s, deviation: null, score: null }))
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setExamName(""); setExamDate(""); setGradeLevel("high3");
    setOverallDeviation(""); setOverallScore(""); setSchoolRank("");
    setJudgment(""); setNotes("");
    setSubjects(MOCK_SUBJECTS.map((s) => ({ subject: s, deviation: null, score: null })));
    setEditingId(null); setShowForm(false);
  };
  const openNew = () => {
    resetForm();
    setExamDate(new Date().toISOString().split("T")[0]);
    setShowForm(true);
  };
  const openEdit = (r: ExamResult) => {
    setExamName(r.examName);
    setExamDate(r.examDate.split("T")[0]);
    setGradeLevel(r.gradeLevel);
    setOverallDeviation(r.overallDeviation != null ? String(r.overallDeviation) : "");
    setOverallScore(r.overallScore != null ? String(r.overallScore) : "");
    setSchoolRank(r.schoolRank != null ? String(r.schoolRank) : "");
    setJudgment(r.judgment);
    setNotes(r.notes);
    // 既存科目をマージ
    const existingMap = new Map(r.subjects.map((s) => [s.subject, s]));
    setSubjects(MOCK_SUBJECTS.map((s) => existingMap.get(s) || { subject: s, deviation: null, score: null }));
    setEditingId(r.id);
    setShowForm(true);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      studentId, examName, examDate, gradeLevel,
      overallDeviation: overallDeviation === "" ? null : Number(overallDeviation),
      overallScore: overallScore === "" ? null : Number(overallScore),
      schoolRank: schoolRank === "" ? null : Number(schoolRank),
      judgment, notes,
      subjects: subjects.map((s) => ({
        subject: s.subject,
        deviation: s.deviation,
        score: s.score,
      })),
    };
    const url = editingId ? `/api/mock-exams/${editingId}` : "/api/mock-exams";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      const norm: ExamResult = {
        id: data.id,
        examName: data.examName,
        examDate: new Date(data.examDate).toISOString(),
        gradeLevel: data.gradeLevel,
        overallDeviation: data.overallDeviation,
        overallScore: data.overallScore,
        schoolRank: data.schoolRank,
        judgment: data.judgment,
        subjects: JSON.parse(data.subjects),
        notes: data.notes,
      };
      if (editingId) {
        setResults((prev) => prev.map((x) => x.id === editingId ? norm : x));
      } else {
        setResults((prev) => [...prev, norm]);
      }
      resetForm();
      router.refresh();
    }
    setSaving(false);
  };
  const del = async (id: string) => {
    if (!confirm("この模試結果を削除しますか？")) return;
    const res = await fetch(`/api/mock-exams/${id}`, { method: "DELETE" });
    if (res.ok) {
      setResults((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    }
  };

  // グラフ用データ
  const pickY = (
    r: { overallDeviation: number | null; schoolRank: number | null; subjects: SubjectEntry[] }
  ): number | null => {
    if (tab === "overall") return r.overallDeviation;
    if (tab === "rank") return r.schoolRank;
    const s = r.subjects.find((x) => x.subject === tab);
    return s ? s.deviation : null;
  };

  const myPoints = useMemo(() => {
    return results
      .map((r) => ({ x: xValue(r.gradeLevel, r.examDate), y: pickY(r), label: r.examName, date: r.examDate }))
      .filter((p) => p.y != null)
      .sort((a, b) => a.x - b.x) as { x: number; y: number; label: string; date: string }[];
  }, [results, tab]);

  // 先輩（匿名）をキーでグループ化し折れ線化
  const alumniLines = useMemo(() => {
    const byKey = new Map<string, { x: number; y: number }[]>();
    for (const r of alumniResults) {
      const y = pickY(r);
      if (y == null) continue;
      const arr = byKey.get(r.alumniKey) || [];
      arr.push({ x: xValue(r.gradeLevel, r.examDate), y });
      byKey.set(r.alumniKey, arr);
    }
    return Array.from(byKey.values()).map((arr) => arr.sort((a, b) => a.x - b.x));
  }, [alumniResults, tab]);

  // グラフ軸
  const allPoints = [...myPoints, ...alumniLines.flat()];
  const yValues = allPoints.map((p) => p.y);
  const xValues = allPoints.map((p) => p.x);
  const minX = 0;
  const maxX = xValues.length > 0 ? Math.max(...xValues, 35) : 35;
  const invertY = tab === "rank"; // 順位は小さいほうが上
  let minY = yValues.length > 0 ? Math.min(...yValues) : 30;
  let maxY = yValues.length > 0 ? Math.max(...yValues) : 70;
  if (tab === "overall" || MOCK_SUBJECTS.includes(tab as typeof MOCK_SUBJECTS[number])) {
    minY = Math.min(minY, 30);
    maxY = Math.max(maxY, 75);
  }
  if (minY === maxY) { minY -= 5; maxY += 5; }

  const W = 720, H = 320, PAD_L = 44, PAD_R = 16, PAD_T = 16, PAD_B = 32;
  const sx = (x: number) => PAD_L + ((x - minX) / Math.max(1, maxX - minX)) * (W - PAD_L - PAD_R);
  const sy = (y: number) => {
    const t = (y - minY) / Math.max(1, maxY - minY);
    const norm = invertY ? t : 1 - t;
    return PAD_T + norm * (H - PAD_T - PAD_B);
  };
  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");

  // X軸のグリッド・ラベル（学年境界）
  const gradeTicks = [0, 12, 24, 36].filter((t) => t >= minX && t <= maxX);
  // Y軸目盛（5刻み）
  const yStep = invertY ? 10 : 5;
  const yTicks: number[] = [];
  const yStart = Math.floor(minY / yStep) * yStep;
  const yEnd = Math.ceil(maxY / yStep) * yStep;
  for (let v = yStart; v <= yEnd; v += yStep) yTicks.push(v);

  const tabBtn = (val: string, label: string) => (
    <button
      key={val}
      onClick={() => setTab(val)}
      className={`px-3 py-1 text-xs rounded-full ${tab === val ? "bg-primary text-white" : "bg-surface text-charcoal hover:bg-gray-200"}`}
    >
      {label}
    </button>
  );

  const yAxisLabel =
    tab === "overall" ? "総合偏差値" :
    tab === "rank" ? "校内順位（小さいほど上位）" :
    `${tab} 偏差値`;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">模試結果</h2>

      {/* タブ */}
      <div className="flex flex-wrap gap-1 mb-2">
        {tabBtn("overall", "総合偏差値")}
        {tabBtn("rank", "校内順位")}
        {MOCK_SUBJECTS.map((s) => tabBtn(s, s))}
      </div>
      <p className="text-xs text-dark/60 mb-2">
        グラフ: あなたの記録（🟥赤の太線） + 同じ第1志望校を目指した卒業生（🩶灰色の細線、匿名）
        {alumniResults.length === 0 && " ※ 比較対象となる卒業生のデータがありません"}
      </p>

      {/* 折れ線グラフ（SVG） */}
      <div className="bg-white border border-gray-200 rounded-lg p-2 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[560px] w-full h-[320px]">
          {/* Y軸目盛り */}
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD_L} x2={W - PAD_R} y1={sy(t)} y2={sy(t)} stroke="#e5e7eb" strokeWidth={1} />
              <text x={PAD_L - 4} y={sy(t) + 3} textAnchor="end" fontSize={10} fill="#6b7280">{t}</text>
            </g>
          ))}
          {/* X軸 学年境界 */}
          {gradeTicks.map((t) => (
            <g key={t}>
              <line x1={sx(t)} x2={sx(t)} y1={PAD_T} y2={H - PAD_B} stroke="#d1d5db" strokeDasharray="3,3" strokeWidth={1} />
              <text x={sx(t)} y={H - PAD_B + 14} textAnchor="middle" fontSize={10} fill="#374151">
                {t === 0 ? "高1/4月" : t === 12 ? "高2/4月" : t === 24 ? "高3/4月" : "浪/4月"}
              </text>
            </g>
          ))}
          {/* Y軸ラベル */}
          <text x={10} y={PAD_T + 8} fontSize={10} fill="#374151">{yAxisLabel}</text>

          {/* 先輩ライン（匿名） */}
          {alumniLines.map((pts, i) => (
            pts.length >= 2 ? (
              <path key={`al-${i}`} d={toPath(pts)} fill="none" stroke="#9ca3af" strokeWidth={1.3} opacity={0.7} />
            ) : pts.length === 1 ? (
              <circle key={`al-${i}`} cx={sx(pts[0].x)} cy={sy(pts[0].y)} r={2.5} fill="#9ca3af" opacity={0.7} />
            ) : null
          ))}

          {/* 自分 */}
          {myPoints.length >= 2 && (
            <path d={toPath(myPoints)} fill="none" stroke="#dc2626" strokeWidth={2.4} />
          )}
          {myPoints.map((p, i) => (
            <g key={`me-${i}`}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={4} fill="#dc2626" />
              <title>{`${p.label} / ${xLabel(p.x)} / ${p.y}`}</title>
            </g>
          ))}
        </svg>
      </div>

      {/* フォーム */}
      <div className="flex justify-between items-center mt-6 mb-3">
        <h3 className="text-sm font-semibold">模試記録一覧</h3>
        {!showForm && (
          <button onClick={openNew} className="bg-primary text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-dark">
            模試結果を追加
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-surface rounded-lg p-4 mb-4 space-y-3">
          <h4 className="text-sm font-semibold">{editingId ? "模試結果を編集" : "模試結果を追加"}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-charcoal">模試名</label>
              <input required value={examName} onChange={(e) => setExamName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="例: 河合全統記述模試" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">実施日</label>
              <input type="date" required value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">学年</label>
              <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                {GRADE_LEVELS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">総合偏差値</label>
              <input type="number" step="0.1" value={overallDeviation} onChange={(e) => setOverallDeviation(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">総合得点</label>
              <input type="number" value={overallScore} onChange={(e) => setOverallScore(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">校内順位</label>
              <input type="number" value={schoolRank} onChange={(e) => setSchoolRank(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">志望校判定</label>
              <select value={judgment} onChange={(e) => setJudgment(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                <option value="">未入力</option>
                {JUDGMENTS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">科目別</label>
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr className="text-xs text-dark/60">
                    <th className="text-left px-2">科目</th>
                    <th className="text-left px-2">偏差値</th>
                    <th className="text-left px-2">得点</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, i) => (
                    <tr key={s.subject}>
                      <td className="px-2 py-1 whitespace-nowrap">{s.subject}</td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          step="0.1"
                          value={s.deviation ?? ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? null : Number(e.target.value);
                            setSubjects((prev) => prev.map((x, j) => j === i ? { ...x, deviation: v } : x));
                          }}
                          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={s.score ?? ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? null : Number(e.target.value);
                            setSubjects((prev) => prev.map((x, j) => j === i ? { ...x, score: v } : x));
                          }}
                          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal">メモ</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50">
              {saving ? "保存中..." : editingId ? "更新" : "追加"}
            </button>
            <button type="button" onClick={resetForm} className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100">キャンセル</button>
          </div>
        </form>
      )}

      {/* 一覧 */}
      {results.length === 0 ? (
        <p className="text-dark/60 text-sm">模試結果がまだ登録されていません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-dark/60">実施日</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-dark/60">学年</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-dark/60">模試名</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-dark/60">偏差値</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-dark/60">校内順位</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-dark/60">判定</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-dark/60">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[...results]
                .sort((a, b) => a.examDate.localeCompare(b.examDate))
                .map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(r.examDate).toLocaleDateString("ja-JP")}</td>
                    <td className="px-3 py-2">{GRADE_LEVELS.find((g) => g.value === r.gradeLevel)?.label || r.gradeLevel}</td>
                    <td className="px-3 py-2">{r.examName}</td>
                    <td className="px-3 py-2 text-right">{r.overallDeviation ?? "-"}</td>
                    <td className="px-3 py-2 text-right">{r.schoolRank ?? "-"}</td>
                    <td className="px-3 py-2 text-center">{r.judgment || "-"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(r)} className="text-xs text-primary hover:underline">編集</button>
                      <button onClick={() => del(r.id)} className="ml-2 text-xs text-red-500 hover:underline">削除</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
