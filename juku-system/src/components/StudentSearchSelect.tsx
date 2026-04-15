"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type StudentPickerOption = {
  id: string;
  name: string;
  hint?: string; // 学校名など補足表示
};

/**
 * 生徒を検索して1名選ぶUI。
 * インクリメンタル検索（前方一致・部分一致）＋候補ドロップダウン。
 */
export default function StudentSearchSelect({
  students,
  value,
  onChange,
  placeholder = "生徒名で検索...",
  disabled = false,
  autoFocus = false,
  excludeIds = [],
}: {
  students: StudentPickerOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  excludeIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = students.find((s) => s.id === value);

  // 選択中の生徒名をクエリ欄にも反映
  useEffect(() => {
    if (selected) setQuery(selected.name);
    else setQuery("");
  }, [value, selected]);

  // 外クリックで閉じる
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const excluded = new Set(excludeIds);
    const base = students.filter((s) => !excluded.has(s.id));
    if (!q) return base.slice(0, 20);
    return base
      .filter((s) =>
        s.name.toLowerCase().includes(q) ||
        (s.hint ?? "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [query, students, excludeIds]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };
  const clear = () => {
    onChange("");
    setQuery("");
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        <input
          type="text"
          disabled={disabled}
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            // 文字を変えたら選択解除
            if (value && e.target.value !== selected?.name) onChange("");
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        {value && !disabled && (
          <button type="button" onClick={clear} className="px-2 text-sm text-dark/60 hover:text-dark" title="クリア">✕</button>
        )}
      </div>
      {open && !disabled && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-y-auto text-sm">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-dark/60">該当なし</li>
          ) : (
            filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pick(s.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-surface ${s.id === value ? "bg-primary-light text-primary font-medium" : ""}`}
                >
                  {s.name}
                  {s.hint && <span className="text-xs text-dark/60 ml-2">{s.hint}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
