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

type StrategyResult = {
  student: { id: string; name: string };
  model: string;
  assumptions: { budgetYen: number | null; airfareYen: number; lodgingYen: number; universityDataCount: number };
  result: {
    summary: string;
    plan: { name: string; faculty: string; method: string; tier: "本命" | "併願" | "滑り止め"; examDate: string; examFeeYen: number | null; rationale: string }[];
    scheduleConflicts: { dates: string; description: string }[];
    costEstimate: {
      examFeesTotalYen: number | null;
      tripsAssumed: number | null;
      nightsAssumed: number | null;
      travelTotalYen: number | null;
      lodgingTotalYen: number | null;
      grandTotalYen: number | null;
      notes: string;
    };
    risks: string[];
    advice: string;
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
const TIER_STYLE: Record<string, string> = {
  本命: "bg-primary/10 text-primary",
  併願: "bg-blue-100 text-blue-700",
  滑り止め: "bg-green-100 text-green-700",
};

const yen = (n: number | null | undefined) => (n == null ? "—" : `¥${n.toLocaleString()}`);

export default function AiTestClient({ students }: { students: StudentOption[] }) {
  const [tab, setTab] = useState<"diagnosis" | "strategy">("diagnosis");
  const [studentId, setStudentId] = useState("");
  const [model, setModel] = useState(MODELS[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ① 診断
  const [diag, setDiag] = useState<DiagnosisResult | null>(null);
  // ② 戦略
  const [budgetYen, setBudgetYen] = useState("");
  const [airfareYen, setAirfareYen] = useState("");
  const [lodgingYen, setLodgingYen] = useState("");
  const [strategy, setStrategy] = useState<StrategyResult | null>(null);

  const runDiagnosis = async () => {
    if (!studentId || loading) return;
    setLoading(true); setError(""); setDiag(null);
    try {
      const res = await fetch("/api/admin/ai-test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, model }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || `エラー (${res.status})`);
      else setDiag(json);
    } catch (e) {
      setError("通信に失敗しました: " + (e instanceof Error ? e.message : String(e)));
    } finally { setLoading(false); }
  };

  const runStrategy = async () => {
    if (!studentId || loading) return;
    setLoading(true); setError(""); setStrategy(null);
    try {
      const res = await fetch("/api/admin/ai-test/strategy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, model, budgetYen, airfareYen, lodgingYen }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || `エラー (${res.status})`);
      else setStrategy(json);
    } catch (e) {
      setError("通信に失敗しました: " + (e instanceof Error ? e.message : String(e)));
    } finally { setLoading(false); }
  };

  const tabBtn = (key: "diagnosis" | "strategy", label: string) => (
    <button
      onClick={() => { setTab(key); setError(""); }}
      className={`px-4 py-2 text-sm font-medium rounded-t-md ${tab === key ? "bg-white text-primary border-b-2 border-primary" : "bg-transparent text-dark/50 hover:text-dark"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* 共通: 生徒・モデル選択 */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="block text-sm font-medium text-dark mb-1">生徒</span>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">選択してください</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.firstChoiceSchool ? `（志望: ${s.firstChoiceSchool}）` : "（志望校未設定）"}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-dark mb-1">モデル</span>
            <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* タブ */}
      <div className="border-b border-gray-200 flex gap-1">
        {tabBtn("diagnosis", "① 志望校診断")}
        {tabBtn("strategy", "② 出願戦略")}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">{error}</div>}

      {/* ① 診断タブ */}
      {tab === "diagnosis" && (
        <div className="space-y-5">
          <button onClick={runDiagnosis} disabled={!studentId || loading} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50">
            {loading ? "診断生成中…" : "診断する"}
          </button>
          {diag && (
            <div className="bg-white rounded-lg shadow-sm p-5 space-y-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dark/50 border-b border-gray-100 pb-3">
                <span className="font-medium text-dark/70">{diag.student.name} の診断</span>
                <span>モデル: {diag.model}</span>
                <span>トークン: in {diag.usage.inputTokens ?? "?"} / out {diag.usage.outputTokens ?? "?"}</span>
                <span>{(diag.elapsedMs / 1000).toFixed(1)}秒</span>
                <span className="text-amber-600">※参考値（保存されません）</span>
              </div>
              <section><h2 className="text-sm font-bold text-dark mb-1">総評</h2><p className="text-sm text-dark/80 whitespace-pre-wrap">{diag.result.summary}</p></section>
              <section>
                <h2 className="text-sm font-bold text-dark mb-2">志望校の位置づけ</h2>
                <div className="space-y-3">
                  {diag.result.schools.map((s, i) => (
                    <div key={i} className="border border-gray-200 rounded-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-dark text-sm">{s.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POS_STYLE[s.positioning] ?? "bg-gray-100 text-gray-600"}`}>{s.positioning}</span>
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
                  {diag.result.weakSubjects.map((w, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium text-dark">{w.subject}</span><span className="text-dark/70">：{w.comment}</span>
                      <p className="text-xs text-primary mt-0.5">→ {w.recommendedAction}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section><h2 className="text-sm font-bold text-dark mb-1">総合アドバイス</h2><p className="text-sm text-dark/80 whitespace-pre-wrap">{diag.result.overallAdvice}</p></section>
            </div>
          )}
        </div>
      )}

      {/* ② 戦略タブ */}
      {tab === "strategy" && (
        <div className="space-y-5">
          <div className="bg-white rounded-lg shadow-sm p-4 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="block text-xs font-medium text-dark/70 mb-1">予算感（円・任意）</span>
              <input value={budgetYen} onChange={(e) => setBudgetYen(e.target.value)} placeholder="例: 300000" inputMode="numeric" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-dark/70 mb-1">往復航空券/遠征（既定4万）</span>
              <input value={airfareYen} onChange={(e) => setAirfareYen(e.target.value)} placeholder="40000" inputMode="numeric" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-dark/70 mb-1">宿泊費/泊（既定8千）</span>
              <input value={lodgingYen} onChange={(e) => setLodgingYen(e.target.value)} placeholder="8000" inputMode="numeric" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </label>
          </div>
          <button onClick={runStrategy} disabled={!studentId || loading} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50">
            {loading ? "戦略生成中…" : "出願戦略を作成"}
          </button>

          {strategy && (
            <div className="bg-white rounded-lg shadow-sm p-5 space-y-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dark/50 border-b border-gray-100 pb-3">
                <span className="font-medium text-dark/70">{strategy.student.name} の出願戦略</span>
                <span>モデル: {strategy.model}</span>
                <span>大学データ {strategy.assumptions.universityDataCount} 件参照</span>
                <span>{(strategy.elapsedMs / 1000).toFixed(1)}秒</span>
                <span className="text-amber-600">※参考値（保存されません）</span>
              </div>
              <section><h2 className="text-sm font-bold text-dark mb-1">総評</h2><p className="text-sm text-dark/80 whitespace-pre-wrap">{strategy.result.summary}</p></section>

              <section>
                <h2 className="text-sm font-bold text-dark mb-2">出願プラン</h2>
                <div className="space-y-2">
                  {strategy.result.plan.map((p, i) => (
                    <div key={i} className="border border-gray-200 rounded-md p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_STYLE[p.tier] ?? "bg-gray-100 text-gray-600"}`}>{p.tier}</span>
                        <span className="font-medium text-dark text-sm">{p.name}</span>
                        <span className="text-xs text-dark/50">{p.faculty}</span>
                      </div>
                      <div className="text-xs text-dark/60 flex flex-wrap gap-x-3">
                        <span>方式: {p.method || "—"}</span>
                        <span>試験日: {p.examDate || "—"}</span>
                        <span>受験料: {yen(p.examFeeYen)}</span>
                      </div>
                      <p className="text-sm text-dark/80 mt-1">{p.rationale}</p>
                    </div>
                  ))}
                </div>
              </section>

              {strategy.result.scheduleConflicts.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-dark mb-2">日程の衝突・注意</h2>
                  <div className="space-y-1">
                    {strategy.result.scheduleConflicts.map((c, i) => (
                      <p key={i} className="text-sm text-red-700">・{c.dates}: {c.description}</p>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-sm font-bold text-dark mb-2">費用試算（沖縄からの受験）</h2>
                <div className="bg-surface rounded-md p-3 text-sm grid gap-1 sm:grid-cols-2">
                  <div>受験料合計: <span className="font-medium">{yen(strategy.result.costEstimate.examFeesTotalYen)}</span></div>
                  <div>遠征回数 / 宿泊数: <span className="font-medium">{strategy.result.costEstimate.tripsAssumed ?? "—"} 回 / {strategy.result.costEstimate.nightsAssumed ?? "—"} 泊</span></div>
                  <div>移動費: <span className="font-medium">{yen(strategy.result.costEstimate.travelTotalYen)}</span></div>
                  <div>宿泊費: <span className="font-medium">{yen(strategy.result.costEstimate.lodgingTotalYen)}</span></div>
                  <div className="sm:col-span-2 text-base pt-1 border-t border-gray-200 mt-1">総額: <span className="font-bold text-primary">{yen(strategy.result.costEstimate.grandTotalYen)}</span></div>
                </div>
                {strategy.result.costEstimate.notes && <p className="text-xs text-dark/50 mt-1">{strategy.result.costEstimate.notes}</p>}
              </section>

              {strategy.result.risks.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-dark mb-1">想定リスク</h2>
                  <ul className="list-disc list-inside text-sm text-dark/80 space-y-0.5">
                    {strategy.result.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </section>
              )}
              <section><h2 className="text-sm font-bold text-dark mb-1">総合アドバイス</h2><p className="text-sm text-dark/80 whitespace-pre-wrap">{strategy.result.advice}</p></section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
