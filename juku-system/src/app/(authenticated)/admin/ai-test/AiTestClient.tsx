"use client";

import { useState } from "react";

export type StudentOption = {
  id: string;
  name: string;
  firstChoiceSchool: string;
  graduationYear: number;
};

type SchoolAssessment = {
  name: string;
  positioning: "挑戦" | "実力相応" | "安全";
  assessment: string;
  rationale: string;
};

type DiagnosisResult = {
  student: { id: string; name: string };
  model: string;
  result: {
    summary: string;
    schools: SchoolAssessment[];
    weakSubjects: { subject: string; comment: string; recommendedAction: string }[];
    overallAdvice: string;
  };
  usage: { inputTokens: number | null; outputTokens: number | null };
  elapsedMs: number;
};

const MODELS = [
  { value: "anthropic/claude-sonnet-4.6", label: "Sonnet 4.6（既定・無料枠可）" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o mini（低コスト・無料枠可）" },
  { value: "anthropic/claude-opus-4.8", label: "Opus 4.8（最高品質・要有料クレジット）" },
];

const POS_STYLE: Record<string, string> = {
  挑戦: "bg-red-100 text-red-700",
  実力相応: "bg-yellow-100 text-yellow-700",
  安全: "bg-green-100 text-green-700",
};

export default function AiTestClient({ students }: { students: StudentOption[] }) {
  const [studentId, setStudentId] = useState("");
  const [model, setModel] = useState(MODELS[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<DiagnosisResult | null>(null);

  const run = async () => {
    if (!studentId || loading) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/admin/ai-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, model }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `エラー (${res.status})`);
      } else {
        setData(json);
      }
    } catch (e) {
      setError("通信に失敗しました: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="block text-sm font-medium text-dark mb-1">生徒</span>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">選択してください</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.firstChoiceSchool ? `（志望: ${s.firstChoiceSchool}）` : "（志望校未設定）"}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-dark mb-1">モデル</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          onClick={run}
          disabled={!studentId || loading}
          className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? "診断生成中..." : "診断する"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dark/50 border-b border-gray-100 pb-3">
            <span className="font-medium text-dark/70">{data.student.name} の診断</span>
            <span>モデル: {data.model}</span>
            <span>
              トークン: in {data.usage.inputTokens ?? "?"} / out {data.usage.outputTokens ?? "?"}
            </span>
            <span>{(data.elapsedMs / 1000).toFixed(1)}秒</span>
            <span className="text-amber-600">※参考値（保存されません）</span>
          </div>

          <section>
            <h2 className="text-sm font-bold text-dark mb-1">総評</h2>
            <p className="text-sm text-dark/80 whitespace-pre-wrap">{data.result.summary}</p>
          </section>

          <section>
            <h2 className="text-sm font-bold text-dark mb-2">志望校の位置づけ</h2>
            <div className="space-y-3">
              {data.result.schools.map((s, i) => (
                <div key={i} className="border border-gray-200 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-dark text-sm">{s.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        POS_STYLE[s.positioning] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.positioning}
                    </span>
                  </div>
                  <p className="text-sm text-dark/80">{s.assessment}</p>
                  <p className="text-xs text-dark/50 mt-1">根拠: {s.rationale}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-dark mb-2">弱点科目と推奨アクション</h2>
            <div className="space-y-2">
              {data.result.weakSubjects.map((w, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium text-dark">{w.subject}</span>
                  <span className="text-dark/70">：{w.comment}</span>
                  <p className="text-xs text-primary mt-0.5">→ {w.recommendedAction}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-dark mb-1">総合アドバイス</h2>
            <p className="text-sm text-dark/80 whitespace-pre-wrap">{data.result.overallAdvice}</p>
          </section>
        </div>
      )}
    </div>
  );
}
