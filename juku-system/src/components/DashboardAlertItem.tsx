"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

export default function DashboardAlertItem({ id, title, message, createdAt }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);

  const markRead = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "PUT" });
      if (!res.ok) throw new Error();
      setHidden(true);
      router.refresh();
    } catch {
      alert("既読化に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (hidden) return null;

  return (
    <li className="flex items-start justify-between gap-3 p-3 bg-primary-light border border-primary/20 rounded-md">
      <div>
        <p className="font-medium text-dark">{title}</p>
        <p className="text-sm text-charcoal">{message}</p>
        <p className="text-xs text-dark/50 mt-1">{new Date(createdAt).toLocaleString("ja-JP")}</p>
      </div>
      <button
        onClick={markRead}
        disabled={loading}
        className="shrink-0 text-xs px-2 py-1 rounded border border-primary/40 text-primary hover:bg-primary hover:text-white disabled:opacity-50"
      >
        {loading ? "..." : "既読"}
      </button>
    </li>
  );
}
