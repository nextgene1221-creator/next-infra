"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SUBJECTS } from "@/lib/types";

type Goal = {
  id: string;
  subject: string;
  materialName: string;
  targetPages: number;
  dueDate: string | Date;
  status: string;
  notes: string;
  progressRecords?: { pagesCompleted: number }[];
};

export default function LearningGoals({
  studentId,
  initialGoals,
}: {
  studentId: string;
  initialGoals: Goal[];
}) {
  const router = useRouter();
  const [goals, setGoals] = useState(initialGoals);

  // 目標フォーム
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [targetPages, setTargetPages] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  // 進捗登録モーダル
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressDate, setProgressDate] = useState("");
  const [progressPages, setProgressPages] = useState(0);
  const [progressTopic, setProgressTopic] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);

  const resetGoalForm = () => {
    setSubject("");
    setMaterialName("");
    setTargetPages(0);
    setDueDate("");
    setNotes("");
    setEditingId(null);
    setShowGoalForm(false);
  };

  const openNewGoal = () => {
    resetGoalForm();
    setDueDate(new Date().toISOString().split("T")[0]);
    setShowGoalForm(true);
  };

  const openEditGoal = (goal: Goal) => {
    setSubject(goal.subject);
    setMaterialName(goal.materialName);
    setTargetPages(goal.targetPages);
    setDueDate(new Date(goal.dueDate).toISOString().split("T")[0]);
    setNotes(goal.notes);
    setEditingId(goal.id);
    setShowGoalForm(true);
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGoal(true);

    const body = { studentId, subject, materialName, targetPages, dueDate, notes };
    const url = editingId ? `/api/learning-goals/${editingId}` : "/api/learning-goals";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      if (editingId) {
        setGoals((prev) => prev.map((g) => (g.id === editingId ? { ...g, ...data } : g)));
      } else {
        setGoals((prev) => [...prev, { ...data, progressRecords: [] }]);
      }
      resetGoalForm();
    }
    setSavingGoal(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この学習目標を削除しますか？\n紐づく学習進捗は通常の進捗として残ります。")) return;
    const res = await fetch(`/api/learning-goals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    }
  };

  const openProgressModal = (goal: Goal) => {
    setProgressGoal(goal);
    setProgressDate(new Date().toISOString().split("T")[0]);
    setProgressPages(0);
    setProgressTopic("");
  };

  const closeProgressModal = () => {
    setProgressGoal(null);
    setProgressPages(0);
    setProgressTopic("");
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
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
      // ローカル進捗を加算
      setGoals((prev) =>
        prev.map((g) =>
          g.id === progressGoal.id
            ? {
                ...g,
                progressRecords: [
                  ...(g.progressRecords || []),
                  { pagesCompleted: progressPages },
                ],
              }
            : g
        )
      );
      closeProgressModal();
      router.refresh();
    }
    setSavingProgress(false);
  };

  const getCompletedPages = (goal: Goal) =>
    (goal.progressRecords || []).reduce((sum, r) => sum + r.pagesCompleted, 0);

  const progressPercent = (current: number, target: number) =>
    target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

  const isOverdue = (goal: Goal) =>
    goal.status !== "completed" && new Date(goal.dueDate) < new Date();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">学習目標</h2>
        {!showGoalForm && (
          <button
            onClick={openNewGoal}
            className="bg-primary text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-dark"
          >
            目標を追加
          </button>
        )}
      </div>

      {/* 目標フォーム */}
      {showGoalForm && (
        <form onSubmit={handleGoalSubmit} className="bg-surface rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-charcoal">科目</label>
              <select
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">選択してください</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">教材名</label>
              <input
                required
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                placeholder="例: 青チャート数学IA"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">目標ページ数</label>
              <input
                type="number"
                required
                min={1}
                value={targetPages || ""}
                onChange={(e) => setTargetPages(parseInt(e.target.value) || 0)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">完了期限</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">メモ</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={savingGoal}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
            >
              {savingGoal ? "保存中..." : editingId ? "更新" : "追加"}
            </button>
            <button
              type="button"
              onClick={resetGoalForm}
              className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* 目標一覧 */}
      {goals.length === 0 && !showGoalForm ? (
        <p className="text-dark/60 text-sm">学習目標が設定されていません</p>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const completed = getCompletedPages(goal);
            const percent = progressPercent(completed, goal.targetPages);
            const overdue = isOverdue(goal);
            return (
              <div
                key={goal.id}
                className={`border rounded-lg p-4 ${
                  goal.status === "completed"
                    ? "border-green-200 bg-green-50/50"
                    : overdue
                    ? "border-red-200 bg-red-50/50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <Link
                      href={`/students/${studentId}/goals/${goal.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      [{goal.subject}] {goal.materialName}
                    </Link>
                    <p className="text-xs text-dark/60 mt-0.5">
                      期限: {new Date(goal.dueDate).toLocaleDateString("ja-JP")}
                      {overdue && (
                        <span className="ml-2 text-red-600 font-medium">期限超過</span>
                      )}
                      {goal.status === "completed" && (
                        <span className="ml-2 text-green-600 font-medium">完了</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <button
                      onClick={() => openProgressModal(goal)}
                      className="bg-accent text-white px-3 py-1 rounded-md text-xs hover:opacity-90"
                    >
                      進捗登録
                    </button>
                    <button
                      onClick={() => openEditGoal(goal)}
                      className="text-xs text-primary hover:underline"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      削除
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        percent === 100
                          ? "bg-green-500"
                          : overdue
                          ? "bg-red-400"
                          : "bg-primary"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-dark/60 whitespace-nowrap">
                    {completed} / {goal.targetPages}ページ ({percent}%)
                  </span>
                </div>
                {goal.notes && (
                  <p className="text-xs text-dark/50 mt-2">{goal.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 進捗登録モーダル */}
      {progressGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-dark mb-4">進捗登録</h3>
            <div className="bg-surface p-3 rounded-md mb-4">
              <p className="text-xs text-dark/60">科目 / 教材</p>
              <p className="text-sm font-medium text-dark">
                [{progressGoal.subject}] {progressGoal.materialName}
              </p>
            </div>
            <form onSubmit={handleProgressSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal">授業日</label>
                <input
                  type="date"
                  required
                  value={progressDate}
                  onChange={(e) => setProgressDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">今回進めたページ数</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={progressPages || ""}
                  onChange={(e) => setProgressPages(parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">学習内容</label>
                <textarea
                  value={progressTopic}
                  onChange={(e) => setProgressTopic(e.target.value)}
                  rows={3}
                  placeholder="例: 二次関数の最大値・最小値を扱った"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeProgressModal}
                  className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={savingProgress}
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
                >
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
