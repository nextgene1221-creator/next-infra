"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS } from "@/lib/types";

type Unit = { id: string; subject: string; name: string; printCount: number };
type StudentPrint = {
  id: string;
  printUnitId: string;
  printNo: number;
  scheduledDate: string;
  completedDate: string | null;
};

export default function SeminarManager({
  role,
  units: initialUnits,
  students,
  selectedStudentId,
  studentPrints,
  examSubjects,
}: {
  role: string;
  units: Unit[];
  students: { id: string; name: string }[];
  selectedStudentId?: string;
  studentPrints: StudentPrint[];
  examSubjects: string[];
}) {
  const router = useRouter();
  const [units, setUnits] = useState(initialUnits);
  const [prints, setPrints] = useState(studentPrints);

  // --- 管理者: 単元管理 ---
  const [newSubject, setNewSubject] = useState<string>(SUBJECTS[0] || "");
  const [newName, setNewName] = useState("");
  const [newCount, setNewCount] = useState(10);
  const [addingSaving, setAddingSaving] = useState(false);

  const addUnit = async () => {
    if (!newName.trim()) return;
    setAddingSaving(true);
    const res = await fetch("/api/print-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: newSubject, name: newName.trim(), printCount: newCount }),
    });
    if (res.ok) {
      const unit = await res.json();
      setUnits((prev) => [...prev, unit].sort((a, b) => a.subject.localeCompare(b.subject) || a.name.localeCompare(b.name)));
      setNewName("");
    }
    setAddingSaving(false);
  };

  const deleteUnit = async (id: string) => {
    if (!confirm("この単元と関連するプリント予定をすべて削除しますか？")) return;
    const res = await fetch(`/api/print-units/${id}`, { method: "DELETE" });
    if (res.ok) setUnits((prev) => prev.filter((u) => u.id !== id));
  };

  // --- プリント予定登録 ---
  const [scheduleUnit, setScheduleUnit] = useState("");
  const [schedulePrintNo, setSchedulePrintNo] = useState(1);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split("T")[0]);

  const schedulePrint = async () => {
    if (!scheduleUnit || !selectedStudentId) return;
    const res = await fetch("/api/student-prints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: selectedStudentId,
        printUnitId: scheduleUnit,
        printNo: schedulePrintNo,
        scheduledDate: scheduleDate,
      }),
    });
    if (res.ok) {
      const p = await res.json();
      setPrints((prev) => {
        const filtered = prev.filter(
          (x) => !(x.printUnitId === p.printUnitId && x.printNo === p.printNo)
        );
        return [...filtered, {
          id: p.id,
          printUnitId: p.printUnitId,
          printNo: p.printNo,
          scheduledDate: p.scheduledDate,
          completedDate: p.completedDate,
        }];
      });
    }
  };

  const markComplete = async (printId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch("/api/student-prints", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: printId, completedDate: today }),
    });
    if (res.ok) {
      setPrints((prev) => prev.map((p) => p.id === printId ? { ...p, completedDate: new Date(today).toISOString() } : p));
    }
  };

  // 受験科目でフィルタされた単元のみ表示（生徒向け）
  const visibleUnits = role === "student"
    ? units.filter((u) => examSubjects.includes(u.subject))
    : units;

  // 科目でグループ化
  const unitsBySubject = new Map<string, Unit[]>();
  for (const u of visibleUnits) {
    const arr = unitsBySubject.get(u.subject) || [];
    arr.push(u);
    unitsBySubject.set(u.subject, arr);
  }

  // マトリクスデータ
  const printMap = new Map<string, StudentPrint>();
  for (const p of prints) {
    printMap.set(`${p.printUnitId}-${p.printNo}`, p);
  }

  const selectedUnit = units.find((u) => u.id === scheduleUnit);

  return (
    <div className="space-y-6">
      {/* 管理者: 単元追加フォーム */}
      {role === "admin" && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold text-dark mb-3">単元登録</h2>
          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <label className="block text-xs text-dark/60">科目</label>
              <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-dark/60">単元名</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="例: 二次関数" />
            </div>
            <div>
              <label className="block text-xs text-dark/60">プリント枚数</label>
              <input type="number" min={1} value={newCount} onChange={(e) => setNewCount(Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-20" />
            </div>
            <button onClick={addUnit} disabled={addingSaving} className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-primary-dark disabled:opacity-50">
              追加
            </button>
          </div>
          {/* 単元一覧 */}
          {units.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-dark/60 border-b"><th className="text-left py-1">科目</th><th className="text-left py-1">単元</th><th className="text-right py-1">枚数</th><th className="py-1"></th></tr></thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50">
                      <td className="py-1">{u.subject}</td>
                      <td className="py-1">{u.name}</td>
                      <td className="py-1 text-right">{u.printCount}</td>
                      <td className="py-1 text-right"><button onClick={() => deleteUnit(u.id)} className="text-red-500 hover:underline">削除</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 生徒選択（管理者/講師） */}
      {role !== "student" && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold text-dark mb-2">生徒を選択</h2>
          <select
            value={selectedStudentId || ""}
            onChange={(e) => router.push(`/seminar?studentId=${e.target.value}`)}
            className="border border-gray-300 rounded px-3 py-2 text-sm w-full max-w-sm"
          >
            <option value="">選択してください</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* プリント予定登録 */}
      {selectedStudentId && visibleUnits.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold text-dark mb-3">プリント予定登録</h2>
          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <label className="block text-xs text-dark/60">単元</label>
              <select value={scheduleUnit} onChange={(e) => { setScheduleUnit(e.target.value); setSchedulePrintNo(1); }} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">選択</option>
                {visibleUnits.map((u) => <option key={u.id} value={u.id}>[{u.subject}] {u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-dark/60">プリントNo.</label>
              <select value={schedulePrintNo} onChange={(e) => setSchedulePrintNo(Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                {selectedUnit && Array.from({ length: selectedUnit.printCount }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-dark/60">予定日</label>
              <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            <button onClick={schedulePrint} disabled={!scheduleUnit} className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-primary-dark disabled:opacity-50">
              登録
            </button>
          </div>
        </div>
      )}

      {/* マトリクス表 */}
      {selectedStudentId && (
        <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
          <h2 className="text-sm font-semibold text-dark mb-3">プリント進捗マトリクス</h2>
          {Array.from(unitsBySubject.entries()).map(([subject, subjectUnits]) => (
            <div key={subject} className="mb-4">
              <h3 className="text-xs font-semibold text-primary mb-1">{subject}</h3>
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr>
                    <th className="text-left py-1 px-1 border border-gray-200 bg-surface sticky left-0 z-10 min-w-[120px]">単元</th>
                    {subjectUnits.length > 0 && Array.from({ length: Math.max(...subjectUnits.map((u) => u.printCount)) }, (_, i) => (
                      <th key={i} className="text-center py-1 px-1 border border-gray-200 bg-surface min-w-[32px]">{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subjectUnits.map((u) => (
                    <tr key={u.id}>
                      <td className="py-1 px-1 border border-gray-200 bg-white sticky left-0 z-10 whitespace-nowrap">{u.name}</td>
                      {Array.from({ length: Math.max(...subjectUnits.map((x) => x.printCount)) }, (_, i) => {
                        const no = i + 1;
                        if (no > u.printCount) return <td key={i} className="border border-gray-100 bg-gray-50" />;
                        const p = printMap.get(`${u.id}-${no}`);
                        let bg = "bg-white";
                        let content = "";
                        let title = `No.${no}`;
                        if (p?.completedDate) {
                          bg = "bg-green-100";
                          const d = new Date(p.completedDate).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
                          content = d;
                          title += ` 完了: ${d}`;
                        } else if (p) {
                          bg = "bg-yellow-50";
                          const d = new Date(p.scheduledDate).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
                          content = d;
                          title += ` 予定: ${d}`;
                        }
                        return (
                          <td
                            key={i}
                            className={`text-center py-0.5 px-0.5 border border-gray-200 ${bg} cursor-pointer hover:opacity-80`}
                            title={title}
                            onClick={() => p && !p.completedDate && markComplete(p.id)}
                          >
                            <span className="text-[10px]">{content}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="flex gap-4 mt-2 text-xs text-dark/60">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-green-100 border border-gray-200 rounded-sm" /> 完了</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-yellow-50 border border-gray-200 rounded-sm" /> 予定あり（クリックで完了）</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-white border border-gray-200 rounded-sm" /> 未登録</span>
          </div>
        </div>
      )}
    </div>
  );
}
