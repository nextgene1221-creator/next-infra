"use client";

import { useMemo, useState } from "react";
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
  const day = x.getDay(); // 0=Sun..6=Sat, treat Monday as week start
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
  const [showWeekForm, setShowWeekForm] = useState<string | null>(null); // bigGoalId
  const [weekEditingId, setWeekEditingId] = useState<string | null>(null);
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
    setWSubject(""); setWMaterial(""); setWTargetPages(0);
    setWStartDate(""); setWDueDate(""); setWNotes("");
    setWeekEditingId(null); setShowWeekForm(null);
  };
  const openNewWeek = (bg: BigGoal) => {
    resetWeekForm();
    const monday = startOfWeek(new Date());
    setWSubject(bg.subject);
    setWMaterial(bg.materialName);
    setWStartDate(monday.toISOString().split("T")[0]);
    setWDueDate(addDays(monday, 6).toISOString().split("T")[0]);
    setShowWeekForm(bg.id);
  };
  const openEditWeek = (bigGoalId: string, wg: WeeklyGoal) => {
    setWSubject(wg.subject);
    setWMaterial(wg.materialName);
    setWTargetPages(wg.targetPages);
    setWStartDate(wg.startDate ? new Date(wg.startDate).toISOString().split("T")[0] : "");
    setWDueDate(new Date(wg.dueDate).toISOString().split("T")[0]);
    setWNotes(wg.notes);
    setWeekEditingId(wg.id);
    setShowWeekForm(bigGoalId);
  };
  const submitWeek = async (bigGoalId: string, e: React.FormEvent) => {
    e.preventDefault();
    setWSaving(true);
    const body = { studentId, bigGoalId, subject: wSubject, materialName: wMaterial, targetPages: wTargetPages, startDate: wStartDate, dueDate: wDueDate, notes: wNotes };
    const url = weekEditingId ? `/api/learning-goals/${weekEditingId}` : "/api/learning-goals";
    const method = weekEditingId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      setBigGoals((prev) =>
        prev.map((g) => {
          if (g.id !== bigGoalId) return g;
          if (weekEditingId) {
            return { ...g, weeklyGoals: g.weeklyGoals.map((w) => w.id === weekEditingId ? { ...w, ...data } : w) };
          }
          return { ...g, weeklyGoals: [...g.weeklyGoals, { ...data, progressRecords: [] }] };
        })
      );
      resetWeekForm();
      router.refresh();
    }
    setWSaving(false);
  };
  const deleteWeek = async (bigGoalId: string, id: string) => {
    if (!confirm("この週次目標を削除しますか？")) return;
    const res = await fetch(`/api/learning-goals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBigGoals((prev) =>
        prev.map((g) => g.id === bigGoalId ? { ...g, weeklyGoals: g.weeklyGoals.filter((w) => w.id !== id) } : g)
      );
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">学習目標</h2>
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
            <button type="button" onClick={resetBigForm} className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {bigGoals.length === 0 && !showBigForm ? (
        <p className="text-dark/60 text-sm">大目標が設定されていません</p>
      ) : (
        <div className="space-y-6">
          {bigGoals.map((bg) => (
            <BigGoalBlock
              key={bg.id}
              studentId={studentId}
              bg={bg}
              onEdit={() => openEditBig(bg)}
              onDelete={() => deleteBig(bg.id)}
              showWeekForm={showWeekForm === bg.id}
              onNewWeek={() => openNewWeek(bg)}
              onEditWeek={(w) => openEditWeek(bg.id, w)}
              onDeleteWeek={(id) => deleteWeek(bg.id, id)}
              onProgress={openProgressModal}
              weekForm={
                showWeekForm === bg.id ? (
                  <form onSubmit={(e) => submitWeek(bg.id, e)} className="bg-surface rounded-lg p-4 mb-3 space-y-3">
                    <h4 className="text-sm font-semibold">{weekEditingId ? "週次目標を編集" : "週次目標を追加"}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      <button type="button" onClick={resetWeekForm} className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100">
                        キャンセル
                      </button>
                    </div>
                  </form>
                ) : null
              }
            />
          ))}
        </div>
      )}

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

function BigGoalBlock({
  studentId: _studentId,
  bg,
  onEdit,
  onDelete,
  onNewWeek,
  onEditWeek,
  onDeleteWeek,
  onProgress,
  weekForm,
  showWeekForm: _showWeekForm,
}: {
  studentId: string;
  bg: BigGoal;
  onEdit: () => void;
  onDelete: () => void;
  onNewWeek: () => void;
  onEditWeek: (w: WeeklyGoal) => void;
  onDeleteWeek: (id: string) => void;
  onProgress: (w: WeeklyGoal) => void;
  weekForm: React.ReactNode;
  showWeekForm: boolean;
}) {
  const now = new Date();

  const weeks = useMemo(() => {
    const start = startOfWeek(new Date(bg.startDate));
    const end = startOfWeek(new Date(bg.dueDate));
    const list: Date[] = [];
    for (let d = new Date(start); d.getTime() <= end.getTime(); d = addDays(d, 7)) {
      list.push(new Date(d));
    }
    return list;
  }, [bg.startDate, bg.dueDate]);

  // 大目標 planned (累積の予定ページ数 per 週末)
  const totalDays = Math.max(1, (new Date(bg.dueDate).getTime() - new Date(bg.startDate).getTime()) / MS_DAY);
  const pagesPerDay = bg.targetPages / totalDays;

  // 実績の累積ページ数 (進捗記録日ごとに集計、週末累積)
  const allProgress = bg.weeklyGoals.flatMap((w) =>
    (w.progressRecords || []).map((r) => ({
      date: r.date ? new Date(r.date) : null,
      pages: r.pagesCompleted,
    }))
  );
  const actualTotal = allProgress.reduce((sum, p) => sum + p.pages, 0);

  // 最新日を取得
  const latestDate = allProgress
    .filter((p) => p.date)
    .sort((a, b) => (b.date!.getTime() - a.date!.getTime()))[0]?.date ?? null;

  // 現ペース（開始日から最新記録日までのページ/日）
  let currentPace = 0;
  if (latestDate && latestDate >= new Date(bg.startDate)) {
    const elapsed = Math.max(1, (latestDate.getTime() - new Date(bg.startDate).getTime()) / MS_DAY);
    currentPace = actualTotal / elapsed;
  }

  // 遅延日数
  const elapsedNow = Math.max(0, Math.min(totalDays, (now.getTime() - new Date(bg.startDate).getTime()) / MS_DAY));
  const expectedNow = pagesPerDay * elapsedNow;
  const shortfall = Math.max(0, expectedNow - actualTotal);
  const delayDays = pagesPerDay > 0 ? shortfall / pagesPerDay : 0;

  const formatCell = (weekStart: Date) => {
    const weekEnd = addDays(weekStart, 6);
    const daysFromStart = Math.max(0, Math.min(totalDays, (weekEnd.getTime() - new Date(bg.startDate).getTime()) / MS_DAY));
    const planned = Math.round(pagesPerDay * daysFromStart);

    // 実績累積（週末まで）
    const actual = allProgress.reduce((sum, p) => {
      if (!p.date) return sum;
      return p.date.getTime() <= weekEnd.getTime() ? sum + p.pages : sum;
    }, 0);

    // 予測: 現ペースを最新日から延長
    let projected: number | null = null;
    if (latestDate && weekEnd.getTime() > latestDate.getTime() && currentPace > 0) {
      const extraDays = (weekEnd.getTime() - latestDate.getTime()) / MS_DAY;
      projected = Math.round(actualTotal + currentPace * extraDays);
    } else if (!latestDate) {
      projected = null;
    } else {
      projected = actual;
    }
    return { planned, actual, projected };
  };

  return (
    <div className={`border rounded-lg p-4 ${bg.status === "completed" ? "border-green-200 bg-green-50/50" : delayDays >= 14 ? "border-red-200 bg-red-50/50" : "border-gray-200 bg-white"}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-base font-semibold text-dark">
            📘 [{bg.subject}] {bg.materialName}
          </p>
          <p className="text-xs text-dark/60">
            {new Date(bg.startDate).toLocaleDateString("ja-JP")} 〜 {new Date(bg.dueDate).toLocaleDateString("ja-JP")} / 目標 {bg.targetPages} ページ
          </p>
          <p className="text-xs mt-1">
            <span className="text-dark/60">実績:</span> <span className="font-medium">{actualTotal}</span> / {bg.targetPages} ページ
            {delayDays > 0 ? (
              <span className={`ml-2 font-medium ${delayDays >= 14 ? "text-red-600" : "text-orange-600"}`}>
                {Math.round(delayDays)}日遅れ
              </span>
            ) : (
              <span className="ml-2 text-green-600 font-medium">順調</span>
            )}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={onNewWeek} className="bg-accent text-white px-3 py-1 rounded-md text-xs hover:opacity-90">週次目標を追加</button>
          <button onClick={onEdit} className="text-xs text-primary hover:underline">編集</button>
          <button onClick={onDelete} className="text-xs text-red-500 hover:underline">削除</button>
        </div>
      </div>

      {weekForm}

      {/* 週次目標一覧 */}
      {bg.weeklyGoals.length > 0 && (
        <div className="space-y-2 mb-4">
          {bg.weeklyGoals.map((w) => {
            const done = (w.progressRecords || []).reduce((s, r) => s + r.pagesCompleted, 0);
            const percent = w.targetPages > 0 ? Math.min(100, Math.round((done / w.targetPages) * 100)) : 0;
            return (
              <div key={w.id} className="border border-gray-100 rounded-md p-3 bg-white">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-dark truncate">
                      {w.materialName}
                    </p>
                    <p className="text-xs text-dark/60">
                      {w.startDate ? new Date(w.startDate).toLocaleDateString("ja-JP") : "?"} 〜 {new Date(w.dueDate).toLocaleDateString("ja-JP")} / {done} / {w.targetPages}p ({percent}%)
                    </p>
                  </div>
                  <div className="flex gap-3 items-center shrink-0">
                    <button onClick={() => onProgress(w)} className="bg-primary text-white px-2 py-1 rounded text-xs hover:bg-primary-dark">進捗</button>
                    <button onClick={() => onEditWeek(w)} className="text-xs text-primary hover:underline">編集</button>
                    <button onClick={() => onDeleteWeek(w.id)} className="text-xs text-red-500 hover:underline">削除</button>
                  </div>
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5 mt-2">
                  <div className={`h-1.5 rounded-full ${percent === 100 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 週次カレンダー */}
      <div className="mt-3">
        <p className="text-xs text-dark/60 mb-1">週次進捗カレンダー（予定 / 実績 / 現ペース予測）</p>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 border border-gray-200 px-2 py-1 text-left w-24">週</th>
                {weeks.map((w) => (
                  <th key={w.getTime()} className="border border-gray-200 px-2 py-1 whitespace-nowrap bg-surface">
                    {fmtMd(w)}–{fmtMd(addDays(w, 6))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="sticky left-0 bg-white z-10 border border-gray-200 px-2 py-1 font-medium text-dark/70">📘 予定</td>
                {weeks.map((w) => (
                  <td key={w.getTime()} className="border border-gray-200 px-2 py-1 text-right text-blue-700">
                    {formatCell(w).planned}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 bg-white z-10 border border-gray-200 px-2 py-1 font-medium text-dark/70">✅ 実績</td>
                {weeks.map((w) => {
                  const c = formatCell(w);
                  const behind = c.actual < c.planned;
                  return (
                    <td key={w.getTime()} className={`border border-gray-200 px-2 py-1 text-right font-medium ${behind ? "text-red-600" : "text-green-700"}`}>
                      {c.actual}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="sticky left-0 bg-white z-10 border border-gray-200 px-2 py-1 font-medium text-dark/70">🔮 現ペース</td>
                {weeks.map((w) => {
                  const c = formatCell(w);
                  return (
                    <td key={w.getTime()} className="border border-gray-200 px-2 py-1 text-right text-orange-600">
                      {c.projected ?? "-"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
