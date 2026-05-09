"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentCheckOutButton({
  campus,
  campusLabel,
}: {
  campus: string;
  campusLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (!confirm(`${campusLabel} を退室します。よろしいですか?\n（自習室利用で +1 pt 獲得します）`)) return;
    setBusy(true);
    const res = await fetch("/api/study-room/check-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campus }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`退室に失敗しました: ${data.error || res.status}`);
    }
    setBusy(false);
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="mt-2 w-full bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-red-600 disabled:opacity-50"
    >
      {busy ? "処理中..." : "退室する"}
    </button>
  );
}
