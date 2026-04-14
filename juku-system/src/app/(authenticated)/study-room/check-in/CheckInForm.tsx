"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CheckInForm({
  campus,
  boothAvailable,
  tableAvailable,
}: {
  campus: string;
  boothAvailable: number;
  tableAvailable: number;
}) {
  const router = useRouter();
  const [seatType, setSeatType] = useState<"booth" | "table">(
    boothAvailable > 0 ? "booth" : tableAvailable > 0 ? "table" : "booth"
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/study-room/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campus, seatType }),
    });
    const data = await res.json();
    if (res.ok) {
      setOk(true);
      setMsg("入室しました");
      router.refresh();
    } else {
      setMsg(data.error || "失敗しました");
    }
    setBusy(false);
  };

  const option = (value: "booth" | "table", label: string, avail: number) => {
    const full = avail <= 0;
    const active = seatType === value;
    return (
      <button
        key={value}
        type="button"
        disabled={full || ok}
        onClick={() => setSeatType(value)}
        className={`p-3 rounded-md border text-sm ${
          active ? "border-primary bg-primary-light text-primary font-semibold" : "border-gray-300 bg-white text-dark/70"
        } ${full ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div>{label}</div>
        <div className="text-xs mt-0.5">
          {full ? "満席" : `残${avail}席`}
        </div>
      </button>
    );
  };

  return (
    <div>
      <p className="text-sm text-dark/70 mb-2">席種を選択</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {option("booth", "ブース席", boothAvailable)}
        {option("table", "テーブル席", tableAvailable)}
      </div>
      <button
        onClick={submit}
        disabled={busy || ok || (seatType === "booth" ? boothAvailable : tableAvailable) <= 0}
        className="w-full bg-primary text-white text-lg font-bold px-6 py-3 rounded-md hover:bg-primary-dark disabled:opacity-60"
      >
        {busy ? "処理中..." : ok ? "完了 ✓" : "入室する"}
      </button>
      {msg && <p className={`mt-3 text-sm ${ok ? "text-green-600" : "text-red-600"}`}>{msg}</p>}
    </div>
  );
}
