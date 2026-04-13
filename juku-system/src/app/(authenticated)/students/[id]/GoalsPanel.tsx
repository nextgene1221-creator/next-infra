"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS } from "@/lib/types";

type WeeklyGoal = {
  id: string;
  bigGoalId: string | null;
  subject: string;
  materialName: string;
  targetPages: number;
  startDate: string | Date | null;
  dueDate: string | Date;
  status: string;
  notes: string;
  progressRecords?: { pagesCompleted: number; date?: string | Date }[];
};

type BigGoal = {
  id: string;
  subject: string;
  materialName: string;
  targetPages: number;
  startDate: string | Date;
  dueDate: string | Date;
  status: string;
  notes: string;
  weeklyGoals: WeeklyGoal[];
};

const MS_DAY = 24 * 60 * 60 * 1000;

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmtMd(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function computeBigGoalStats(bg: BigGoal, now: Date) {
  const start = new Date(bg.startDate).getTime();
  const end = new Date(bg.dueDate).getTime();
  const totalDays = Math.max(1, (end - start) / MS_DAY);
  const pagesPerDay = bg.targetPages / totalDays;

  const allProgress = bg.weeklyGoals.flatMap((w) =>
    (w.progressRecords || []).map((r) => ({
      date: r.date ? new Date(r.date) : null,
      pages: r.pagesCompleted,
    }))
  );
  const actualTotal = allProgress.reduce((sum, p) => sum + p.pages, 0);

  const latestDate =
    allProgress.filter((p) => p.date).sort((a, b) => b.date!.getTime() - a.date!.getTime())[0]?.date ?? null;

  let currentPace = 0;
  if (latestDate && latestDate.getTime() >= start) {
    const elapsed = Math.max(1, (latestDate.getTime() - start) / MS_DAY);
    currentPace = actualTotal / elapsed;
  }

  const elapsedNow = Math.max(0, Math.min(totalDays, (now.getTime() - start) / MS_DAY));
  const expectedNow = pagesPerDay * elapsedNow;
  const shortfall = Math.max(0, expectedNow - actualTotal);
  const delayDays = pagesPerDay > 0 ? shortfall / pagesPerDay : 0;

  return { start, end, totalDays, pagesPerDay, actualTotal, allProgress, latestDate, currentPace, delayDays };
}

export default function GoalsPanel({
  studentId,
  initialBigGoals,
}: {
  studentId: string;
  initialBigGoals: BigGoal[];
}) {
  const router = useRouter();
  const [bigGoals, setBigGoals] = useState<BigGoal[]>(initialBigGoals);

  // 大目標フォーム
  const [showBigForm, setShowBigForm] = useState(false);
  const [bigEditingId, setBigEditingId] = useState<string | null>(null);
  const [bSubject, setBSubject] = useState("");
  const [bMaterial, setBMaterial] = useState("");
  const [bTargetPages, setBTargetPages] = useState(0);
  const [bStartDate, setBStartDate] = useState("");
  const [bDueDate, setBDueDate] = useState("");
  const [bNotes, setBNotes] = useState("");
  const [bSaving, setBSaving] = useState(false);

  // 週次目標フォーム
  const [showWeekForm, setShowWeekForm] = useState(false);
  const [weekEditingId, setWeekEditingId] = useState<string | null>(null);
  const [wBigGoalId, setWBigGoalId] = useState<string>("");
  const [wSubject, setWSubject] = useState("");
  const [wMaterial, setWMaterial] = useState("");
  const [wTargetPages, setWTargetPages] = useState(0);
  const [wStartDate, setWStartDate] = useState("");
  const [wDueDate, setWDueDate] = useState("");
  const [wNotes, setWNotes] = useState("");
  const [wSaving, setWSaving] = useState(false);

  // 進捗登録モーダル
  const [progressGoal, setProgressGoal] = useState<WeeklyGoal | null>(null);
  const [progressDate, setProgressDate] = useState("");
  const [progressPages, setProgressPages] = useState(0);
  const [progressTopic, setProgressTopic] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);

  // 期日を迎え、かつ完了済の週次目標のみ一覧から除外（進捗はDBに保存されたまま）
  const nowMs = useMemo(() => Date.now(), []);
  const allWeeklyGoals = useMemo(() => {
    const list: (WeeklyGoal & { bigGoal?: BigGoal })[] = [];
    for (const bg of bigGoals) {
      for (const wg of bg.weeklyGoals) {
        const pastDue = new Date(wg.dueDate).getTime() < nowMs;
        if (wg.status === "completed" && pastDue) continue;
        list.push({ ...wg, bigGoal: bg });
      }
    }
    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [bigGoals, nowMs]);

  // 横軸（週）: すべての大目標の期間の和集合
  const weeks = useMemo(() => {
    if (bigGoals.length === 0) return [];
    const minStart = Math.min(...bigGoals.map((g) => new Date(g.startDate).getTime()));
    const maxEnd = Math.max(...bigGoals.map((g) => new Date(g.dueDate).getTime()));
    const start = startOfWeek(new Date(minStart));
    const end = startOfWeek(new Date(maxEnd));
    const list: Date[] = [];
    for (let d = new Date(start); d.getTime() <= end.getTime(); d = addDays(d, 7)) {
      list.push(new Date(d));
    }
    return list;
  }, [bigGoals]);

  const now = useMemo(() => new Date(), []);

  const resetBigForm = () => {
    setBSubject(""); setBMaterial(""); setBTargetPages(0);
    setBStartDate(""); setBDueDate(""); setBNotes("");
    setBigEditingId(null); setShowBigForm(false);
  };
  const openNewBig = () => {
    resetBigForm();
    setBStartDate(new Date().toISOString().split("T")[0]);
    setShowBigForm(true);
  };
  const openEditBig = (bg: BigGoal) => {
    setBSubject(bg.subject);
    setBMaterial(bg.materialName);
    setBTargetPages(bg.targetPages);
    setBStartDate(new Date(bg.startDate).toISOString().split("T")[0]);
    setBDueDate(new Date(bg.dueDate).toISOString().split("T")[0]);
    setBNotes(bg.notes);
    setBigEditingId(bg.id);
    setShowBigForm(true);
  };
  const submitBig = async (e: React.FormEvent) => {
    e.preventDefault();
    setBSaving(true);
    const body = { studentId, subject: bSubject, materialName: bMaterial, targetPages: bTargetPages, startDate: bStartDate, dueDate: bDueDate, notes: bNotes };
    const url = bigEditingId ? `/api/big-goals/${bigEditingId}` : "/api/big-goals";
    const method = bigEditingId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      if (bigEditingId) {
        setBigGoals((prev) => prev.map((g) => g.id === bigEditingId ? { ...g, ...data } : g));
      } else {
        setBigGoals((prev) => [...prev, { ...data, weeklyGoals: [] }]);
      }
      resetBigForm();
      router.refresh();
    }
    setBSaving(false);
  };
  const deleteBig = async (id: string) => {
    if (!confirm("この大目標を削除しますか？\n紐づく週次目標は残ります（大目標リンクが外れます）")) return;
    const res = await fetch(`/api/big-goals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBigGoals((prev) => prev.filter((g) => g.id !== id));
      router.refresh();
    }
  };

  const resetWeekForm = () => {
    setWBigGoalId(""); setWSubject(""); setWMaterial(""); setWTargetPages(0);
    setWStartDate(""); setWDueDate(""); setWNotes("");
    setWeekEditingId(null); setShowWeekForm(false);
  };
  const openNewWeek = () => {
    resetWeekForm();
    const monday = startOfWeek(new Date());
    setWStartDate(monday.toISOString().split("T")[0]);
    setWDueDate(addDays(monday, 6).toISOString().split("T")[0]);
    if (bigGoals[0]) {
      setWBigGoalId(bigGoals[0].id);
      setWSubject(bigGoals[0].subject);
      setWMaterial(bigGoals[0].materialName);
    }
    setShowWeekForm(true);
  };
  const openEditWeek = (wg: WeeklyGoal) => {
    setWBigGoalId(wg.bigGoalId || "");
    setWSubject(wg.subject);
    setWMaterial(wg.materialName);
    setWTargetPages(wg.targetPages);
    setWStartDate(wg.startDate ? new Date(wg.startDate).toISOString().split("T")[0] : "");
    setWDueDate(new Date(wg.dueDate).toISOString().split("T")[0]);
    setWNotes(wg.notes);
    setWeekEditingId(wg.id);
    setShowWeekForm(true);
  };
  const submitWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    setWSaving(true);
    const body = { studentId, bigGoalId: wBigGoalId || null, subject: wSubject, materialName: wMaterial, targetPages: wTargetPages, startDate: wStartDate, dueDate: wDueDate, notes: wNotes };
    const url = weekEditingId ? `/api/learning-goals/${weekEditingId}` : "/api/learning-goals";
    const method = weekEditingId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      setBigGoals((prev) =>
        prev.map((g) => {
          // 編集時は旧bigGoalから除去
          const without = g.weeklyGoals.filter((w) => w.id !== weekEditingId);
          // 新しい bigGoalId に追加
          if (g.id === wBigGoalId) {
            return { ...g, weeklyGoals: [...without, { ...data, progressRecords: data.progressRecords || [] }] };
          }
          return { ...g, weeklyGoals: without };
        })
      );
      resetWeekForm();
      router.refresh();
    }
    setWSaving(false);
  };
  const deleteWeek = async (id: string) => {
    if (!confirm("この週次目標を削除しますか？")) return;
    const res = await fetch(`/api/learning-goals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBigGoals((prev) => prev.map((g) => ({ ...g, weeklyGoals: g.weeklyGoals.filter((w) => w.id !== id) })));
      router.refresh();
    }
  };

  const openProgressModal = (wg: WeeklyGoal) => {
    setProgressGoal(wg);
    setProgressDate(new Date().toISOString().split("T")[0]);
    setProgressPages(0);
    setProgressTopic("");
  };
  const closeProgressModal = () => { setProgressGoal(null); setProgressPages(0); setProgressTopic(""); };
  const submitProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressGoal) return;
    setSavingProgress(true);
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        subject: progressGoal.subject,
        date: progressDate,
        material: progressGoal.materialName,
        topic: progressTopic,
        pagesCompleted: progressPages,
        goalId: progressGoal.id,
      }),
    });
    if (res.ok) {
      setBigGoals((prev) =>
        prev.map((g) => ({
          ...g,
          weeklyGoals: g.weeklyGoals.map((w) =>
            w.id === progressGoal.id
              ? { ...w, progressRecords: [...(w.progressRecords || []), { pagesCompleted: progressPages, date: progressDate }] }
              : w
          ),
        }))
      );
      closeProgressModal();
      router.refresh();
    }
    setSavingProgress(false);
  };

  return (
    <div className="space-y-8">
      {/* ===== 週次目標進捗 ===== */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">週次目標進捗</h2>
          {!showWeekForm && (
            <button
              onClick={openNewWeek}
              disabled={bigGoals.length === 0}
              className="bg-primary text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
              title={bigGoals.length === 0 ? "先に大目標を追加してください" : ""}
            >
              週次目標を追加
            </button>
          )}
        </div>

        {showWeekForm && (
          <form onSubmit={submitWeek} className="bg-surface rounded-lg p-4 mb-4 space-y-3">
            <h3 className="text-sm font-semibold">{weekEditingId ? "週次目標を編集" : "週次目標を追加"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-charcoal">紐づく大目標</label>
                <select required value={wBigGoalId} onChange={(e) => {
                  setWBigGoalId(e.target.value);
                  const bg = bigGoals.find((g) => g.id === e.target.value);
                  if (bg) { setWSubject(bg.subject); setWMaterial(bg.materialName); }
                }} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                  <option value="">選択してください</option>
                  {bigGoals.map((bg) => <option key={bg.id} value={bg.id}>[{bg.subject}] {bg.materialName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">科目</label>
                <select required value={wSubject} onChange={(e) => setWSubject(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                  <option value="">選択してください</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">教材名</label>
                <input required value={wMaterial} onChange={(e) => setWMaterial(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">目標ページ数</label>
                <input type="number" required min={1} value={wTargetPages || ""} onChange={(e) => setWTargetPages(parseInt(e.target.value) || 0)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">週の開始日</label>
                <input type="date" required value={wStartDate} onChange={(e) => setWStartDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">週の終了日</label>
                <input type="date" required value={wDueDate} onChange={(e) => setWDueDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">メモ</label>
              <input value={wNotes} onChange={(e) => setWNotes(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={wSaving} className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50">
                {wSaving ? "保存中..." : weekEditingId ? "更新" : "追加"}
              </button>
              <button type="button" onClick={resetWeekForm} className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100">キャンセル</button>
            </div>
          </form>
        )}

        {allWeeklyGoals.length === 0 && !showWeekForm ? (
          <p className="text-dark/60 text-sm">週次目標がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-dark/60">大目標 / 教材</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-dark/60">期間</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-dark/60">進捗</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-dark/60">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allWeeklyGoals.map((w) => {
                  const done = (w.progressRecords || []).reduce((s, r) => s + r.pagesCompleted, 0);
                  const percent = w.targetPages > 0 ? Math.min(100, Math.round((done / w.targetPages) * 100)) : 0;
                  const overdue = w.status !== "completed" && new Date(w.dueDate) < now;
                  return (
                    <tr key={w.id} className={overdue ? "bg-red-50" : ""}>
                      <td className="px-3 py-2">
                        <div className="text-sm font-medium text-dark">{w.materialName}</div>
                        <div className="text-xs text-dark/60">
                          [{w.subject}]
                          {w.bigGoal && <span className="ml-1">← {w.bigGoal.materialName}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-dark/70 whitespace-nowrap">
                        {w.startDate ? new Date(w.startDate).toLocaleDateString("ja-JP") : "?"}
                        〜 {new Date(w.dueDate).toLocaleDateString("ja-JP")}
                        {overdue && <span className="ml-1 text-red-600 font-medium">超過</span>}
                      </td>
                      <td className="px-3 py-2 w-64">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${percent === 100 ? "bg-green-500" : overdue ? "bg-red-400" : "bg-primary"}`} style={{ width: `${percent}%` }} />
                          </div>
                          <span className="text-xs text-dark/70 whitespace-nowrap">{done}/{w.targetPages}p ({percent}%)</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button onClick={() => openProgressModal(w)} className="bg-accent text-white px-2 py-1 rounded text-xs hover:opacity-90">進捗</button>
                        <button onClick={() => openEditWeek(w)} className="ml-2 text-xs text-primary hover:underline">編集</button>
                        <button onClick={() => deleteWeek(w.id)} className="ml-2 text-xs text-red-500 hover:underline">削除</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== 大目標進捗 ===== */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">大目標進捗</h2>
          {!showBigForm && (
            <button onClick={openNewBig} className="bg-primary text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-dark">
              大目標を追加
            </button>
          )}
        </div>

        {showBigForm && (
          <form onSubmit={submitBig} className="bg-surface rounded-lg p-4 mb-4 space-y-3">
            <h3 className="text-sm font-semibold">{bigEditingId ? "大目標を編集" : "大目標を追加"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-charcoal">科目</label>
                <select required value={bSubject} onChange={(e) => setBSubject(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
                  <option value="">選択してください</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">教材名</label>
                <input required value={bMaterial} onChange={(e) => setBMaterial(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">目標ページ数</label>
                <input type="number" required min={1} value={bTargetPages || ""} onChange={(e) => setBTargetPages(parseInt(e.target.value) || 0)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">開始日</label>
                <input type="date" required value={bStartDate} onChange={(e) => setBStartDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">完了期限</label>
                <input type="date" required value={bDueDate} onChange={(e) => setBDueDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">メモ</label>
              <input value={bNotes} onChange={(e) => setBNotes(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={bSaving} className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50">
                {bSaving ? "保存中..." : bigEditingId ? "更新" : "追加"}
              </button>
              <button type="button" onClick={resetBigForm} className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100">キャンセル</button>
            </div>
          </form>
        )}

        {bigGoals.length === 0 ? (
          <p className="text-dark/60 text-sm">大目標がありません</p>
        ) : (
          <>
            {/* 大目標サマリー（カード横並び） */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {bigGoals.map((bg) => {
                const s = computeBigGoalStats(bg, now);
                return (
                  <div key={bg.id} className={`border rounded-lg p-3 ${bg.status === "completed" ? "border-green-200 bg-green-50/50" : s.delayDays >= 14 ? "border-red-200 bg-red-50/50" : "border-gray-200 bg-white"}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">📘 [{bg.subject}] {bg.materialName}</p>
                        <p className="text-xs text-dark/60">
                          {new Date(bg.startDate).toLocaleDateString("ja-JP")}〜{new Date(bg.dueDate).toLocaleDateString("ja-JP")} / {bg.targetPages}p
                        </p>
                        <p className="text-xs mt-1">
                          実績 <span className="font-medium">{s.actualTotal}</span>/{bg.targetPages}p
                          {s.delayDays > 0 ? (
                            <span className={`ml-2 font-medium ${s.delayDays >= 14 ? "text-red-600" : "text-orange-600"}`}>
                              {Math.round(s.delayDays)}日遅れ
                            </span>
                          ) : (
                            <span className="ml-2 text-green-600 font-medium">順調</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0 text-xs">
                        <button onClick={() => openEditBig(bg)} className="text-primary hover:underline">編集</button>
                        <button onClick={() => deleteBig(bg.id)} className="text-red-500 hover:underline">削除</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 横断カレンダー表 */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-surface z-20 border-b border-r border-gray-200 px-2 py-1 text-left w-56">大目標 / 指標</th>
                    {weeks.map((w) => (
                      <th key={w.getTime()} className="border-b border-r border-gray-200 px-2 py-1 whitespace-nowrap bg-surface">
                        {fmtMd(w)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bigGoals.map((bg) => {
                    const s = computeBigGoalStats(bg, now);
                    // 事前計算: 週ごとの projected 値と達成週インデックス
                    const projectedValues: (number | null)[] = weeks.map((weekStart) => {
                      const weekEnd = addDays(weekStart, 6);
                      const inRange = weekEnd.getTime() >= s.start && weekStart.getTime() <= s.end;
                      if (!inRange) return null;
                      const actual = s.allProgress.reduce((sum, p) => {
                        if (!p.date) return sum;
                        return p.date.getTime() <= weekEnd.getTime() ? sum + p.pages : sum;
                      }, 0);
                      if (!s.latestDate) return null;
                      if (weekEnd.getTime() > s.latestDate.getTime() && s.currentPace > 0) {
                        const extraDays = (weekEnd.getTime() - s.latestDate.getTime()) / MS_DAY;
                        return Math.round(s.actualTotal + s.currentPace * extraDays);
                      }
                      return actual;
                    });
                    const achieveWeekIdx = projectedValues.findIndex((v) => v !== null && v >= bg.targetPages);

                    const cellFor = (weekStart: Date, idx: number) => {
                      const weekEnd = addDays(weekStart, 6);
                      const inRange = weekEnd.getTime() >= s.start && weekStart.getTime() <= s.end;
                      if (!inRange) return null;
                      const daysFromStart = Math.max(0, Math.min(s.totalDays, (weekEnd.getTime() - s.start) / MS_DAY));
                      const planned = Math.round(s.pagesPerDay * daysFromStart);
                      const actual = s.allProgress.reduce((sum, p) => {
                        if (!p.date) return sum;
                        return p.date.getTime() <= weekEnd.getTime() ? sum + p.pages : sum;
                      }, 0);
                      let projected: number | string | null = projectedValues[idx];
                      if (achieveWeekIdx >= 0) {
                        if (idx === achieveWeekIdx) projected = "達成";
                        else if (idx > achieveWeekIdx) projected = "";
                      }
                      return { planned, actual, projected };
                    };
                    return (
                      <Fragment key={bg.id}>
                        <tr className="bg-primary-light/40">
                          <td className="sticky left-0 bg-primary-light/40 z-10 border-b border-r border-gray-200 px-2 py-1 font-semibold text-dark" colSpan={1}>
                            📘 [{bg.subject}] {bg.materialName}
                          </td>
                          <td colSpan={weeks.length} className="border-b border-gray-200 px-2 py-1 text-dark/70">
                            {new Date(bg.startDate).toLocaleDateString("ja-JP")}〜{new Date(bg.dueDate).toLocaleDateString("ja-JP")} / 目標{bg.targetPages}p
                          </td>
                        </tr>
                        <tr key={bg.id + "-planned"}>
                          <td className="sticky left-0 bg-white z-10 border-b border-r border-gray-200 px-2 py-1 text-blue-700">📘 予定</td>
                          {weeks.map((w, idx) => {
                            const c = cellFor(w, idx);
                            return (
                              <td key={w.getTime()} className="border-b border-r border-gray-200 px-2 py-1 text-right text-blue-700">
                                {c ? c.planned : ""}
                              </td>
                            );
                          })}
                        </tr>
                        <tr key={bg.id + "-actual"}>
                          <td className="sticky left-0 bg-white z-10 border-b border-r border-gray-200 px-2 py-1 text-green-700">✅ 実績</td>
                          {weeks.map((w, idx) => {
                            const c = cellFor(w, idx);
                            if (!c) return <td key={w.getTime()} className="border-b border-r border-gray-200 px-2 py-1" />;
                            const behind = c.actual < c.planned;
                            return (
                              <td key={w.getTime()} className={`border-b border-r border-gray-200 px-2 py-1 text-right font-medium ${behind ? "text-red-600" : "text-green-700"}`}>
                                {c.actual}
                              </td>
                            );
                          })}
                        </tr>
                        <tr key={bg.id + "-projected"}>
                          <td className="sticky left-0 bg-white z-10 border-b border-r border-gray-200 px-2 py-1 text-orange-600">🔮 現ペース</td>
                          {weeks.map((w, idx) => {
                            const c = cellFor(w, idx);
                            const val = c ? c.projected : "";
                            const isAchieve = val === "達成";
                            return (
                              <td key={w.getTime()} className={`border-b border-r border-gray-200 px-2 py-1 text-right whitespace-nowrap ${isAchieve ? "text-green-700 font-bold bg-green-50" : "text-orange-600"}`}>
                                {val === null || val === undefined ? "-" : val === "" ? "" : val}
                              </td>
                            );
                          })}
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* 進捗登録モーダル */}
      {progressGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-dark mb-4">進捗登録</h3>
            <div className="bg-surface p-3 rounded-md mb-4">
              <p className="text-xs text-dark/60">科目 / 教材</p>
              <p className="text-sm font-medium text-dark">[{progressGoal.subject}] {progressGoal.materialName}</p>
            </div>
            <form onSubmit={submitProgress} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal">授業日</label>
                <input type="date" required value={progressDate} onChange={(e) => setProgressDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">今回進めたページ数</label>
                <input type="number" required min={1} value={progressPages || ""} onChange={(e) => setProgressPages(parseInt(e.target.value) || 0)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">学習内容</label>
                <textarea value={progressTopic} onChange={(e) => setProgressTopic(e.target.value)} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeProgressModal} className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100">キャンセル</button>
                <button type="submit" disabled={savingProgress} className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50">
                  {savingProgress ? "保存中..." : "登録"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
