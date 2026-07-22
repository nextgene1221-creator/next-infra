"use client";

import { useRef, useState } from "react";

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

type ChatMessage = { role: "user" | "assistant"; content: string };

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

// 構造化レコメンドを、会話コンテキスト用のテキストに変換（AIが「自分が既に言ったこと」として認識するため）
function diagnosisToText(d: DiagnosisResult): string {
  const schools = d.result.schools
    .map((s) => `- ${s.name}（${s.positioning}）: ${s.assessment}`)
    .join("\n");
  const weak = d.result.weakSubjects.map((w) => `- ${w.subject}: ${w.comment} → ${w.recommendedAction}`).join("\n");
  return [
    `【現状レコメンド】`,
    d.result.summary,
    ``,
    `▼ 現時点でおすすめの志望校候補`,
    schools,
    ``,
    `▼ 伸ばしたい科目`,
    weak,
    ``,
    d.result.overallAdvice,
    ``,
    `ここまでが今の学力に基づく提案です。ここからは希望や条件を聞かせてください。例えば「学びたい分野」「行きたい地域」「国公立か私立か」「一人暮らしはできるか」などがあると、より合った大学を一緒に絞り込めます。`,
  ].join("\n");
}

export default function AiTestClient({ students }: { students: StudentOption[] }) {
  const [tab, setTab] = useState<"consult" | "strategy">("consult");
  const [studentId, setStudentId] = useState("");
  const [model, setModel] = useState(MODELS[0].value);
  const [error, setError] = useState("");

  // ① コンサル（レコメンド→会話）
  const [starting, setStarting] = useState(false);
  const [diag, setDiag] = useState<DiagnosisResult | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ② 戦略
  const [loading, setLoading] = useState(false);
  const [budgetYen, setBudgetYen] = useState("");
  const [airfareYen, setAirfareYen] = useState("");
  const [lodgingYen, setLodgingYen] = useState("");
  const [strategy, setStrategy] = useState<StrategyResult | null>(null);

  const startConsult = async () => {
    if (!studentId || starting) return;
    setStarting(true); setError(""); setDiag(null); setChat([]);
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
    } finally { setStarting(false); }
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || !diag || chatLoading) return;
    setError("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const nextChat = [...chat, userMsg];
    setChat(nextChat);
    setChatInput("");
    setChatLoading(true);
    // 会話履歴の先頭にレコメンド（assistant発言）を種として付与
    const seed: ChatMessage = { role: "assistant", content: diagnosisToText(diag) };
    try {
      const res = await fetch("/api/admin/ai-test/consult", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, model, messages: [seed, ...nextChat] }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `エラー (${res.status})`);
        setChat(chat); // ロールバック
      } else {
        setChat([...nextChat, { role: "assistant", content: json.reply }]);
      }
    } catch (e) {
      setError("通信に失敗しました: " + (e instanceof Error ? e.message : String(e)));
      setChat(chat);
    } finally {
      setChatLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
    }
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

  const tabBtn = (key: "consult" | "strategy", label: string) => (
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
            <select value={studentId} onChange={(e) => { setStudentId(e.target.value); setDiag(null); setChat([]); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
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
        {tabBtn("consult", "① 志望校コンサル")}
        {tabBtn("strategy", "② 出願戦略")}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">{error}</div>}

      {/* ① コンサルタブ */}
      {tab === "consult" && (
        <div className="space-y-5">
          {!diag && (
            <div className="space-y-2">
              <p className="text-sm text-dark/60">
                まず現状の学力に合った志望校をレコメンドし、その後は会話で希望・条件を伝えながら一緒に志望校を絞り込みます。
              </p>
              <button onClick={startConsult} disabled={!studentId || starting} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50">
                {starting ? "レコメンド生成中…" : "相談を始める（レコメンド）"}
              </button>
            </div>
          )}

          {diag && (
            <>
              {/* レコメンド（オープナー） */}
              <div className="bg-white rounded-lg shadow-sm p-5 space-y-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dark/50 border-b border-gray-100 pb-3">
                  <span className="font-medium text-dark/70">{diag.student.name} へのレコメンド</span>
                  <span>モデル: {diag.model}</span>
                  <span className="text-amber-600">※参考値（保存されません）</span>
                  <button onClick={startConsult} className="ml-auto text-primary hover:underline">レコメンドを作り直す</button>
                </div>
                <section><p className="text-sm text-dark/80 whitespace-pre-wrap">{diag.result.summary}</p></section>
                <section>
                  <h2 className="text-sm font-bold text-dark mb-2">現時点のおすすめ志望校</h2>
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
                  <h2 className="text-sm font-bold text-dark mb-2">伸ばしたい科目</h2>
                  <div className="space-y-2">
                    {diag.result.weakSubjects.map((w, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-medium text-dark">{w.subject}</span><span className="text-dark/70">：{w.comment}</span>
                        <p className="text-xs text-primary mt-0.5">→ {w.recommendedAction}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* 会話 */}
              <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                <h2 className="text-sm font-bold text-dark">AIに相談する</h2>
                <p className="text-xs text-dark/50">
                  学びたい分野・行きたい地域・国公立/私立・一人暮らしの可否・予算など、希望や条件を伝えると、それに合う大学を一緒に絞り込みます。
                </p>
                <div ref={scrollRef} className="max-h-[28rem] overflow-y-auto space-y-3 py-1">
                  {chat.length === 0 && (
                    <p className="text-xs text-dark/40 text-center py-4">まだ会話はありません。下の入力欄から希望を伝えてください。</p>
                  )}
                  {chat.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-white" : "bg-surface text-dark"}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-surface text-dark/50 rounded-lg px-3 py-2 text-sm">考え中…</div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-end">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    rows={2}
                    placeholder="例: 心理学を学びたいです。できれば九州で、国公立が希望です。"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
                  />
                  <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50 whitespace-nowrap">
                    送信
                  </button>
                </div>
                <p className="text-[11px] text-dark/40">Enterで送信 / Shift+Enterで改行</p>
              </div>
            </>
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
