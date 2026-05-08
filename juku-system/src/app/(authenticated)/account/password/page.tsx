"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FieldLabel from "@/components/FieldLabel";

const MIN_LENGTH = 6;

export default function PasswordChangePage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < MIN_LENGTH) {
      setError(`新しいパスワードは${MIN_LENGTH}文字以上にしてください`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("新しいパスワードと確認用パスワードが一致しません");
      return;
    }
    if (currentPassword === newPassword) {
      setError("新しいパスワードは現在のものと異なる必要があります");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "更新に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm";
  const labelCls = "block text-sm font-medium text-charcoal";

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">パスワード変更</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow p-6 max-w-md space-y-4"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded text-sm">
            パスワードを更新しました
          </div>
        )}

        <div>
          <FieldLabel required className={labelCls}>現在のパスワード</FieldLabel>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <FieldLabel required className={labelCls}>新しいパスワード</FieldLabel>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={MIN_LENGTH}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-dark/60 mt-1">{MIN_LENGTH}文字以上</p>
        </div>

        <div>
          <FieldLabel required className={labelCls}>新しいパスワード（確認）</FieldLabel>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={MIN_LENGTH}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
          >
            {saving ? "更新中..." : "パスワードを変更"}
          </button>
        </div>
      </form>
    </div>
  );
}
