"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InRoomActions({
  campus,
  campusLabel,
  currentSeatType,
  boothAvailable,
  tableAvailable,
}: {
  campus: string;
  campusLabel: string;
  currentSeatType: "booth" | "table";
  boothAvailable: number;
  tableAvailable: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const otherSeatType = currentSeatType === "booth" ? "table" : "booth";
  const otherSeatLabel = otherSeatType === "booth" ? "ブース席" : "テーブル席";
  const otherAvail = otherSeatType === "booth" ? boothAvailable : tableAvailable;

  const checkOut = async () => {
    if (!confirm(`${campusLabel} を退室します。よろしいですか?\n（自習室利用で +1 pt 獲得します）`)) return;
    setBusy(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/study-room/check-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campus }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`退室しました（+${data.pointAwarded || 1} pt）`);
      router.refresh();
    } else {
      setError(data.error || "退室に失敗しました");
    }
    setBusy(false);
  };

  const changeSeat = async () => {
    if (!confirm(`席を「${otherSeatLabel}」に移動します。よろしいですか?`)) return;
    setBusy(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/study-room/change-seat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newSeatType: otherSeatType }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`「${otherSeatLabel}」に移動しました`);
      router.refresh();
    } else {
      setError(data.error || "席変更に失敗しました");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="bg-primary-light border border-primary/20 text-primary rounded-md px-4 py-3 text-sm">
        現在「{currentSeatType === "booth" ? "ブース席" : "テーブル席"}」で入室中です
      </div>
      <button
        onClick={changeSeat}
        disabled={busy || otherAvail <= 0}
        className="w-full bg-white text-charcoal border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-100 disabled:opacity-50"
      >
        {otherAvail <= 0
          ? `${otherSeatLabel}は満席`
          : `${otherSeatLabel}に席を移動 (残${otherAvail}席)`}
      </button>
      <button
        onClick={checkOut}
        disabled={busy}
        className="w-full bg-red-500 text-white text-base font-bold px-4 py-3 rounded-md hover:bg-red-600 disabled:opacity-50"
      >
        {busy ? "処理中..." : "退室する"}
      </button>
      {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
