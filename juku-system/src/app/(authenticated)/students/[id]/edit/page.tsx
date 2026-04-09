"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

type StudentForm = {
  name: string;
  email: string;
  password: string;
  graduationYear: number;
  schoolName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  enrollmentDate: string;
  status: string;
  notes: string;
};

const initial: StudentForm = {
  name: "",
  email: "",
  password: "",
  graduationYear: new Date().getFullYear() + 1,
  schoolName: "",
  parentName: "",
  parentPhone: "",
  parentEmail: "",
  enrollmentDate: new Date().toISOString().split("T")[0],
  status: "active",
  notes: "",
};

export default function StudentEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";

  const [form, setForm] = useState<StudentForm>(initial);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isNew) {
      fetch(`/api/students/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setForm({
            name: data.user.name,
            email: data.user.email,
            password: "",
            graduationYear: data.graduationYear,
            schoolName: data.schoolName,
            parentName: data.parentName,
            parentPhone: data.parentPhone,
            parentEmail: data.parentEmail,
            enrollmentDate: data.enrollmentDate.split("T")[0],
            status: data.status,
            notes: data.notes || "",
          });
          setLoading(false);
        });
    }
  }, [id, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = isNew ? "/api/students" : `/api/students/${id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/students/${data.id}`);
    } else {
      const data = await res.json();
      setError(data.error || "保存に失敗しました");
      setSaving(false);
    }
  };

  const set = (key: keyof StudentForm, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (loading) return <div className="text-dark/60">読み込み中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">
        {isNew ? "生徒新規登録" : "生徒情報編集"}
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
              onChange={(e) => set("name", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">メールアドレス</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
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
                onChange={(e) => set("password", e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-charcoal">卒業年度</label>
            <input
              type="number"
              required
              min={2020}
              max={2040}
              value={form.graduationYear}
              onChange={(e) => set("graduationYear", parseInt(e.target.value))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="例: 2027"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">高校名</label>
            <input
              required
              value={form.schoolName}
              onChange={(e) => set("schoolName", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">ステータス</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="active">在籍</option>
              <option value="inactive">休塾</option>
              <option value="withdrawn">退塾</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">入塾日</label>
            <input
              type="date"
              required
              value={form.enrollmentDate}
              onChange={(e) => set("enrollmentDate", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">保護者氏名</label>
            <input
              required
              value={form.parentName}
              onChange={(e) => set("parentName", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">保護者電話番号</label>
            <input
              required
              value={form.parentPhone}
              onChange={(e) => set("parentPhone", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">保護者メール</label>
            <input
              type="email"
              required
              value={form.parentEmail}
              onChange={(e) => set("parentEmail", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal">備考</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
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
