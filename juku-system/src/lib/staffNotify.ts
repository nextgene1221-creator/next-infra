import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";

// 講師・管理者向けの通知（アプリ化 Phase 1 / 2026-08-24）。
//
// これまで講師・管理者に届く通知手段が事実上なかった（面談アラートは画面を開いている間だけ）。
// まずは実務で効くものから 3 つ。Vercel Hobby の Cron 2 本制限に収めるため、
// 既存の朝 (9:00 JST) / 夜 (22:00 JST) の cron に相乗りさせる。

const JST_MS = 9 * 3600_000;

/** JST の「今日」の 00:00 / 翌日 00:00（UTC の Date）と日付キー */
function jstToday() {
  const nowJst = new Date(Date.now() + JST_MS);
  const y = nowJst.getUTCFullYear();
  const m = nowJst.getUTCMonth();
  const d = nowJst.getUTCDate();
  const start = new Date(Date.UTC(y, m, d));
  const end = new Date(Date.UTC(y, m, d + 1));
  const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { start, end, key };
}

/** UTC の Date を JST の "H:MM" にする */
function jstHm(d: Date): string {
  const j = new Date(d.getTime() + JST_MS);
  return `${j.getUTCHours()}:${String(j.getUTCMinutes()).padStart(2, "0")}`;
}

type Result = { sent: number; skipped: number; errors: string[] };

/**
 * 朝（9:00 JST）: 今日シフトがある / 今日面談がある 講師・管理者へ「今日の予定」を送る。
 * 予定が何もない人には送らない。
 */
export async function sendMorningStaffNotifications(): Promise<Result> {
  const { start, end, key } = jstToday();

  const [shifts, meetings] = await Promise.all([
    prisma.shift.findMany({
      where: { date: { gte: start, lt: end }, status: { not: "cancelled" } },
      include: { teacher: { select: { userId: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.meeting.findMany({
      where: { nextMeetingDate: { gte: start, lt: end }, teacherId: { not: null } },
      include: {
        teacher: { select: { userId: true } },
        student: { include: { user: { select: { name: true } } } },
      },
      orderBy: { nextMeetingDate: "asc" },
    }),
  ]);

  // userId ごとに今日の予定を組み立てる
  const lines = new Map<string, string[]>();
  const add = (userId: string, line: string) => {
    const cur = lines.get(userId) ?? [];
    cur.push(line);
    lines.set(userId, cur);
  };

  for (const s of shifts) {
    add(s.teacher.userId, `シフト ${s.startTime}〜${s.endTime}`);
  }
  for (const m of meetings) {
    if (!m.teacher || !m.nextMeetingDate) continue;
    add(m.teacher.userId, `面談 ${jstHm(m.nextMeetingDate)} ${m.student.user.name}さん`);
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [userId, items] of lines) {
    const r = await notifyUser(userId, {
      kind: "staff_morning",
      dedupeKey: `staff_morning:${userId}:${key}`,
      title: "今日の予定",
      body: items.join(" ／ "),
      url: "/dashboard",
    });
    if (r.skipped) skipped++;
    else if (r.sent.length > 0) sent++;
    errors.push(...r.errors);
  }

  return { sent, skipped, errors };
}

/**
 * 夜（22:00 JST）: 今日出勤したのに退勤打刻が無い講師・管理者へ通知する。
 * 給与が 0 分で集計されてしまうため、その日のうちに気づいてもらう。
 */
export async function sendClockOutReminders(): Promise<Result> {
  const { start, end } = jstToday();

  const open = await prisma.attendance.findMany({
    where: { clockIn: { gte: start, lt: end }, clockOut: null },
    include: { teacher: { select: { userId: true } } },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const a of open) {
    const r = await notifyUser(a.teacher.userId, {
      kind: "clockout_missing",
      dedupeKey: `clockout_missing:${a.id}`,
      title: "退勤打刻がまだです",
      body: `${jstHm(a.clockIn)} に出勤打刻がありますが、退勤打刻が記録されていません。このままだと給与が 0 分で集計されます。`,
      url: "/dashboard",
    });
    if (r.skipped) skipped++;
    else if (r.sent.length > 0) sent++;
    errors.push(...r.errors);
  }

  return { sent, skipped, errors };
}

/**
 * 夜（22:00 JST）: 今日のプリントで未完了のものが残っていたら、管理者に件数を通知する。
 * 誰が何をやるかは画面で見てもらう（通知に生徒名を並べない＝端末のロック画面に個人名を出さない）。
 */
export async function sendPendingPrintsReminder(): Promise<Result> {
  const { start, end, key } = jstToday();

  const pending = await prisma.studentPrint.count({
    where: { scheduledDate: { gte: start, lt: end }, completedDate: null },
  });

  if (pending === 0) return { sent: 0, skipped: 0, errors: [] };

  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const a of admins) {
    const r = await notifyUser(a.id, {
      kind: "pending_prints",
      dedupeKey: `pending_prints:${a.id}:${key}`,
      title: "今日のプリントに未完了があります",
      body: `${pending} 件が未完了のままです。ゼミ管理から確認してください。`,
      url: "/seminar",
    });
    if (r.skipped) skipped++;
    else if (r.sent.length > 0) sent++;
    errors.push(...r.errors);
  }

  return { sent, skipped, errors };
}
