"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MeetingSnapshots, MEETING_TYPES } from "@/components/MeetingRecords";

export type MeetingListItem = {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  durationMinutes: number | null;
  type: string | null;
  status: string;
  content: string;
  parentComment: string;
  goalsSnapshot: string;
  progressSnapshot: string;
  nextMeetingDate: string | null;
  teacherName: string;
};

export default function MeetingsListClient({
  initialMeetings,
}: {
  initialMeetings: MeetingListItem[];
}) {
  const router = useRouter();
  const [meetings, setMeetings] = useState(initialMeetings);

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
    setEditingId(null);
    setDate("");
    setDurationMinutes("");
    setType("");
    setContent("");
    setNextMeetingDate("");
    setStatus("conducted");
    setParentComment("");
  };

  const openEdit = (m: MeetingListItem) => {
    setEditingId(m.id);
    setDate(new Date(m.date).toISOString().split("T")[0]);
    setDurationMinutes(m.durationMinutes ?? "");
    setType(m.type ?? "");
    setContent(m.content);
    setNextMeetingDate(
      m.nextMeetingDate ? new Date(m.nextMeetingDate).toISOString().split("T")[0] : ""
    );
    setStatus(m.status || "conducted");
    setParentComment(m.parentComment || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const target = meetings.find((m) => m.id === editingId);
    if (!target) return;
    setSaving(true);

    const body = {
      studentId: target.studentId,
      date,
      durationMinutes: durationMinutes || null,
      type: type || null,
      status,
      content,
      parentComment,
      nextMeetingDate: nextMeetingDate || null,
    };

    const res = await fetch(`/api/meetings/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === editingId
            ? {
                ...m,
                date: data.date,
                durationMinutes: data.durationMinutes,
                type: data.type,
                status: data.status,
                content: data.content,
                parentComment: data.parentComment,
                nextMeetingDate: data.nextMeetingDate,
              }
            : m
        )
      );
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

  if (meetings.length === 0) {
    return <p className="text-dark/60 text-sm">面談記録がありません</p>;
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => {
        const isEditing = editingId === meeting.id;
        return (
          <div
            key={meeting.id}
            className="border border-gray-200 rounded-lg p-4 bg-white"
          >
            <div className="flex justify-between items-start mb-2 gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-dark">
                    {new Date(meeting.date).toLocaleDateString("ja-JP")}
                  </span>
                  <Link
                    href={`/students/${meeting.studentId}`}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {meeting.studentName}
                  </Link>
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
                    / 担当: {meeting.teacherName}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 items-center shrink-0">
                <button
                  onClick={() => (isEditing ? resetForm() : openEdit(meeting))}
                  className="text-xs text-primary hover:underline"
                >
                  {isEditing ? "閉じる" : "編集"}
                </button>
                <button
                  onClick={() => handleDelete(meeting.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  削除
                </button>
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="bg-surface rounded-lg p-4 mt-2 space-y-3">
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
                    {saving ? "保存中..." : "更新"}
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
            ) : (
              <>
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
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
