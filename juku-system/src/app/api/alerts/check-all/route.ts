import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// すべての自動アラートをまとめてチェック
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  let generated = 0;

  // ====================================================
  // 1. 面談リマインダー
  // ====================================================
  const dueMeetings = await prisma.task.findMany({
    where: {
      type: "面談",
      meetingAlerted: false,
      meetingDateTime: { lte: now, not: null },
    },
    include: {
      teacher: { include: { user: true } },
      student: { include: { user: true } },
    },
  });

  if (dueMeetings.length > 0) {
    const activeAttendances = await prisma.attendance.findMany({
      where: { clockOut: null },
      include: { teacher: { include: { user: true } } },
    });

    for (const task of dueMeetings) {
      const recipients = activeAttendances
        .filter((a) => a.teacher.id !== task.teacherId)
        .map((a) => a.teacher.user.id);

      const studentName = task.student?.user.name || "（生徒未指定）";
      const message = `質疑応答の担当者を確認し、担当者は声かけを行ってください。対象: ${studentName}（担当: ${task.teacher.user.name}）`;

      for (const userId of recipients) {
        await prisma.alert.create({
          data: {
            userId,
            type: "general",
            title: "面談リマインダー",
            message,
            isRead: false,
          },
        });
        generated++;
      }

      await prisma.task.update({
        where: { id: task.id },
        data: { meetingAlerted: true },
      });
    }
  }

  // ====================================================
  // 2. タスク期限超過
  // ====================================================
  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { in: ["pending", "in_progress"] },
      overdueAlerted: false,
    },
    include: { teacher: { include: { user: true } } },
  });

  for (const task of overdueTasks) {
    await prisma.alert.create({
      data: {
        userId: task.teacher.userId,
        type: "task_overdue",
        title: "タスク期限超過",
        message: `「${task.title}」が期限を過ぎています。`,
        isRead: false,
      },
    });
    await prisma.task.update({
      where: { id: task.id },
      data: { overdueAlerted: true, status: "overdue" },
    });
    generated++;
  }

  // ====================================================
  // 3. シフト未打刻 (シフト開始時刻+15分経過)
  // ====================================================
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const todayShifts = await prisma.shift.findMany({
    where: {
      date: { gte: todayStart, lte: todayEnd },
      status: { not: "cancelled" },
      noShowAlerted: false,
    },
    include: { teacher: { include: { user: true } } },
  });

  for (const shift of todayShifts) {
    const [h, m] = shift.startTime.split(":").map(Number);
    const startDateTime = new Date(shift.date);
    startDateTime.setHours(h, m, 0, 0);
    const checkTime = new Date(startDateTime.getTime() + 15 * 60 * 1000);

    if (now < checkTime) continue;

    // その日に該当講師の打刻があるか
    const attendance = await prisma.attendance.findFirst({
      where: {
        teacherId: shift.teacherId,
        clockIn: { gte: todayStart, lte: todayEnd },
      },
    });

    if (!attendance) {
      await prisma.alert.create({
        data: {
          userId: shift.teacher.userId,
          type: "general",
          title: "シフト未打刻",
          message: `${shift.startTime} 開始のシフトが未打刻です。出勤打刻を行ってください。`,
          isRead: false,
        },
      });
      // adminにも通知
      const admins = await prisma.user.findMany({ where: { role: "admin" } });
      for (const admin of admins) {
        await prisma.alert.create({
          data: {
            userId: admin.id,
            type: "general",
            title: "未打刻アラート",
            message: `${shift.teacher.user.name}: ${shift.startTime} 開始のシフトが未打刻です。`,
            isRead: false,
          },
        });
      }
      await prisma.shift.update({
        where: { id: shift.id },
        data: { noShowAlerted: true },
      });
      generated++;
    }
  }

  // ====================================================
  // 4. 退勤忘れ (シフト終了時刻+1時間経過しても出勤中)
  // ====================================================
  const todayShiftsForOut = await prisma.shift.findMany({
    where: {
      date: { gte: todayStart, lte: todayEnd },
      status: { not: "cancelled" },
      forgotClockOutAlerted: false,
    },
    include: { teacher: { include: { user: true } } },
  });

  for (const shift of todayShiftsForOut) {
    const [h, m] = shift.endTime.split(":").map(Number);
    const endDateTime = new Date(shift.date);
    endDateTime.setHours(h, m, 0, 0);
    const checkTime = new Date(endDateTime.getTime() + 60 * 60 * 1000);

    if (now < checkTime) continue;

    // 出勤中（clockOut == null）の打刻があるか
    const stillIn = await prisma.attendance.findFirst({
      where: {
        teacherId: shift.teacherId,
        clockOut: null,
        clockIn: { gte: todayStart, lte: todayEnd },
      },
    });

    if (stillIn) {
      await prisma.alert.create({
        data: {
          userId: shift.teacher.userId,
          type: "general",
          title: "退勤忘れの可能性",
          message: `${shift.endTime} のシフト終了から1時間以上経過していますが、退勤打刻されていません。`,
          isRead: false,
        },
      });
      const admins = await prisma.user.findMany({ where: { role: "admin" } });
      for (const admin of admins) {
        await prisma.alert.create({
          data: {
            userId: admin.id,
            type: "general",
            title: "退勤忘れアラート",
            message: `${shift.teacher.user.name}: ${shift.endTime} のシフト終了から1時間以上経過しています。`,
            isRead: false,
          },
        });
      }
      await prisma.shift.update({
        where: { id: shift.id },
        data: { forgotClockOutAlerted: true },
      });
      generated++;
    }
  }

  // ====================================================
  // 5. 学習目標進捗の遅れ (2週間相当の遅延)
  // ====================================================
  const goals = await prisma.learningGoal.findMany({
    where: {
      status: "in_progress",
      paceAlerted: false,
    },
    include: {
      student: { include: { user: true } },
      progressRecords: { select: { pagesCompleted: true } },
    },
  });

  // 通知先: admin + teacher 全員
  const goalRecipients = await prisma.user.findMany({
    where: { role: { in: ["admin", "teacher"] } },
    select: { id: true },
  });

  for (const goal of goals) {
    const createdAt = new Date(goal.createdAt);
    const dueDate = new Date(goal.dueDate);
    const daysTotal = Math.max(
      1,
      Math.ceil((dueDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );
    const daysElapsed = Math.ceil(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysElapsed <= 0) continue;

    const pagesPerDay = goal.targetPages / daysTotal;
    const expectedAfterLag = pagesPerDay * (daysElapsed + 14);
    const completed = goal.progressRecords.reduce((sum, r) => sum + r.pagesCompleted, 0);

    if (completed < expectedAfterLag && expectedAfterLag <= goal.targetPages * 1.0) {
      // ペース遅れ
      const message = `${goal.student.user.name}さんの「${goal.materialName}」が想定より2週間以上遅れています（${completed}/${goal.targetPages}ページ）。`;
      for (const u of goalRecipients) {
        await prisma.alert.create({
          data: {
            userId: u.id,
            type: "progress_warning",
            title: "学習目標 進捗遅延",
            message,
            isRead: false,
          },
        });
        generated++;
      }
      await prisma.learningGoal.update({
        where: { id: goal.id },
        data: { paceAlerted: true },
      });
    }
  }

  return NextResponse.json({ ok: true, generated });
}
