"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS } from "@/lib/types";
import FieldLabel from "@/components/FieldLabel";

type TeacherForm = {
  name: string;
  email: string;
  subjects: string[];
  employmentType: string;
  phone: string;
  universityFaculty: string;
  department: string;
  graduationYear: string;
  examSubjectsTaken: string[];
  emergencyContact: string;
  universityClub: string;
};

const initial: TeacherForm = {
  name: "",
  email: "",
  subjects: [],
  employmentType: "part_time",
  phone: "",
  universityFaculty: "",
  department: "",
  graduationYear: "",
  examSubjectsTaken: [],
  emergencyContact: "",
  universityClub: "",
};

export default function TeacherSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<TeacherForm>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const toggleSubject = (s: string) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(s) ? prev.subjects.filter((x) => x !== s) : [...prev.subjects, s],
    }));
  };
  const toggleExamTaken = (s: string) => {
    setForm((prev) => ({
      ...prev,
      examSubjectsTaken: prev.examSubjectsTaken.includes(s)
        ? prev.examSubjectsTaken.filter((x) => x !== s)
        : [...prev.examSubjectsTaken, s],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/signup/teacher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "登録に失敗しました");
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <h2 className="text-xl font-bold text-dark mb-2">登録が完了しました</h2>
        <p className="text-sm text-dark/70">
          初期パスワード: <code className="bg-surface px-2 py-1 rounded font-mono">password123</code><br />
          ログイン画面に移動します...
        </p>
      </div>
    );
  }

  const inputCls = "mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm";
  const labelCls = "block text-sm font-medium text-charcoal";

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-lg font-bold text-dark">講師登録</h2>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel required className={labelCls}>氏名</FieldLabel>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </div>
        <div>
          <FieldLabel required className={labelCls}>メールアドレス</FieldLabel>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
        </div>
        <div>
          <FieldLabel required className={labelCls}>電話番号</FieldLabel>
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>緊急連絡先</label>
          <input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>雇用形態</label>
          <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} className={inputCls}>
            <option value="full_time">常勤</option>
            <option value="part_time">非常勤</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>大学学部</label>
          <input value={form.universityFaculty} onChange={(e) => setForm({ ...form, universityFaculty: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>学科</label>
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>卒業年度</label>
          <input type="number" min={1980} max={2040} value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>大学での部活</label>
          <input value={form.universityClub} onChange={(e) => setForm({ ...form, universityClub: e.target.value })} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={`${labelCls} mb-2`}>担当可能科目</label>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button key={s} type="button" onClick={() => toggleSubject(s)}
              className={`px-3 py-1 rounded-full text-sm ${form.subjects.includes(s) ? "bg-primary text-white" : "bg-surface text-charcoal hover:bg-gray-300"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={`${labelCls} mb-2`}>受験した科目</label>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button key={s} type="button" onClick={() => toggleExamTaken(s)}
              className={`px-3 py-1 rounded-full text-sm ${form.examSubjectsTaken.includes(s) ? "bg-primary text-white" : "bg-surface text-charcoal hover:bg-gray-300"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="bg-primary text-white px-6 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50">
          {saving ? "登録中..." : "登録する"}
        </button>
      </div>
    </form>
  );
}
