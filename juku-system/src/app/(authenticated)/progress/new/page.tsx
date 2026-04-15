"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { SUBJECTS } from "@/lib/types";

type StudentOption = { id: string; name: string };

export default function ProgressNewPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isStudent = session?.user?.role === "student";
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [material, setMaterial] = useState("");
  const [topic, setTopic] = useState("");
  const [pagesCompleted, setPagesCompleted] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isStudent) return;
    fetch("/api/students-list")
      .then((r) => r.json())
      .then(setStudents);
  }, [isStudent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, subject, date, material, topic, pagesCompleted }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/progress/${data.id}`);
    } else {
      const data = await res.json();
      setError(data.error || "保存に失敗しました");
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">進捗入力</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-2xl space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!isStudent && (
            <div>
              <label className="block text-sm font-medium text-charcoal">生徒</label>
              <select
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
            <label className="block text-sm font-medium text-charcoal">授業日</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">教材</label>
            <input
              required
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="例: 青チャート数学IA"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">進めたページ数</label>
            <input
              type="number"
              required
              min={1}
              value={pagesCompleted || ""}
              onChange={(e) => setPagesCompleted(parseInt(e.target.value) || 0)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal">学習内容</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder="例: 二次関数のグラフと最大値・最小値"
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
