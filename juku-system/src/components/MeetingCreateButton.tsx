"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MEETING_TYPES } from "./MeetingRecords";

type StudentOption = { id: string; name: string };

export default function MeetingCreateButton({
  students,
  currentUserName,
}: {
  students: StudentOption[];
  currentUserName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [type, setType] = useState("");
  const [content, setContent] = useState("");
  const [nextMeetingDate, setNextMeetingDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setStudentId("");
    setDate(new Date().toISOString().split("T")[0]);
    setDurationMinutes("");
    setType("");
    setContent("");
    setNextMeetingDate("");
    setError("");
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        date,
        durationMinutes: durationMinutes || null,
        type: type || null,
        content,
        nextMeetingDate: nextMeetingDate || null,
      }),
    });

    if (res.ok) {
      close();
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "保存に失敗しました");
    }
    setSaving(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
      >
        面談記録を追加
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-dark">面談記録を追加</h3>
              <button onClick={close} className="text-dark/60 hover:text-dark">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="bg-primary-light border border-primary/20 rounded-md px-3 py-2 text-sm">
                <span className="text-dark/60">記録者: </span>
                <span className="text-dark font-medium">{currentUserName}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-charcoal">対象生徒</label>
                  <select
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                  >
                    <option value="">選択してください</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                <div className="md:col-span-2">
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
              <div className="md:w-1/2">
                <label className="block text-sm font-medium text-charcoal">次回面談予定（任意）</label>
                <input
                  type="date"
                  value={nextMeetingDate}
                  onChange={(e) => setNextMeetingDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={close}
                  className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
