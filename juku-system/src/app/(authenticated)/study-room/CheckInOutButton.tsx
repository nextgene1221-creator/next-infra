"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CheckInOutButton({
  action,
  campus,
  label,
}: {
  action: "check-in" | "check-out";
  campus: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/study-room/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campus }),
    });
    const data = await res.json();
    if (res.ok) {
      setOk(true);
      setMsg(action === "check-in" ? "入室しました" : `退室しました（${data.pointAwarded}P獲得）`);
      router.refresh();
    } else {
      setMsg(data.error || "失敗しました");
    }
    setBusy(false);
  };

  return (
    <div>
      <button
        onClick={submit}
        disabled={busy || ok}
        className="w-full bg-primary text-white text-lg font-bold px-6 py-3 rounded-md hover:bg-primary-dark disabled:opacity-60"
      >
        {busy ? "処理中..." : ok ? "完了 ✓" : label}
      </button>
      {msg && (
        <p className={`mt-3 text-sm ${ok ? "text-green-600" : "text-red-600"}`}>{msg}</p>
      )}
    </div>
  );
}
