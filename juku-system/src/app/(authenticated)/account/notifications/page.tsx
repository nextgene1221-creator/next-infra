import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PushNotificationSetup from "@/components/PushNotificationSetup";

export const dynamic = "force-dynamic";

// 通知設定（アプリ化 Phase 1 / 2026-08-24）。端末ごとにプッシュ通知を有効にする。
export default async function NotificationSettingsPage() {
  const session = await requireAuth();

  const [devices, recent] = await Promise.all([
    prisma.pushDevice.findMany({
      where: { userId: session.user.id },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, platform: true, userAgent: true, lastSeenAt: true },
    }),
    prisma.notificationLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, title: true, body: true, createdAt: true, channels: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark mb-1">通知設定</h1>
        <p className="text-sm text-dark/60">
          アプリを開いていない間もお知らせを受け取れます。使う端末ごとに 1 回ずつ設定してください。
        </p>
      </div>

      <PushNotificationSetup />

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h2 className="text-base font-bold text-dark mb-3">登録済みの端末</h2>
        {devices.length === 0 ? (
          <p className="text-sm text-dark/50">まだありません。</p>
        ) : (
          <ul className="text-sm text-dark/70 space-y-2">
            {devices.map((d) => (
              <li key={d.id} className="border-b border-gray-100 pb-2 last:border-0">
                <span className="font-medium text-dark">
                  {d.platform === "web" ? "ブラウザ / PWA" : d.platform === "android" ? "Android アプリ" : "iOS アプリ"}
                </span>
                <span className="text-xs text-dark/50 ml-2">
                  最終確認 {d.lastSeenAt.toLocaleDateString("ja-JP")}
                </span>
                {d.userAgent && (
                  <p className="text-xs text-dark/40 truncate">{d.userAgent}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h2 className="text-base font-bold text-dark mb-3">最近の通知</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-dark/50">まだありません。</p>
        ) : (
          <ul className="text-sm space-y-2">
            {recent.map((n) => (
              <li key={n.id} className="border-b border-gray-100 pb-2 last:border-0">
                <p className="font-medium text-dark">{n.title}</p>
                <p className="text-dark/70">{n.body}</p>
                <p className="text-xs text-dark/40">
                  {n.createdAt.toLocaleString("ja-JP")} ／ {JSON.parse(n.channels || "[]").join(", ") || "未送信"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
