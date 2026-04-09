"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SUBJECTS } from "@/lib/types";

const TASK_TYPES = ["通常", "要引き継ぎ", "面談"] as const;

type Option = { id: string; name: string };

export default function TaskEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [students, setStudents] = useState<Option[]>([]);
  const [teachers, setTeachers] = useState<Option[]>([]);
  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("pending");
  const [type, setType] = useState("通常");
  const [meetingDateTime, setMeetingDateTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/students-list")
      .then((r) => r.json())
      .then(setStudents);
    fetch("/api/teachers-list")
      .then((r) => r.json())
      .then(setTeachers);

    if (!isNew) {
      fetch(`/api/tasks/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setStudentId(data.studentId || "");
          setTeacherId(data.teacherId);
          setSubject(data.subject);
          setTitle(data.title);
          setDescription(data.description || "");
          setDueDate(data.dueDate.split("T")[0]);
          setStatus(data.status);
          setType(data.type || "通常");
          setMeetingDateTime(
            data.meetingDateTime
              ? new Date(data.meetingDateTime).toISOString().slice(0, 16)
              : ""
          );
          setLoading(false);
        });
    }
  }, [id, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = isNew ? "/api/tasks" : `/api/tasks/${id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: studentId || null,
        teacherId,
        subject,
        title,
        description,
        dueDate,
        status,
        type,
        meetingDateTime: type === "面談" && meetingDateTime ? meetingDateTime : null,
      }),
    });

    if (res.ok) {
      router.push("/tasks");
    } else {
      const data = await res.json();
      setError(data.error || "保存に失敗しました");
      setSaving(false);
    }
  };

  if (loading) return <div className="text-dark/60">読み込み中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">
        {isNew ? "タスク新規作成" : "タスク編集"}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-2xl space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal">タスク名</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">種別</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">生徒（任意）</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">なし</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">科目</label>
            <select
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
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
            <label className="block text-sm font-medium text-charcoal">期限</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          {!isNew && (
            <div>
              <label className="block text-sm font-medium text-charcoal">担当者</label>
              <select
                required
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!isNew && (
            <div>
              <label className="block text-sm font-medium text-charcoal">ステータス</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="pending">未着手</option>
                <option value="in_progress">進行中</option>
                <option value="completed">完了</option>
                <option value="overdue">期限超過</option>
              </select>
            </div>
          )}
          {type === "面談" && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-charcoal">面談予定日時</label>
              <input
                type="datetime-local"
                required
                value={meetingDateTime}
                onChange={(e) => setMeetingDateTime(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-dark/60 mt-1">
                ※ この時刻になると、出勤中の他の講師全員に通知されます
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal">内容・詳細</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-surface text-charcoal px-4 py-2 rounded-md text-sm hover:bg-gray-200"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
