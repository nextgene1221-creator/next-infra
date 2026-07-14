import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAllCampuses, getAllStudyRoomConfigs, seatLabel } from "@/lib/studyRoom";
import StudentStudyRoomPanel from "./StudentStudyRoomPanel";

export const dynamic = "force-dynamic";

// JST 表示ヘルパー（DB は UTC 保存）
const jstDate = (d: Date) =>
  d.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
const jstTime = (d: Date) =>
  d.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" });
const ymJst = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" }).slice(0, 7);

const fmtDuration = (minutes: number) => {
  if (minutes < 1) return "1分未満";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
};

export default async function StudentStudyRoomPage() {
  const session = await requireAuth(["student"]);

  const student = await prisma.student.findUnique({ where: { userId: session.user.id } });
  if (!student) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-dark mb-6">自習室</h1>
        <p className="text-dark/70">生徒情報が見つかりません。運営にお問い合わせください。</p>
      </div>
    );
  }

  const [openSession, campusRecs, configs, openCounts, sessions, pointSum, pointTx] =
    await Promise.all([
      prisma.studyRoomSession.findFirst({
        where: { studentId: student.id, checkOutAt: null },
      }),
      getAllCampuses(),
      getAllStudyRoomConfigs(),
      prisma.studyRoomSession.groupBy({
        by: ["campus", "seatType"],
        where: { checkOutAt: null },
        _count: true,
      }),
      prisma.studyRoomSession.findMany({
        where: { studentId: student.id },
        orderBy: { checkInAt: "desc" },
        take: 200,
      }),
      prisma.pointTransaction.aggregate({
        where: { studentId: student.id },
        _sum: { delta: true },
      }),
      prisma.pointTransaction.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  const usedFor = (code: string, seat: string) =>
    openCounts.find((r) => r.campus === code && r.seatType === seat)?._count ?? 0;

  const campuses = campusRecs.map((c) => {
    const cfg = configs.find((x) => x.campus === c.code);
    const boothCap = cfg?.boothCapacity ?? 0;
    const tableCap = cfg?.tableCapacity ?? 0;
    return {
      code: c.code,
      label: c.label,
      closeTime: c.closeTime,
      boothAvail: Math.max(0, boothCap - usedFor(c.code, "booth")),
      tableAvail: Math.max(0, tableCap - usedFor(c.code, "table")),
    };
  });

  const campusMap = new Map(campusRecs.map((c) => [c.code, c.label]));

  const open = openSession
    ? {
        campus: openSession.campus,
        campusLabel: campusMap.get(openSession.campus) || openSession.campus,
        seatType: (openSession.seatType === "table" ? "table" : "booth") as "booth" | "table",
      }
    : null;

  // 履歴（滞在時間つき）
  const withDuration = sessions.map((s) => ({
    ...s,
    minutes: s.checkOutAt
      ? Math.round((s.checkOutAt.getTime() - s.checkInAt.getTime()) / 60000)
      : null,
  }));

  const curYm = ymJst(new Date());
  const monthlyMinutes = withDuration
    .filter((s) => s.minutes != null && ymJst(s.checkInAt) === curYm)
    .reduce((sum, s) => sum + (s.minutes ?? 0), 0);

  const totalPoints = pointSum._sum.delta ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">自習室</h1>

      {/* 入退室の操作（③：QRを介さずアプリ内で登録） */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <h2 className="font-bold text-dark mb-3">入退室・席の登録</h2>
        <StudentStudyRoomPanel open={open} campuses={campuses} />
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-xs text-dark/60">累計ポイント</p>
          <p className="text-2xl font-bold text-primary mt-1">{totalPoints}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-xs text-dark/60">今月の滞在時間</p>
          <p className="text-2xl font-bold text-primary mt-1">{fmtDuration(monthlyMinutes)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-xs text-dark/60">直近の来室回数</p>
          <p className="text-2xl font-bold text-primary mt-1">{withDuration.length}</p>
        </div>
      </div>

      {/* 入退室履歴（⑥） */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-dark/10">
          <h2 className="font-bold text-dark">入退室履歴</h2>
          <p className="text-xs text-dark/50 mt-0.5">直近{withDuration.length}件</p>
        </div>
        {withDuration.length === 0 ? (
          <p className="px-4 py-6 text-sm text-dark/60">まだ入退室の記録がありません。</p>
        ) : (
          <ul className="divide-y divide-dark/10">
            {withDuration.map((s) => (
              <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-dark">
                    {jstDate(s.checkInAt)}
                    <span className="ml-2 text-dark/60 font-normal">
                      {campusMap.get(s.campus) || s.campus} / {seatLabel(s.seatType)}
                    </span>
                  </p>
                  <p className="text-xs text-dark/60 mt-0.5">
                    {jstTime(s.checkInAt)}
                    {" 〜 "}
                    {s.checkOutAt ? (
                      jstTime(s.checkOutAt)
                    ) : (
                      <span className="text-green-600 font-medium">入室中</span>
                    )}
                    {s.autoCheckedOut && (
                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-surface text-dark/60 text-[10px]">
                        自動退室
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-dark">
                    {s.minutes != null ? fmtDuration(s.minutes) : "—"}
                  </p>
                  {s.pointAwarded && <p className="text-[10px] text-primary">+1pt</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ポイント内訳 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-dark/10">
          <h2 className="font-bold text-dark">ポイント内訳</h2>
          <p className="text-xs text-dark/50 mt-0.5">直近20件</p>
        </div>
        {pointTx.length === 0 ? (
          <p className="px-4 py-6 text-sm text-dark/60">ポイントの記録がありません。</p>
        ) : (
          <ul className="divide-y divide-dark/10">
            {pointTx.map((t) => (
              <li key={t.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-dark/60">
                    {jstDate(t.createdAt)} {jstTime(t.createdAt)}
                  </p>
                  <p className="text-sm text-dark truncate">
                    {t.reason || (t.delta >= 0 ? "付与" : "交換")}
                  </p>
                </div>
                <p
                  className={`text-sm font-bold shrink-0 ${
                    t.delta >= 0 ? "text-primary" : "text-orange-600"
                  }`}
                >
                  {t.delta >= 0 ? `+${t.delta}` : t.delta}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
