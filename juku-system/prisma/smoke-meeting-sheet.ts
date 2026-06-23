// 開発用スモークテスト: MeetingSheet のCRUD・JSON往復・面談タスク生成・次回面談優先ロジックを
// 実DB(Neon)で検証する。作成した行は最後に必ず削除する（既存データは変更しない）。
//   実行: npx tsx prisma/smoke-meeting-sheet.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
  });

  const student = await prisma.student.findFirst({
    where: { status: "active" },
    include: { user: { select: { name: true } } },
  });
  const teacher = await prisma.teacher.findFirst();
  if (!student || !teacher) {
    console.log("SKIP: active student / teacher が見つかりません");
    await prisma.$disconnect();
    return;
  }

  const sheetIds: string[] = [];
  const taskIds: string[] = [];
  const meetingIds: string[] = [];
  let ok = true;
  const check = (label: string, cond: boolean) => {
    console.log(`${cond ? "✓" : "✗"} ${label}`);
    if (!cond) ok = false;
  };

  try {
    // 1) シート作成 → 更新（回答JSON）→ 提出
    const sheet = await prisma.meetingSheet.create({
      data: { studentId: student.id, status: "draft", answers: "{}" },
    });
    sheetIds.push(sheet.id);
    check("MeetingSheet 作成 (draft)", sheet.status === "draft");

    const answers = {
      totalHoursActual: "12.5",
      confidence: "少しあった",
      planVsActual: "少しズレた",
      diffReasons: ["time", "health"],
      diffReasonSub: { time: "予定より少ない" },
      continueHas: "yes",
      continueText: "毎朝の英単語",
    };
    const submitted = await prisma.meetingSheet.update({
      where: { id: sheet.id },
      data: { answers: JSON.stringify(answers), status: "submitted", submittedAt: new Date() },
    });
    const round = JSON.parse(submitted.answers);
    check("提出 + JSON往復 (confidence)", round.confidence === "少しあった");
    check("提出 + JSON往復 (diffReasons配列)", Array.isArray(round.diffReasons) && round.diffReasons.length === 2);
    check("submittedAt セット", submitted.status === "submitted" && submitted.submittedAt !== null);

    // 2) 「直近面談以降に提出済シートあり」判定の素材
    const submittedSince = await prisma.meetingSheet.findFirst({
      where: { studentId: student.id, status: "submitted", createdAt: { gt: new Date(0) } },
      select: { id: true },
    });
    check("提出済シート検索", !!submittedSince);

    // 3) 次回面談予定の優先ロジック: 面談タスク(後の日付) と 面談記録nextMeetingDate(早い日付)
    const soon = new Date(); soon.setDate(soon.getDate() + 2); soon.setHours(0, 0, 0, 0);
    const later = new Date(); later.setDate(later.getDate() + 5); later.setHours(0, 0, 0, 0);

    const meeting = await prisma.meeting.create({
      data: {
        studentId: student.id, teacherId: teacher.id, date: new Date(),
        content: "[smoke test]", nextMeetingDate: soon,
      },
    });
    meetingIds.push(meeting.id);
    const meetingTask = await prisma.task.create({
      data: {
        studentId: student.id, teacherId: teacher.id, subject: "",
        title: "[smoke] 面談", dueDate: later, type: "面談", meetingDateTime: later, status: "pending",
      },
    });
    taskIds.push(meetingTask.id);

    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const taskHit = await prisma.task.findFirst({
      where: { studentId: student.id, type: "面談", status: { notIn: ["completed", "cancelled"] }, meetingDateTime: { not: null, gte: startOfToday } },
      orderBy: { meetingDateTime: "asc" },
    });
    // タスクが存在すれば優先される（=面談記録の soon ではなく later が採用される想定）
    check("次回面談=面談タスク優先 (later採用)", taskHit?.meetingDateTime?.getTime() === later.getTime());

    // 4) DELETE
    await prisma.meetingSheet.delete({ where: { id: sheet.id } });
    sheetIds.pop();
    const gone = await prisma.meetingSheet.findUnique({ where: { id: sheet.id } });
    check("MeetingSheet 削除", gone === null);
  } catch (e) {
    ok = false;
    console.error("ERROR:", e);
  } finally {
    // 後始末（作成した残存行を全削除）
    for (const id of sheetIds) await prisma.meetingSheet.delete({ where: { id } }).catch(() => {});
    for (const id of taskIds) await prisma.task.delete({ where: { id } }).catch(() => {});
    for (const id of meetingIds) await prisma.meeting.delete({ where: { id } }).catch(() => {});
    await prisma.$disconnect();
  }

  console.log(ok ? "\nSMOKE TEST: ALL PASS" : "\nSMOKE TEST: FAIL");
  if (!ok) process.exit(1);
}

main();
