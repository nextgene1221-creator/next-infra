"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function CheckInQR({ campus, label }: { campus: string; label: string }) {
  const [origin, setOrigin] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!origin) {
    return (
      <div className="flex flex-col items-center text-xs text-dark/50 py-4">
        QR を準備中...
      </div>
    );
  }

  const url = `${origin}/study-room/check-in?campus=${encodeURIComponent(campus)}`;

  return (
    <>
      <div className="flex flex-col items-center gap-1 mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-dark/60">📱 着席登録 QR ({label})</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-white rounded p-1 hover:ring-2 hover:ring-primary cursor-pointer"
          aria-label={`${label} の着席登録 QR を拡大`}
        >
          <QRCodeSVG value={url} size={96} />
        </button>
        <p className="text-[10px] text-dark/50 break-all max-w-[200px] text-center">
          クリックで拡大表示 (印刷用)
        </p>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-dark">{label} 着席登録 QR</h3>
            <div className="bg-white p-4 rounded">
              <QRCodeSVG value={url} size={320} />
            </div>
            <p className="text-xs text-dark/60 break-all text-center">{url}</p>
            <p className="text-xs text-dark/50 text-center">
              生徒がスマホで読み取り、ログイン済みなら即着席登録できます。<br />
              印刷して校舎の入口や席に掲示してください。
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => window.print()}
                className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-primary-dark"
              >
                印刷
              </button>
              <button
                onClick={() => setOpen(false)}
                className="bg-white text-charcoal px-4 py-2 rounded text-sm border border-gray-300 hover:bg-gray-100"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
