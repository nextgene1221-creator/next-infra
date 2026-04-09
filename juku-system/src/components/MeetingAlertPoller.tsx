"use client";

import { useEffect } from "react";

// クライアントサイドで1分ごとに全自動アラートをチェック
export default function MeetingAlertPoller() {
  useEffect(() => {
    const check = () => {
      fetch("/api/alerts/check-all", { method: "POST" }).catch(() => {});
    };

    // 初回チェック
    check();
    const intervalId = setInterval(check, 60000); // 60秒ごと

    return () => clearInterval(intervalId);
  }, []);

  return null;
}
