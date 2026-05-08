"use client";

import { useState } from "react";

export default function PasswordResetButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (
      !confirm(
        `${userName} のパスワードを初期値 (password123) にリセットします。よろしいですか？\n\nリセット後、本人にログインしてもらい「パスワード変更」から新しいパスワードに変更してもらってください。`,
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        alert(
          `${data.userName} のパスワードを「${data.resetPassword}」にリセットしました。\n本人にログインしてもらい、サイドバーの「パスワード変更」から新しいパスワードに変えてもらってください。`,
        );
      } else {
        const j = await res.json().catch(() => ({}));
        alert(`リセットに失敗しました: ${j.error || res.status}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="text-xs px-2 py-1 rounded border border-amber-500 text-amber-700 hover:bg-amber-500 hover:text-white disabled:opacity-50"
    >
      {busy ? "処理中..." : "パスワードリセット"}
    </button>
  );
}
