"use client";

import { useState } from "react";

type Alert = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | Date;
};

export default function AlertList({ initialAlerts }: { initialAlerts: Alert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);

  const markAsRead = async (id: string) => {
    await fetch(`/api/alerts/${id}`, { method: "PUT" });
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
    );
  };

  const markAllAsRead = async () => {
    await fetch("/api/alerts/mark-all-read", { method: "PUT" });
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  };

  const deleteAlert = async (id: string) => {
    if (!confirm("このアラートを削除しますか？")) return;
    const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const deleteAllRead = async () => {
    const readAlerts = alerts.filter((a) => a.isRead);
    if (readAlerts.length === 0) return;
    if (!confirm(`既読アラート ${readAlerts.length}件 を削除しますか？`)) return;
    await Promise.all(
      readAlerts.map((a) =>
        fetch(`/api/alerts/${a.id}`, { method: "DELETE" })
      )
    );
    setAlerts((prev) => prev.filter((a) => !a.isRead));
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "task_overdue": return "期限超過";
      case "shift_reminder": return "シフト";
      case "progress_warning": return "進捗警告";
      default: return "一般";
    }
  };

  const typeClass = (type: string) => {
    switch (type) {
      case "task_overdue": return "bg-red-100 text-red-800";
      case "shift_reminder": return "bg-blue-100 text-blue-800";
      case "progress_warning": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const readCount = alerts.filter((a) => a.isRead).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <p className="text-sm text-charcoal">
          未読: {unreadCount}件 / 既読: {readCount}件
        </p>
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-primary hover:underline"
            >
              全て既読にする
            </button>
          )}
          {readCount > 0 && (
            <button
              onClick={deleteAllRead}
              className="text-sm text-red-500 hover:underline"
            >
              既読を一括削除
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`bg-white rounded-lg shadow p-4 border-l-4 ${
              alert.isRead ? "border-gray-200 opacity-60" : "border-primary"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeClass(alert.type)}`}>
                    {typeLabel(alert.type)}
                  </span>
                  <h3 className="font-medium text-dark">{alert.title}</h3>
                </div>
                <p className="text-sm text-charcoal">{alert.message}</p>
                <p className="text-xs text-dark/40 mt-1">
                  {new Date(alert.createdAt).toLocaleString("ja-JP")}
                </p>
              </div>
              <div className="flex gap-3 items-center ml-4 whitespace-nowrap">
                {!alert.isRead && (
                  <button
                    onClick={() => markAsRead(alert.id)}
                    className="text-xs text-primary hover:underline"
                  >
                    既読にする
                  </button>
                )}
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <p className="text-center text-dark/60 py-8">アラートはありません</p>
        )}
      </div>
    </div>
  );
}
