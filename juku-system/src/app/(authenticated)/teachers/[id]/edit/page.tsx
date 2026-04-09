"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SUBJECTS } from "@/lib/types";

type TeacherForm = {
  name: string;
  email: string;
  password: string;
  subjects: string[];
  employmentType: string;
  phone: string;
  status: string;
};

const initial: TeacherForm = {
  name: "",
  email: "",
  password: "",
  subjects: [],
  employmentType: "part_time",
  phone: "",
  status: "active",
};

export default function TeacherEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [form, setForm] = useState<TeacherForm>(initial);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isNew) {
      fetch(`/api/teachers/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setForm({
            name: data.user.name,
            email: data.user.email,
            password: "",
            subjects: JSON.parse(data.subjects),
            employmentType: data.employmentType,
            phone: data.phone,
            status: data.status,
          });
          setLoading(false);
        });
    }
  }, [id, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = isNew ? "/api/teachers" : `/api/teachers/${id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/teachers/${data.id}`);
    } else {
      const data = await res.json();
      setError(data.error || "保存に失敗しました");
      setSaving(false);
    }
  };

  const toggleSubject = (subject: string) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  if (loading) return <div className="text-dark/60">読み込み中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">
        {isNew ? "講師新規登録" : "講師情報編集"}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-2xl space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal">氏名</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">メールアドレス</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          {isNew && (
            <div>
              <label className="block text-sm font-medium text-charcoal">パスワード</label>
              <input
                type="password"
                required={isNew}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-charcoal">電話番号</label>
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">雇用形態</label>
            <select
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="full_time">常勤</option>
              <option value="part_time">非常勤</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">ステータス</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="active">稼働中</option>
              <option value="inactive">非稼働</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">担当可能科目</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((subject) => (
              <button
                key={subject}
                type="button"
                onClick={() => toggleSubject(subject)}
                className={`px-3 py-1 rounded-full text-sm ${
                  form.subjects.includes(subject)
                    ? "bg-primary text-white"
                    : "bg-surface text-charcoal hover:bg-gray-300"
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
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
