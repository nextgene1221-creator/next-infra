"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type SheetAnswers,
  CONFIDENCE_OPTIONS,
  PLAN_VS_ACTUAL_OPTIONS,
  DIFF_DIRECTION_OPTIONS,
  SAME_CONDITION_OPTIONS,
  DIFF_REASONS,
  SHEET_INTRO,
  SHEET_OUTRO,
} from "@/lib/meetingSheet";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-gray-100 pt-4">
      <h3 className="text-sm font-bold text-dark mb-3">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function MeetingSheetForm({
  sheetId,
  studentName,
  meetingDateLabel,
  initialStatus,
  initialAnswers,
  readOnly = false,
}: {
  sheetId: string;
  studentName: string;
  meetingDateLabel: string;
  initialStatus: string;
  initialAnswers: SheetAnswers;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [a, setA] = useState<SheetAnswers>(initialAnswers);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [error, setError] = useState("");

  const set = <K extends keyof SheetAnswers>(key: K, value: SheetAnswers[K]) =>
    setA((prev) => ({ ...prev, [key]: value }));

  const toggleReason = (key: string) => {
    setA((prev) => {
      const has = prev.diffReasons.includes(key);
      const diffReasons = has
        ? prev.diffReasons.filter((k) => k !== key)
        : [...prev.diffReasons, key];
      const diffReasonSub = { ...prev.diffReasonSub };
      if (has) delete diffReasonSub[key];
      return { ...prev, diffReasons, diffReasonSub };
    });
  };
  const setReasonSub = (key: string, sub: string) =>
    setA((prev) => ({ ...prev, diffReasonSub: { ...prev.diffReasonSub, [key]: sub } }));

  const save = async (nextStatus: "draft" | "submitted") => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/meeting-sheets/${sheetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: a, status: nextStatus }),
    });
    if (res.ok) {
      setStatus(nextStatus);
      setSavedAt(new Date().toLocaleTimeString("ja-JP"));
      if (nextStatus === "submitted") {
        router.push("/meeting-sheets");
        router.refresh();
        return;
      }
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "保存に失敗しました");
    }
    setSaving(false);
  };

  const radioGroup = (
    name: string,
    options: readonly string[],
    value: string,
    onChange: (v: string) => void
  ) => (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name={name}
            checked={value === o}
            onChange={() => onChange(o)}
            disabled={readOnly}
          />
          {o}
        </label>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-5 space-y-5 max-w-2xl">
      <p className="text-xs text-dark/60 bg-surface rounded-md p-3 leading-relaxed">{SHEET_INTRO}</p>

      {/* 【1】基本情報 */}
      <Section title="【1】基本情報">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-dark/60">氏名: </span>
            <span className="font-medium">{studentName}</span>
          </div>
          <div>
            <span className="text-dark/60">面談日: </span>
            <span className="font-medium">{meetingDateLabel || "未設定"}</span>
          </div>
        </div>
      </Section>

      {/* 【2】学習ログ */}
      <Section title="【2】今週の学習ログ（行動）">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-dark/70">今週の総学習時間</span>
          <span>目標</span>
          <input
            type="number"
            min={0}
            step="0.5"
            value={a.totalHoursTarget}
            onChange={(e) => set("totalHoursTarget", e.target.value)}
            disabled={readOnly}
            className="border border-gray-300 rounded px-2 py-1 w-20 disabled:bg-gray-50"
          />
          <span>時間 / 実績</span>
          <input
            type="number"
            min={0}
            step="0.5"
            value={a.totalHoursActual}
            onChange={(e) => set("totalHoursActual", e.target.value)}
            disabled={readOnly}
            className="border border-gray-300 rounded px-2 py-1 w-20 disabled:bg-gray-50"
          />
          <span>時間</span>
        </div>
        <div>
          <p className="text-sm text-dark/70 mb-1">今週の勉強の手応え</p>
          {radioGroup("confidence", CONFIDENCE_OPTIONS, a.confidence, (v) => set("confidence", v))}
        </div>
        <div>
          <p className="text-sm text-dark/70 mb-1">今週の計画外のタスク</p>
          <textarea
            value={a.unplannedTasks}
            onChange={(e) => set("unplannedTasks", e.target.value)}
            disabled={readOnly}
            rows={2}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50"
          />
        </div>
      </Section>

      {/* 【3】ズレ */}
      <Section title="【3】予定と実績のズレ（判断）">
        <div>
          <p className="text-sm text-dark/70 mb-1">予定と比べてどうでしたか？</p>
          {radioGroup("planVsActual", PLAN_VS_ACTUAL_OPTIONS, a.planVsActual, (v) => set("planVsActual", v))}
        </div>
        <div>
          <p className="text-sm text-dark/70 mb-1">予定と違った理由（当てはまるものすべて）</p>
          <div className="space-y-1.5">
            {DIFF_REASONS.map((r) => {
              const checked = a.diffReasons.includes(r.key);
              return (
                <div key={r.key} className="text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleReason(r.key)}
                      disabled={readOnly}
                    />
                    {r.label}
                  </label>
                  {checked && r.sub.length > 0 && (
                    <div className="ml-6 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {r.sub.map((s) => (
                        <label key={s} className="flex items-center gap-1 text-xs text-dark/80">
                          <input
                            type="radio"
                            name={`sub-${r.key}`}
                            checked={a.diffReasonSub[r.key] === s}
                            onChange={() => setReasonSub(r.key, s)}
                            disabled={readOnly}
                          />
                          {s}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-sm text-dark/70 mb-1">ズレの方向として近いものは？</p>
          {radioGroup("diffDirection", DIFF_DIRECTION_OPTIONS, a.diffDirection, (v) => set("diffDirection", v))}
        </div>
        <div>
          <p className="text-sm text-dark/70 mb-1">来週も同じ条件なら、同じズレが起きそうですか？</p>
          {radioGroup("sameCondition", SAME_CONDITION_OPTIONS, a.sameCondition, (v) => set("sameCondition", v))}
        </div>
        <div>
          <p className="text-sm text-dark/70 mb-1">補足があれば1行で</p>
          <input
            value={a.diffNote}
            onChange={(e) => set("diffNote", e.target.value)}
            disabled={readOnly}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50"
          />
        </div>
      </Section>

      {/* 【4】来週に向けて */}
      <Section title="【4】来週に向けて">
        <YesNoWithText
          label="来週も続けたいこと"
          has={a.continueHas}
          text={a.continueText}
          onHas={(v) => set("continueHas", v)}
          onText={(v) => set("continueText", v)}
          readOnly={readOnly}
        />
        <YesNoWithText
          label="来週、変えたいこと"
          has={a.changeHas}
          text={a.changeText}
          onHas={(v) => set("changeHas", v)}
          onText={(v) => set("changeText", v)}
          readOnly={readOnly}
        />
      </Section>

      {/* 【5】メモ */}
      <Section title="【5】メモ（相談したいこと・分からなかったこと等）">
        <textarea
          value={a.memo}
          onChange={(e) => set("memo", e.target.value)}
          disabled={readOnly}
          rows={4}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50"
        />
      </Section>

      <p className="text-xs text-dark/50">{SHEET_OUTRO}</p>

      {!readOnly && (
        <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
          <button
            onClick={() => save("draft")}
            disabled={saving}
            className="bg-white border border-gray-300 text-charcoal px-4 py-2 rounded-md text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            下書き保存
          </button>
          <button
            onClick={() => save("submitted")}
            disabled={saving}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
          >
            {status === "submitted" ? "再提出する" : "提出する"}
          </button>
          {savedAt && <span className="text-xs text-green-600">{savedAt} に保存</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      )}
    </div>
  );
}

function YesNoWithText({
  label,
  has,
  text,
  onHas,
  onText,
  readOnly,
}: {
  label: string;
  has: "" | "yes" | "no";
  text: string;
  onHas: (v: "yes" | "no") => void;
  onText: (v: string) => void;
  readOnly: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-dark/70 mb-1">{label}</p>
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={has === "yes"} onChange={() => onHas("yes")} disabled={readOnly} />
          ある
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={has === "no"} onChange={() => onHas("no")} disabled={readOnly} />
          ない
        </label>
      </div>
      {has === "yes" && (
        <input
          value={text}
          onChange={(e) => onText(e.target.value)}
          disabled={readOnly}
          placeholder="内容"
          className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50"
        />
      )}
    </div>
  );
}
