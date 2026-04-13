"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SUBJECTS, CAMPUSES, TRACKS, GENDERS } from "@/lib/types";

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
  examSubjects: string[];
  considerRecommendation: boolean;
  eikenPlan: string;
  campus: string;
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
  examSubjects: [],
  considerRecommendation: false,
  eikenPlan: "",
  campus: "",
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
  const [postalLoading, setPostalLoading] = useState(false);

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
            furigana: data.furigana || "",
            gender: data.gender || "",
            birthDate: data.birthDate ? data.birthDate.split("T")[0] : "",
            mobilePhone: data.mobilePhone || "",
            postalCode: data.postalCode || "",
            address: data.address || "",
            referrer: data.referrer || "",
            track: data.track || "",
            firstChoiceSchool: data.firstChoiceSchool || "",
            desiredFaculty: data.desiredFaculty || "",
            examSubjects: data.examSubjects ? JSON.parse(data.examSubjects) : [],
            considerRecommendation: !!data.considerRecommendation,
            eikenPlan: data.eikenPlan || "",
            campus: data.campus || "",
          });
          setLoading(false);
        });
    }
  }, [id, isNew]);

  const lookupPostal = async (code: string) => {
    const digits = code.replace(/[^0-9]/g, "");
    if (digits.length !== 7) return;
    setPostalLoading(true);
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`);
      const json = await res.json();
      if (json.results && json.results[0]) {
        const r = json.results[0];
        const addr = `${r.address1}${r.address2}${r.address3}`;
        setForm((prev) => ({ ...prev, address: addr }));
      }
    } finally {
      setPostalLoading(false);
    }
  };

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

  const set = <K extends keyof StudentForm>(key: K, value: StudentForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleExamSubject = (subject: string) => {
    setForm((prev) => ({
      ...prev,
      examSubjects: prev.examSubjects.includes(subject)
        ? prev.examSubjects.filter((s) => s !== subject)
        : [...prev.examSubjects, subject],
    }));
  };

  if (loading) return <div className="text-dark/60">読み込み中...</div>;

  const inputCls = "mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm";

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">
        {isNew ? "生徒新規登録" : "生徒情報編集"}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-3xl space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal">氏名</label>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">ふりがな</label>
            <input value={form.furigana} onChange={(e) => set("furigana", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">メールアドレス</label>
            <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
          </div>
          {isNew && (
            <div>
              <label className="block text-sm font-medium text-charcoal">パスワード</label>
              <input type="password" required value={form.password} onChange={(e) => set("password", e.target.value)} className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-charcoal">性別</label>
            <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className={inputCls}>
              <option value="">未選択</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">生年月日</label>
            <input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">高校名</label>
            <input required value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">卒業年度</label>
            <input type="number" required min={2020} max={2040} value={form.graduationYear} onChange={(e) => set("graduationYear", parseInt(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">携帯電話番号</label>
            <input value={form.mobilePhone} onChange={(e) => set("mobilePhone", e.target.value)} className={inputCls} placeholder="090-1234-5678" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">
              郵便番号 {postalLoading && <span className="text-xs text-dark/60">(検索中...)</span>}
            </label>
            <input
              value={form.postalCode}
              onChange={(e) => {
                const v = e.target.value;
                set("postalCode", v);
                lookupPostal(v);
              }}
              className={inputCls}
              placeholder="1234567 または 123-4567"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-charcoal">住所</label>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">入塾校舎</label>
            <select value={form.campus} onChange={(e) => set("campus", e.target.value)} className={inputCls}>
              <option value="">未選択</option>
              {CAMPUSES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">塾の紹介者</label>
            <input value={form.referrer} onChange={(e) => set("referrer", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">文理</label>
            <select value={form.track} onChange={(e) => set("track", e.target.value)} className={inputCls}>
              <option value="">未選択</option>
              {TRACKS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">第1志望校</label>
            <input value={form.firstChoiceSchool} onChange={(e) => set("firstChoiceSchool", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">志望する学部系統</label>
            <input value={form.desiredFaculty} onChange={(e) => set("desiredFaculty", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">英検受験予定</label>
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
            <label className="block text-sm font-medium text-charcoal">ステータス</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
              <option value="active">在籍</option>
              <option value="inactive">休塾</option>
              <option value="withdrawn">退塾</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">入塾日</label>
            <input type="date" required value={form.enrollmentDate} onChange={(e) => set("enrollmentDate", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">保護者氏名</label>
            <input required value={form.parentName} onChange={(e) => set("parentName", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">保護者電話番号</label>
            <input required value={form.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">保護者メール</label>
            <input type="email" required value={form.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">受験科目（複数選択可）</label>
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
          <label className="block text-sm font-medium text-charcoal">備考</label>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={inputCls} />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50">
            {saving ? "保存中..." : "保存"}
          </button>
          <button type="button" onClick={() => router.back()} className="bg-surface text-charcoal px-4 py-2 rounded-md text-sm hover:bg-gray-200">
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
