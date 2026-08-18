"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS, TRACKS, GENDERS } from "@/lib/types";
import FieldLabel from "@/components/FieldLabel";
import { APPLICATION_POLICY_OPTIONS, LOCATION_PREFERENCE_OPTIONS } from "@/lib/studentPreferences";

type CampusOption = { code: string; label: string };

type StudentForm = {
  name: string;
  email: string;
  graduationYear: number;
  schoolName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  enrollmentDate: string;
  notes: string;
  furigana: string;
  gender: string;
  birthDate: string;
  mobilePhone: string;
  postalCode: string;
  address: string;
  referrer: string;
  track: string;
  firstChoiceSchool: string;
  desiredFaculty: string;
  applicationPolicy: string;
  locationPreference: string;
  examSubjects: string[];
  considerRecommendation: boolean;
  eikenPlan: string;
  campus: string;
};

const initial: StudentForm = {
  name: "",
  email: "",
  graduationYear: new Date().getFullYear() + 1,
  schoolName: "",
  parentName: "",
  parentPhone: "",
  parentEmail: "",
  enrollmentDate: new Date().toISOString().split("T")[0],
  notes: "",
  furigana: "",
  gender: "",
  birthDate: "",
  mobilePhone: "",
  postalCode: "",
  address: "",
  referrer: "",
  track: "",
  firstChoiceSchool: "",
  desiredFaculty: "",
  applicationPolicy: "",
  locationPreference: "",
  examSubjects: [],
  considerRecommendation: false,
  eikenPlan: "",
  campus: "",
};

export default function StudentSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<StudentForm>(initial);
  const [campusOptions, setCampusOptions] = useState<CampusOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/campuses")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCampusOptions(data.map((c: { code: string; label: string }) => ({ code: c.code, label: c.label })));
      })
      .catch(() => {});
  }, []);

  const set = <K extends keyof StudentForm>(key: K, val: StudentForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleExamSubject = (s: string) => {
    setForm((prev) => ({
      ...prev,
      examSubjects: prev.examSubjects.includes(s)
        ? prev.examSubjects.filter((x) => x !== s)
        : [...prev.examSubjects, s],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/signup/student", {
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
      <h2 className="text-lg font-bold text-dark">生徒登録</h2>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel required className={labelCls}>氏名</FieldLabel>
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>ふりがな</label>
          <input value={form.furigana} onChange={(e) => set("furigana", e.target.value)} className={inputCls} />
        </div>
        <div>
          <FieldLabel required className={labelCls}>メールアドレス</FieldLabel>
          <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>性別</label>
          <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={inputCls}>
            <option value="">未選択</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>生年月日</label>
          <input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} className={inputCls} />
        </div>
        <div>
          <FieldLabel required className={labelCls}>高校名</FieldLabel>
          <input required value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} className={inputCls} />
        </div>
        <div>
          <FieldLabel required className={labelCls}>卒業年度</FieldLabel>
          <input type="number" required min={2020} max={2040} value={form.graduationYear} onChange={(e) => set("graduationYear", parseInt(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>携帯電話番号</label>
          <input value={form.mobilePhone} onChange={(e) => set("mobilePhone", e.target.value)} className={inputCls} placeholder="090-1234-5678" />
        </div>
        <div>
          <label className={labelCls}>郵便番号</label>
          <input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} className={inputCls} placeholder="1234567" />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>住所</label>
          <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>入塾校舎</label>
          <select value={form.campus} onChange={(e) => set("campus", e.target.value)} className={inputCls}>
            <option value="">未選択</option>
            {campusOptions.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>塾の紹介者</label>
          <input value={form.referrer} onChange={(e) => set("referrer", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>文理</label>
          <select value={form.track} onChange={(e) => set("track", e.target.value)} className={inputCls}>
            <option value="">未選択</option>
            {TRACKS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>第1志望校</label>
          <input value={form.firstChoiceSchool} onChange={(e) => set("firstChoiceSchool", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>志望する学部系統</label>
          <input value={form.desiredFaculty} onChange={(e) => set("desiredFaculty", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>出願思考</label>
          <select value={form.applicationPolicy} onChange={(e) => set("applicationPolicy", e.target.value)} className={inputCls}>
            <option value="">未設定</option>
            {APPLICATION_POLICY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>志望校立地</label>
          <select value={form.locationPreference} onChange={(e) => set("locationPreference", e.target.value)} className={inputCls}>
            <option value="">未設定</option>
            {LOCATION_PREFERENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>英検受験予定</label>
          <input value={form.eikenPlan} onChange={(e) => set("eikenPlan", e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-center mt-6">
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={form.considerRecommendation}
              onChange={(e) => set("considerRecommendation", e.target.checked)}
            />
            総合・推薦の検討あり
          </label>
        </div>
        <div>
          <FieldLabel required className={labelCls}>入塾日</FieldLabel>
          <input type="date" required value={form.enrollmentDate} onChange={(e) => set("enrollmentDate", e.target.value)} className={inputCls} />
        </div>
        <div>
          <FieldLabel required className={labelCls}>保護者氏名</FieldLabel>
          <input required value={form.parentName} onChange={(e) => set("parentName", e.target.value)} className={inputCls} />
        </div>
        <div>
          <FieldLabel required className={labelCls}>保護者電話番号</FieldLabel>
          <input required value={form.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} className={inputCls} />
        </div>
        <div>
          <FieldLabel required className={labelCls}>保護者メール</FieldLabel>
          <input type="email" required value={form.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={`${labelCls} mb-2`}>受験科目（複数選択可）</label>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleExamSubject(s)}
              className={`px-3 py-1 rounded-full text-sm ${
                form.examSubjects.includes(s)
                  ? "bg-primary text-white"
                  : "bg-surface text-charcoal hover:bg-gray-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>備考</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={inputCls} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="bg-primary text-white px-6 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50">
          {saving ? "登録中..." : "登録する"}
        </button>
      </div>
    </form>
  );
}
