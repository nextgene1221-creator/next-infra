"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS } from "@/lib/types";
import FieldLabel from "@/components/FieldLabel";

export type WeeklyGoalView = {
  id: string;
  bigGoalId: string | null;
  subject: string;
  materialName: string;
  targetPages: number;
  startDate: string | null;
  dueDate: string;
  status: string;
  notes: string;
  createdById: string | null;
  done: number;
};

export type BigGoalView = {
  id: string;
  subject: string;
  materialName: string;
  targetPages: number;
  startDate: string;
  dueDate: string;
  status: string;
  notes: string;
  createdById: string | null;
  weeklyGoals: WeeklyGoalView[];
};

type GoalForm = {
  subject: string;
  materialName: string;
  targetPages: string; // string for input
  startDate: string;
  dueDate: string;
  notes: string;
};

const emptyForm = (): GoalForm => ({
  subject: SUBJECTS[0],
  materialName: "",
  targetPages: "",
  startDate: "",
  dueDate: "",
  notes: "",
});

export default function MyGoalsClient({
  userId,
  initialBigGoals,
}: {
  userId: string;
  initialBigGoals: BigGoalView[];
}) {
  const router = useRouter();
  const [bigGoals, setBigGoals] = useState(initialBigGoals);

  // 大目標フォーム
  const [showBigForm, setShowBigForm] = useState(false);
  const [editingBigId, setEditingBigId] = useState<string | null>(null);
  const [bigForm, setBigForm] = useState<GoalForm>(emptyForm());

  // 週次目標フォーム（どの大目標配下か）
  const [weeklyFormFor, setWeeklyFormFor] = useState<string | null>(null);
  const [editingWeeklyId, setEditingWeeklyId] = useState<string | null>(null);
  const [weeklyForm, setWeeklyForm] = useState<GoalForm>(emptyForm());

  const [saving, setSaving] = useState(false);

  // ---- BigGoal handlers ----
  const openNewBig = () => {
    setBigForm(emptyForm());
    setEditingBigId(null);
    setShowBigForm(true);
  };
  const openEditBig = (b: BigGoalView) => {
    setBigForm({
      subject: b.subject,
      materialName: b.materialName,
      targetPages: String(b.targetPages),
      startDate: b.startDate.split("T")[0],
      dueDate: b.dueDate.split("T")[0],
      notes: b.notes,
    });
    setEditingBigId(b.id);
    setShowBigForm(true);
  };
  const closeBigForm = () => {
    setShowBigForm(false);
    setEditingBigId(null);
  };

  const submitBig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      subject: bigForm.subject,
      materialName: bigForm.materialName,
      targetPages: parseInt(bigForm.targetPages, 10),
      startDate: bigForm.startDate,
      dueDate: bigForm.dueDate,
      notes: bigForm.notes,
    };
    try {
      if (editingBigId) {
        const res = await fetch(`/api/big-goals/${editingBigId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setBigGoals((prev) =>
            prev.map((b) =>
              b.id === editingBigId
                ? {
                    ...b,
                    subject: data.subject,
                    materialName: data.materialName,
                    targetPages: data.targetPages,
                    startDate: data.startDate,
                    dueDate: data.dueDate,
                    notes: data.notes,
                  }
                : b,
            ),
          );
          closeBigForm();
          router.refresh();
        } else {
          alert((await res.json().catch(() => ({}))).error || "更新失敗");
        }
      } else {
        const res = await fetch(`/api/big-goals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setBigGoals((prev) =>
            [
              ...prev,
              {
                id: data.id,
                subject: data.subject,
                materialName: data.materialName,
                targetPages: data.targetPages,
                startDate: data.startDate,
                dueDate: data.dueDate,
                status: data.status,
                notes: data.notes,
                createdById: data.createdById,
                weeklyGoals: [],
              },
            ].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
          );
          closeBigForm();
          router.refresh();
        } else {
          alert((await res.json().catch(() => ({}))).error || "作成失敗");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteBig = async (id: string) => {
    if (!confirm("この大目標を削除しますか？\n配下の週次目標は紐付きが解除されます（削除はされません）")) return;
    const res = await fetch(`/api/big-goals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBigGoals((prev) => prev.filter((b) => b.id !== id));
      router.refresh();
    } else {
      alert((await res.json().catch(() => ({}))).error || "削除失敗");
    }
  };

  // ---- WeeklyGoal handlers ----
  const openNewWeekly = (bigGoalId: string, bigGoal: BigGoalView) => {
    setWeeklyForm({
      ...emptyForm(),
      subject: bigGoal.subject,
      materialName: bigGoal.materialName,
    });
    setEditingWeeklyId(null);
    setWeeklyFormFor(bigGoalId);
  };
  const openEditWeekly = (w: WeeklyGoalView) => {
    setWeeklyForm({
      subject: w.subject,
      materialName: w.materialName,
      targetPages: String(w.targetPages),
      startDate: w.startDate ? w.startDate.split("T")[0] : "",
      dueDate: w.dueDate.split("T")[0],
      notes: w.notes,
    });
    setEditingWeeklyId(w.id);
    setWeeklyFormFor(w.bigGoalId);
  };
  const closeWeeklyForm = () => {
    setWeeklyFormFor(null);
    setEditingWeeklyId(null);
  };

  const submitWeekly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weeklyFormFor) return;
    setSaving(true);
    const body = {
      bigGoalId: weeklyFormFor,
      subject: weeklyForm.subject,
      materialName: weeklyForm.materialName,
      targetPages: parseInt(weeklyForm.targetPages, 10),
      startDate: weeklyForm.startDate || null,
      dueDate: weeklyForm.dueDate,
      notes: weeklyForm.notes,
    };
    try {
      if (editingWeeklyId) {
        const res = await fetch(`/api/learning-goals/${editingWeeklyId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setBigGoals((prev) =>
            prev.map((b) =>
              b.id === weeklyFormFor
                ? {
                    ...b,
                    weeklyGoals: b.weeklyGoals.map((w) =>
                      w.id === editingWeeklyId
                        ? {
                            ...w,
                            subject: data.subject,
                            materialName: data.materialName,
                            targetPages: data.targetPages,
                            startDate: data.startDate,
                            dueDate: data.dueDate,
                            notes: data.notes,
                          }
                        : w,
                    ),
                  }
                : b,
            ),
          );
          closeWeeklyForm();
          router.refresh();
        } else {
          alert((await res.json().catch(() => ({}))).error || "更新失敗");
        }
      } else {
        const res = await fetch(`/api/learning-goals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setBigGoals((prev) =>
            prev.map((b) =>
              b.id === weeklyFormFor
                ? {
                    ...b,
                    weeklyGoals: [
                      ...b.weeklyGoals,
                      {
                        id: data.id,
                        bigGoalId: data.bigGoalId,
                        subject: data.subject,
                        materialName: data.materialName,
                        targetPages: data.targetPages,
                        startDate: data.startDate,
                        dueDate: data.dueDate,
                        status: data.status,
                        notes: data.notes,
                        createdById: data.createdById,
                        done: 0,
                      },
                    ].sort((x, y) => x.dueDate.localeCompare(y.dueDate)),
                  }
                : b,
            ),
          );
          closeWeeklyForm();
          router.refresh();
        } else {
          alert((await res.json().catch(() => ({}))).error || "作成失敗");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteWeekly = async (id: string, bigGoalId: string) => {
    if (!confirm("この週次目標を削除しますか？")) return;
    const res = await fetch(`/api/learning-goals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBigGoals((prev) =>
        prev.map((b) =>
          b.id === bigGoalId ? { ...b, weeklyGoals: b.weeklyGoals.filter((w) => w.id !== id) } : b,
        ),
      );
      router.refresh();
    } else {
      alert((await res.json().catch(() => ({}))).error || "削除失敗");
    }
  };

  // ---- Helpers ----
  const canEdit = (createdById: string | null) => createdById === userId;

  return (
    <div className="space-y-4">
      {/* 新規大目標作成 */}
      {!showBigForm ? (
        <button
          onClick={openNewBig}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
        >
          ＋ 大目標を追加
        </button>
      ) : (
        <GoalFormView
          form={bigForm}
          setForm={setBigForm}
          onSubmit={submitBig}
          onCancel={closeBigForm}
          saving={saving}
          isEditing={!!editingBigId}
          startDateRequired
          title={editingBigId ? "大目標を編集" : "新規大目標"}
        />
      )}

      {/* 大目標一覧 */}
      {bigGoals.length === 0 ? (
        <p className="text-dark/60 text-sm">大目標はまだ登録されていません</p>
      ) : (
        bigGoals.map((b) => (
          <div key={b.id} className="bg-white rounded-lg shadow p-5">
            <div className="flex justify-between items-start gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-dark">
                    [{b.subject}] {b.materialName}
                  </h2>
                  {b.status === "completed" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      完了
                    </span>
                  )}
                  {!canEdit(b.createdById) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      講師・運営作成
                    </span>
                  )}
                </div>
                <p className="text-xs text-dark/60 mt-1">
                  目標 {b.targetPages}p / 期間{" "}
                  {new Date(b.startDate).toLocaleDateString("ja-JP")} 〜{" "}
                  {new Date(b.dueDate).toLocaleDateString("ja-JP")}
                </p>
                {b.notes && <p className="text-sm text-dark/70 mt-2 whitespace-pre-wrap">{b.notes}</p>}
              </div>
              {canEdit(b.createdById) && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEditBig(b)}
                    className="text-xs text-primary hover:underline"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => deleteBig(b.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    削除
                  </button>
                </div>
              )}
            </div>

            {/* 週次目標 */}
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-dark/80">週次目標</h3>
                <button
                  onClick={() => openNewWeekly(b.id, b)}
                  className="text-xs px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary hover:text-white"
                >
                  ＋ 追加
                </button>
              </div>

              {weeklyFormFor === b.id && (
                <GoalFormView
                  form={weeklyForm}
                  setForm={setWeeklyForm}
                  onSubmit={submitWeekly}
                  onCancel={closeWeeklyForm}
                  saving={saving}
                  isEditing={!!editingWeeklyId}
                  startDateRequired={false}
                  title={editingWeeklyId ? "週次目標を編集" : "新規週次目標"}
                />
              )}

              {b.weeklyGoals.length === 0 ? (
                <p className="text-xs text-dark/60">週次目標はまだありません</p>
              ) : (
                <ul className="space-y-2">
                  {b.weeklyGoals.map((w) => {
                    const pct = w.targetPages > 0 ? Math.min(100, Math.round((w.done / w.targetPages) * 100)) : 0;
                    return (
                      <li key={w.id} className="bg-surface rounded p-3">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap text-sm">
                              <span className="font-medium text-dark">
                                [{w.subject}] {w.materialName}
                              </span>
                              <span className="text-xs text-dark/60">
                                {w.done}/{w.targetPages}p ({pct}%)
                              </span>
                              {w.status === "completed" && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                                  完了
                                </span>
                              )}
                              {!canEdit(w.createdById) && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  講師・運営作成
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-dark/60 mt-1">
                              {w.startDate ? new Date(w.startDate).toLocaleDateString("ja-JP") + " 〜 " : ""}
                              {new Date(w.dueDate).toLocaleDateString("ja-JP")}
                            </p>
                            {w.notes && <p className="text-xs text-dark/70 mt-1 whitespace-pre-wrap">{w.notes}</p>}
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                              <div className="bg-accent h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          {canEdit(w.createdById) && (
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => openEditWeekly(w)}
                                className="text-xs text-primary hover:underline"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => deleteWeekly(w.id, b.id)}
                                className="text-xs text-red-500 hover:underline"
                              >
                                削除
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function GoalFormView({
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
  isEditing,
  startDateRequired,
  title,
}: {
  form: GoalForm;
  setForm: (f: GoalForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  isEditing: boolean;
  startDateRequired: boolean;
  title: string;
}) {
  return (
    <form onSubmit={onSubmit} className="bg-surface rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold text-dark">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-dark/60 mb-1">科目</label>
          <select
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel required className="block text-xs text-dark/60 mb-1">教材名</FieldLabel>
          <input
            required
            value={form.materialName}
            onChange={(e) => setForm({ ...form, materialName: e.target.value })}
            placeholder="例: 青チャート数学IIB"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <FieldLabel required className="block text-xs text-dark/60 mb-1">目標ページ数</FieldLabel>
          <input
            required
            type="number"
            min={1}
            value={form.targetPages}
            onChange={(e) => setForm({ ...form, targetPages: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <FieldLabel required={startDateRequired} className="block text-xs text-dark/60 mb-1">
            開始日{startDateRequired ? "" : "（任意）"}
          </FieldLabel>
          <input
            type="date"
            required={startDateRequired}
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <FieldLabel required className="block text-xs text-dark/60 mb-1">期日</FieldLabel>
          <input
            required
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-dark/60 mb-1">メモ（任意）</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-white px-4 py-1.5 rounded text-sm hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "保存中..." : isEditing ? "更新" : "作成"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-white text-charcoal px-4 py-1.5 rounded text-sm border border-gray-300 hover:bg-gray-100"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
