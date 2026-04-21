"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export const MEETING_TYPES = [
  "定期面談",
  "進路相談",
  "学習相談",
  "保護者面談",
  "その他",
] as const;

type GoalSnapshot = {
  subject: string;
  materialName: string;
  targetPages: number;
  done: number;
  startDate: string;
  dueDate: string;
  status: string;
};
type ProgressSnapshot = {
  date: string;
  subject: string;
  material: string;
  topic: string;
  pagesCompleted: number;
  teacherName: string;
};

type Meeting = {
  id: string;
  date: string | Date;
  durationMinutes: number | null;
  type: string | null;
  status?: string;
  content: string;
  parentComment?: string;
  goalsSnapshot?: string;
  progressSnapshot?: string;
  nextMeetingDate: string | Date | null;
  teacher: { user: { name: string } };
};

export default function MeetingRecords({
  studentId,
  initialMeetings,
  currentUserName,
}: {
  studentId: string;
  initialMeetings: Meeting[];
  currentUserName: string;
}) {
  const router = useRouter();
  const [meetings, setMeetings] = useState(initialMeetings);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [type, setType] = useState("");
  const [content, setContent] = useState("");
  const [nextMeetingDate, setNextMeetingDate] = useState("");
  const [status, setStatus] = useState("conducted");
  const [parentComment, setParentComment] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setDate("");
    setDurationMinutes("");
    setType("");
    setContent("");
    setNextMeetingDate("");
    setStatus("conducted");
    setParentComment("");
    setEditingId(null);
    setShowForm(false);
  };

  const openNew = () => {
    resetForm();
    setDate(new Date().toISOString().split("T")[0]);
    setShowForm(true);
  };

  const openEdit = (meeting: Meeting) => {
    setDate(new Date(meeting.date).toISOString().split("T")[0]);
    setDurationMinutes(meeting.durationMinutes || "");
    setType(meeting.type || "");
    setContent(meeting.content);
    setNextMeetingDate(
      meeting.nextMeetingDate
        ? new Date(meeting.nextMeetingDate).toISOString().split("T")[0]
        : ""
    );
    setStatus(meeting.status || "conducted");
    setParentComment(meeting.parentComment || "");
    setEditingId(meeting.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const body = {
      studentId,
      date,
      durationMinutes: durationMinutes || null,
      type: type || null,
      status,
      content,
      parentComment,
      nextMeetingDate: nextMeetingDate || null,
    };

    const url = editingId ? `/api/meetings/${editingId}` : "/api/meetings";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      if (editingId) {
        setMeetings((prev) => prev.map((m) => (m.id === editingId ? data : m)));
      } else {
        setMeetings((prev) => [data, ...prev]);
      }
      resetForm();
      router.refresh();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この面談記録を削除しますか？")) return;
    const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">面談記録</h2>
        {!showForm && (
          <button
            onClick={openNew}
            className="bg-primary text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-dark"
          >
            面談記録を追加
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-lg p-4 mb-4 space-y-3">
          <div className="bg-primary-light border border-primary/20 rounded-md px-3 py-2 text-sm">
            <span className="text-dark/60">記録者: </span>
            <span className="text-dark font-medium">{currentUserName}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-charcoal">面談日</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">面談時間（分）</label>
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || "")}
                placeholder="例: 30"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">面談タイプ</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">選択してください</option>
                {MEETING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="md:w-1/3">
            <label className="block text-sm font-medium text-charcoal">ステータス</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="conducted">実施</option>
              <option value="rescheduled">振替</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">面談内容</label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="面談で話した内容、今後の方針、課題などを記録"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="md:w-1/3">
            <label className="block text-sm font-medium text-charcoal">次回面談予定（任意）</label>
            <input
              type="date"
              value={nextMeetingDate}
              onChange={(e) => setNextMeetingDate(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">親御さんへのコメント（報告書に掲載）</label>
            <textarea
              value={parentComment}
              onChange={(e) => setParentComment(e.target.value)}
              rows={3}
              placeholder="空欄なら報告書に含みません"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "保存中..." : editingId ? "更新" : "追加"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {meetings.length === 0 && !showForm ? (
        <p className="text-dark/60 text-sm">面談記録がありません</p>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="border border-gray-200 rounded-lg p-4 bg-white"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-dark">
                      {new Date(meeting.date).toLocaleDateString("ja-JP")}
                    </span>
                    {meeting.type && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-light text-primary font-medium">
                        {meeting.type}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        meeting.status === "rescheduled"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {meeting.status === "rescheduled" ? "振替" : "実施"}
                    </span>
                    {meeting.durationMinutes && (
                      <span className="text-xs text-dark/60">
                        {meeting.durationMinutes}分
                      </span>
                    )}
                    <span className="text-xs text-dark/60">
                      / 担当: {meeting.teacher.user.name}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => openEdit(meeting)}
                    className="text-xs text-primary hover:underline"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(meeting.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    削除
                  </button>
                </div>
              </div>
              <p className="text-sm text-dark whitespace-pre-wrap mt-2">
                {meeting.content}
              </p>
              <MeetingSnapshots meeting={meeting} />
              {meeting.nextMeetingDate && (
                <p className="text-xs text-dark/60 mt-2">
                  次回面談予定:{" "}
                  {new Date(meeting.nextMeetingDate).toLocaleDateString("ja-JP")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 面談時点のスナップショット表示
function MeetingSnapshots({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(false);
  const goals: GoalSnapshot[] = meeting.goalsSnapshot ? JSON.parse(meeting.goalsSnapshot) : [];
  const progress: ProgressSnapshot[] = meeting.progressSnapshot ? JSON.parse(meeting.progressSnapshot) : [];

  if (goals.length === 0 && progress.length === 0) return null;

  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-primary hover:underline"
      >
        {open ? "▼ 学習進捗を閉じる" : "▶ 面談時点の学習進捗を表示"}
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {goals.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-dark mb-1">大目標 / 指標</h4>
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
            </div>
          )}
          {progress.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-dark mb-1">前回面談からの学習進捗</h4>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
