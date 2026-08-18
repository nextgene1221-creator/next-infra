"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS, STANDARD_UNITS } from "@/lib/types";

type Unit = { id: string; subject: string; name: string; printCount: number; level: string };

const LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "textbook", label: "教科書レベル" },
  { value: "chart", label: "チャートレベル" },
];
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
  embedded = false,
}: {
  role: string;
  units: Unit[];
  students: { id: string; name: string }[];
  selectedStudentId?: string;
  studentPrints: StudentPrint[];
  examSubjects: string[];
  // 面談モーダル等に埋め込む場合は単元管理・生徒選択を隠す
  embedded?: boolean;
}) {
  const router = useRouter();
  const [units, setUnits] = useState(initialUnits);
  const [prints, setPrints] = useState(studentPrints);

  // --- 管理者: 単元管理 ---
  const [newSubject, setNewSubject] = useState<string>(SUBJECTS[0] || "");
  const [newName, setNewName] = useState("");
  const [newCount, setNewCount] = useState(10);
  const [newLevel, setNewLevel] = useState<string>("textbook");
  const [addingSaving, setAddingSaving] = useState(false);

  const addUnit = async () => {
    if (!newName.trim()) return;
    setAddingSaving(true);
    const res = await fetch("/api/print-units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: newSubject, name: newName.trim(), printCount: newCount, level: newLevel }),
    });
    if (res.ok) {
      const unit = await res.json();
      setUnits((prev) => [...prev, unit].sort((a, b) => a.subject.localeCompare(b.subject) || a.name.localeCompare(b.name)));
      setNewName("");
    }
    setAddingSaving(false);
  };

  const updatePrintCount = async (id: string, printCount: number) => {
    if (printCount < 1) return;
    const res = await fetch(`/api/print-units/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printCount }),
    });
    if (res.ok) {
      setUnits((prev) => prev.map((u) => u.id === id ? { ...u, printCount } : u));
    }
  };

  const updateLevel = async (id: string, level: string) => {
    const res = await fetch(`/api/print-units/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
    if (res.ok) {
      setUnits((prev) => prev.map((u) => u.id === id ? { ...u, level } : u));
    }
  };

  const deleteUnit = async (id: string) => {
    if (!confirm("この単元と関連するプリント予定をすべて削除しますか？")) return;
    const res = await fetch(`/api/print-units/${id}`, { method: "DELETE" });
    if (res.ok) setUnits((prev) => prev.filter((u) => u.id !== id));
  };

  // --- 新規プリント予定登録モーダル（マトリクス空欄クリック起点） ---
  // 連番強制は廃止。ポップ内でNoを自由に変更できる。
  const [scheduling, setScheduling] = useState<{
    unitId: string;
    unitName: string;
    unitSubject: string;
    printCount: number;
    clickedNo: number;
  } | null>(null);
  const [scheduleNo, setScheduleNo] = useState<number>(1);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split("T")[0]);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  // 単元の空きNo一覧（プルダウンの選択肢用）
  const getAvailableNos = (unitId: string, printCount: number, includeNo?: number): number[] => {
    const taken = new Set(
      prints.filter((p) => p.printUnitId === unitId).map((p) => p.printNo),
    );
    const out: number[] = [];
    for (let n = 1; n <= printCount; n++) {
      if (!taken.has(n) || n === includeNo) out.push(n);
    }
    return out;
  };

  const openSchedule = (unit: Unit, clickedNo: number) => {
    if (!selectedStudentId) return;
    const taken = new Set(
      prints.filter((p) => p.printUnitId === unit.id).map((p) => p.printNo),
    );
    // クリックしたNoが空いていればそれ、埋まっていれば最初の空きNo
    let initial = clickedNo;
    if (taken.has(clickedNo)) {
      const firstFree = getAvailableNos(unit.id, unit.printCount)[0];
      if (firstFree === undefined) return; // 全て埋まり
      initial = firstFree;
    }
    setScheduling({ unitId: unit.id, unitName: unit.name, unitSubject: unit.subject, printCount: unit.printCount, clickedNo });
    setScheduleNo(initial);
    setScheduleDate(new Date().toISOString().split("T")[0]);
    setScheduleError("");
  };

  const closeSchedule = () => {
    setScheduling(null);
    setScheduleError("");
  };

  const schedulePrint = async () => {
    if (!scheduling || !selectedStudentId) return;
    setScheduleSaving(true);
    setScheduleError("");
    const res = await fetch("/api/student-prints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: selectedStudentId,
        printUnitId: scheduling.unitId,
        printNo: scheduleNo,
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
      closeSchedule();
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setScheduleError(j.error || "登録に失敗しました");
    }
    setScheduleSaving(false);
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
      router.refresh();
    }
  };

  // --- 予定日編集モーダル ---
  const [editing, setEditing] = useState<StudentPrint | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const openEdit = (p: StudentPrint) => {
    // 完了済みは「取り消し」のために開ける。権限が無い場合のみ従来どおり弾く。
    if (p.completedDate && !(role === "admin" || role === "teacher")) return;
    setEditing(p);
    setEditDate(p.scheduledDate.split("T")[0]);
    setEditError("");
  };

  const closeEdit = () => {
    setEditing(null);
    setEditError("");
  };

  // 生徒は過去予定日 or 過去日付への変更不可
  const todayStr = new Date().toISOString().split("T")[0];
  const isPastSchedule = editing ? editing.scheduledDate.split("T")[0] < todayStr : false;
  const studentCantEdit = role === "student" && isPastSchedule;

  const saveSchedule = async () => {
    if (!editing) return;
    if (role === "student" && editDate < todayStr) {
      setEditError("過去の日付には変更できません");
      return;
    }
    setEditSaving(true);
    setEditError("");
    const res = await fetch("/api/student-prints", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, scheduledDate: editDate }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPrints((prev) => prev.map((p) => p.id === editing.id ? { ...p, scheduledDate: updated.scheduledDate } : p));
      closeEdit();
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setEditError(j.error || "更新に失敗しました");
    }
    setEditSaving(false);
  };

  // 完了の取り消しは講師・管理者のみ（オーナー確認 2026-08-18 / B-4 (a)）。
  const canUncomplete = role === "admin" || role === "teacher";

  // 完了を取り消す。予定日は元のまま保持し、完了フラグだけ外す（B-4 (b)）。
  const uncompleteFromModal = async () => {
    if (!editing || !canUncomplete) return;
    if (!confirm("このプリントの完了を取り消しますか？\n予定日はそのまま残ります。")) return;
    const res = await fetch("/api/student-prints", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, completedDate: null }),
    });
    if (res.ok) {
      setPrints((prev) => prev.map((p) => (p.id === editing.id ? { ...p, completedDate: null } : p)));
      closeEdit();
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setEditError(j.error || "完了の取り消しに失敗しました");
    }
  };

  const completeFromModal = async () => {
    if (!editing) return;
    await markComplete(editing.id);
    closeEdit();
  };

  const deleteFromModal = async () => {
    if (!editing) return;
    if (!confirm("この予定を削除しますか？")) return;
    const res = await fetch(`/api/student-prints?id=${editing.id}`, { method: "DELETE" });
    if (res.ok) {
      setPrints((prev) => prev.filter((p) => p.id !== editing.id));
      closeEdit();
      router.refresh();
    }
  };

  // 受験科目でフィルタされた単元のみ表示（生徒向け）
  const visibleUnits = role === "student"
    ? units.filter((u) => examSubjects.includes(u.subject))
    : units;

  // レベル → 科目 でグループ化
  const groupByLevelAndSubject = (us: Unit[]): Map<string, Map<string, Unit[]>> => {
    const byLevel = new Map<string, Map<string, Unit[]>>();
    for (const u of us) {
      const lvl = u.level || "textbook";
      const subjMap = byLevel.get(lvl) || new Map<string, Unit[]>();
      const arr = subjMap.get(u.subject) || [];
      arr.push(u);
      subjMap.set(u.subject, arr);
      byLevel.set(lvl, subjMap);
    }
    return byLevel;
  };
  const unitsByLevelSubject = groupByLevelAndSubject(visibleUnits);

  // マトリクスデータ
  const printMap = new Map<string, StudentPrint>();
  for (const p of prints) {
    printMap.set(`${p.printUnitId}-${p.printNo}`, p);
  }

  return (
    <div className="space-y-6">
      {/* 管理者: 単元追加フォーム */}
      {role === "admin" && !embedded && (
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
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                list={`unit-options-${newSubject}`}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                placeholder="選択または入力"
              />
              <datalist id={`unit-options-${newSubject}`}>
                {(STANDARD_UNITS[newSubject] || [])
                  .filter((n) => !units.some((u) => u.subject === newSubject && u.name === n))
                  .map((name) => (
                    <option key={name} value={name} />
                  ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-dark/60">プリント枚数</label>
              <input type="number" min={1} value={newCount} onChange={(e) => setNewCount(Number(e.target.value))} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-20" />
            </div>
            <div>
              <label className="block text-xs text-dark/60">レベル</label>
              <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <button onClick={addUnit} disabled={addingSaving} className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-primary-dark disabled:opacity-50">
              追加
            </button>
          </div>
          {/* 単元一覧 */}
          {units.length > 0 && (
            <div className="mt-3 max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-dark/60 border-b"><th className="text-left py-1">科目</th><th className="text-left py-1">単元</th><th className="text-left py-1">レベル</th><th className="text-right py-1">枚数</th><th className="py-1"></th></tr></thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50">
                      <td className="py-1">{u.subject}</td>
                      <td className="py-1">{u.name}</td>
                      <td className="py-1">
                        <select
                          value={u.level || "textbook"}
                          onChange={(e) => updateLevel(u.id, e.target.value)}
                          className="border border-gray-300 rounded px-1 py-0.5 text-xs"
                        >
                          {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="py-1 text-right">
                        <input
                          type="number"
                          min={1}
                          defaultValue={u.printCount}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value) || u.printCount;
                            if (v !== u.printCount) updatePrintCount(u.id, v);
                          }}
                          className="w-14 text-right border border-gray-300 rounded px-1 py-0.5 text-xs"
                        />
                      </td>
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
      {role !== "student" && !embedded && (
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

      {selectedStudentId && visibleUnits.length > 0 && (
        <p className="text-xs text-dark/60">
          ※ プリント予定はマトリクスの空欄セルをクリックして登録します。クリックしたNoが初期値になりますが、ポップアップ内でNoを変更できます。
        </p>
      )}

      {/* マトリクス表（レベル別） */}
      {selectedStudentId && (
        <div className="space-y-4">
          {LEVEL_OPTIONS.map((lvl) => {
            const subjMap = unitsByLevelSubject.get(lvl.value);
            return (
              <div key={lvl.value} className="bg-white rounded-lg shadow p-4 overflow-x-auto">
                <h2 className="text-sm font-semibold text-dark mb-3">
                  プリント進捗マトリクス <span className="text-primary">[{lvl.label}]</span>
                </h2>
                {!subjMap || subjMap.size === 0 ? (
                  <p className="text-xs text-dark/60">この生徒が対象の{lvl.label}の単元は登録されていません</p>
                ) : (
                  Array.from(subjMap.entries()).map(([subject, subjectUnits]) => (
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
                                  if (role === "admin" || role === "teacher") title += "（クリックで取り消し可）";
                                } else if (p) {
                                  bg = "bg-yellow-50";
                                  const d = new Date(p.scheduledDate).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
                                  content = d;
                                  title += ` 予定: ${d}`;
                                } else {
                                  title += "（クリックで予定登録）";
                                }
                                const isClickable = !p?.completedDate || role === "admin" || role === "teacher";
                                return (
                                  <td
                                    key={i}
                                    className={`text-center py-0.5 px-0.5 border border-gray-200 ${bg} ${isClickable ? "cursor-pointer hover:opacity-80" : ""}`}
                                    title={title}
                                    onClick={() => {
                                      if (p?.completedDate && !(role === "admin" || role === "teacher")) return;
                                      if (p) {
                                        openEdit(p);
                                        return;
                                      }
                                      openSchedule(u, no);
                                    }}
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
                  ))
                )}
                <div className="flex gap-4 mt-2 text-xs text-dark/60 flex-wrap">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-green-100 border border-gray-200 rounded-sm" /> 完了</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-yellow-50 border border-gray-200 rounded-sm" /> 予定あり（クリックで編集）</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-white border border-gray-200 rounded-sm" /> 未登録（クリックで予定登録）</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 新規予定登録モーダル */}
      {scheduling && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={closeSchedule}>
          <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-dark mb-3">プリント予定を登録</h3>
            <p className="text-sm text-dark/70 mb-3">
              [{scheduling.unitSubject}] {scheduling.unitName}
              <br />
              <span className="text-xs text-dark/60">※ クリックミスがあっても下のNoを変更して登録できます。</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-dark/60 mb-1">プリントNo</label>
                <select
                  value={scheduleNo}
                  onChange={(e) => setScheduleNo(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full"
                >
                  {getAvailableNos(scheduling.unitId, scheduling.printCount).map((n) => (
                    <option key={n} value={n}>No.{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-dark/60 mb-1">予定日</label>
                <input
                  type="date"
                  value={scheduleDate}
                  min={role === "student" ? todayStr : undefined}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full"
                />
                {scheduleError && <p className="text-xs text-red-600 mt-1">{scheduleError}</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={schedulePrint}
                  disabled={scheduleSaving || !scheduleDate}
                  className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-primary-dark disabled:opacity-50"
                >
                  {scheduleSaving ? "登録中..." : "登録"}
                </button>
                <button
                  onClick={closeSchedule}
                  className="ml-auto text-dark/60 px-3 py-1.5 rounded text-sm hover:bg-gray-100"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 予定編集モーダル */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={closeEdit}>
          <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-dark mb-3">
              {editing.completedDate ? "完了済みプリント" : "プリント予定の編集"}
            </h3>
            <div className="space-y-3">
              {editing.completedDate && (
                <p className="text-xs bg-green-50 text-green-800 rounded px-2 py-1.5">
                  完了日: {new Date(editing.completedDate).toLocaleDateString("ja-JP")}
                  <br />
                  誤って完了にした場合は「完了を取り消す」で戻せます（予定日は保持されます）。
                </p>
              )}
              <div>
                <label className="block text-xs text-dark/60 mb-1">予定日</label>
                <input
                  type="date"
                  value={editDate}
                  min={role === "student" ? todayStr : undefined}
                  onChange={(e) => setEditDate(e.target.value)}
                  disabled={studentCantEdit || !!editing.completedDate}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full disabled:bg-gray-100"
                />
                {studentCantEdit && (
                  <p className="text-xs text-red-600 mt-1">過去の予定日は講師・運営のみ変更できます</p>
                )}
                {editError && <p className="text-xs text-red-600 mt-1">{editError}</p>}
              </div>
              <div className="flex gap-2 flex-wrap pt-2">
                {!editing.completedDate && (
                  <button
                    onClick={saveSchedule}
                    disabled={editSaving || studentCantEdit || editDate === editing.scheduledDate.split("T")[0]}
                    className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-primary-dark disabled:opacity-50"
                  >
                    {editSaving ? "保存中..." : "予定日を保存"}
                  </button>
                )}
                {editing.completedDate ? (
                  canUncomplete && (
                    <button
                      onClick={uncompleteFromModal}
                      className="bg-amber-600 text-white px-3 py-1.5 rounded text-sm hover:bg-amber-700"
                    >
                      完了を取り消す
                    </button>
                  )
                ) : (
                  <button
                    onClick={completeFromModal}
                    className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                  >
                    完了にする
                  </button>
                )}
                <button
                  onClick={deleteFromModal}
                  className="bg-red-500 text-white px-3 py-1.5 rounded text-sm hover:bg-red-600"
                >
                  削除
                </button>
                <button
                  onClick={closeEdit}
                  className="ml-auto text-dark/60 px-3 py-1.5 rounded text-sm hover:bg-gray-100"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
