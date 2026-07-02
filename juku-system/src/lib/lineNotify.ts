import { prisma } from "./prisma";
import { pushText } from "./line";

const WD = ["日", "月", "火", "水", "木", "金", "土"];

/** JST の「今日」の 00:00 / 翌日 00:00（UTC真夜中境界）と JST曜日 */
function jstTodayRange() {
  const nowJst = new Date(Date.now() + 9 * 3600_000);
  const y = nowJst.getUTCFullYear();
  const m = nowJst.getUTCMonth();
  const d = nowJst.getUTCDate();
  const start = new Date(Date.UTC(y, m, d));
  const end = new Date(Date.UTC(y, m, d + 1));
  const weekday = start.getUTCDay(); // 0=日 .. 6=土（JST基準）
  return { start, end, weekday };
}

type NotifyResult = { target: number; sent: number; skipped: number; errors: string[] };

/**
 * 朝通知（9:00 JST 想定）：今日「面談 or 授業」がある連携済み生徒へ。
 * 予定が何もない生徒には送らない。
 */
export async function sendMorningNotifications(): Promise<NotifyResult> {
  const { start, end } = jstTodayRange();
  const students = await prisma.student.findMany({
    where: { status: "active", user: { lineUserId: { not: null } } },
    include: { user: { select: { lineUserId: true } } },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const s of students) {
    const lineUserId = s.user.lineUserId!;
    const [classes, meeting] = await Promise.all([
      prisma.classDay.findMany({
        where: { studentId: s.id, date: { gte: start, lt: end } },
        orderBy: { startTime: "asc" },
      }),
      prisma.meeting.findFirst({
        where: { studentId: s.id, nextMeetingDate: { gte: start, lt: end } },
      }),
    ]);

    if (classes.length === 0 && !meeting) {
      skipped++;
      continue;
    }

    const lines: string[] = ["おはようございます！今日の予定です📅", ""];
    if (classes.length > 0) {
      lines.push("【授業】");
      for (const c of classes) {
        const time = c.startTime
          ? `${c.startTime}${c.endTime ? "〜" + c.endTime : ""} `
          : "";
        lines.push(`・${time}${c.subject || "授業"}`.trim());
      }
      lines.push("");
    }
    if (meeting) lines.push("【面談】今日は面談の予定があります");

    try {
      await pushText(lineUserId, lines.join("\n").trim());
      sent++;
    } catch (e) {
      errors.push(`${s.id}: ${(e as Error).message}`);
    }
  }

  return { target: students.length, sent, skipped, errors };
}

/**
 * 夜通知（22:00 JST 想定）：今日の学習予定があるのに進捗が未記録の連携済み生徒へリマインド。
 * ・予定 = StudyScheduleDay（今日の曜日）の slots が非空
 * ・記録 = ProgressRecord の date が今日(JST)
 * 予定なし／記録済みは送らない。
 */
export async function sendEveningNotifications(): Promise<NotifyResult> {
  const { start, end, weekday } = jstTodayRange();
  const students = await prisma.student.findMany({
    where: { status: "active", user: { lineUserId: { not: null } } },
    include: { user: { select: { lineUserId: true } } },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const s of students) {
    const lineUserId = s.user.lineUserId!;

    // ① 今日の学習予定があるか
    const plan = await prisma.studyScheduleDay.findUnique({
      where: { studentId_weekday: { studentId: s.id, weekday } },
    });
    let hasPlan = false;
    if (plan) {
      try {
        hasPlan = (JSON.parse(plan.slots) as unknown[]).length > 0;
      } catch {
        hasPlan = false;
      }
    }
    if (!hasPlan) {
      skipped++;
      continue;
    }

    // ② 今日の進捗記録があるか
    const recorded = await prisma.progressRecord.count({
      where: { studentId: s.id, date: { gte: start, lt: end } },
    });
    if (recorded > 0) {
      skipped++;
      continue;
    }

    try {
      await pushText(
        lineUserId,
        `今日（${WD[weekday]}）の学習予定がありますが、まだ進捗が記録されていません📚\n忘れないうちに今日のぶんを登録しておきましょう！`
      );
      sent++;
    } catch (e) {
      errors.push(`${s.id}: ${(e as Error).message}`);
    }
  }

  return { target: students.length, sent, skipped, errors };
}
