"use client";

import { useEffect } from "react";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

// クライアントサイドで定期的に全自動アラートをチェックする。
//
// 間隔は 60 秒 → 5 分に緩和（2026-08-28）。
// 叩き先の /api/alerts/check-all は DB クエリ 20 本超のバッチ処理で、
// これがログイン中の全ユーザーの全タブから走るため、Neon の compute が
// 常時起きたままになり Free プランの compute time を使い切って全機能が停止した。
export default function MeetingAlertPoller() {
  useEffect(() => {
    const check = () => {
      fetch("/api/alerts/check-all", { method: "POST" }).catch(() => {});
    };

    // 初回チェック
    check();
    const intervalId = setInterval(check, POLL_INTERVAL_MS); // 5分ごと

    return () => clearInterval(intervalId);
  }, []);

  return null;
}
