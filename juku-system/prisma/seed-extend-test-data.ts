// Extend existing test accounts with additional child records.
//
// What this DOES:
//   - Add child records (BigGoal, LearningGoal, ProgressRecord, Task, RoutineTask,
//     Meeting, MockExamResult, StudyRoomSession, PointTransaction, StudentAssignment)
//     attached to the existing 5 users (admin/2 teachers/2 students).
// What this does NOT do:
//   - Create or modify users
//   - Touch Campus, PrintUnit, School, SchoolEvent, Article, BlogCategory, BlogPost
//   - Touch StudentPrint, ShiftTemplateDay, StudyScheduleDay (treated as 単元/科目-related
//     or already saturated)
//   - Add Shift/Attendance/Alert (already plentiful in production)
//
// Run modes:
//   npx tsx prisma/seed-extend-test-data.ts --dry-run   # transaction + rollback, no writes
//   npx tsx prisma/seed-extend-test-data.ts --commit    # actually writes
//
// On --commit success, writes prisma/.test-batch-<ISO>.json with all created record IDs,
// for use by cleanup-extend-test-data.ts.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const commit = args.includes("--commit");

if (!dryRun && !commit) {
  console.error("Pass either --dry-run or --commit");
  process.exit(1);
}
if (dryRun && commit) {
  console.error("Pass only one of --dry-run or --commit");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TODAY = new Date("2026-05-06T00:00:00.000Z");
function daysFromToday(offset: number): Date {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

type CreatedIds = {
  bigGoals: string[];
  learningGoals: string[];
  progressRecords: string[];
  tasks: string[];
  routineTasks: string[];
  meetings: string[];
  mockExamResults: string[];
  studyRoomSessions: string[];
  pointTransactions: string[];
  studentAssignments: string[];
};

async function findFixtures(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) {
  const tanaka = await tx.teacher.findFirstOrThrow({
    where: { user: { email: "tanaka@juku.example.com" } },
    include: { user: true },
  });
  const suzuki = await tx.teacher.findFirstOrThrow({
    where: { user: { email: "suzuki@juku.example.com" } },
    include: { user: true },
  });
  const yamada = await tx.student.findFirstOrThrow({
    where: { user: { email: "yamada@student.example.com" } },
    include: { user: true },
  });
  const sato = await tx.student.findFirstOrThrow({
    where: { user: { email: "sato@student.example.com" } },
    include: { user: true },
  });
  return { tanaka, suzuki, yamada, sato };
}

async function run() {
  const created: CreatedIds = {
    bigGoals: [],
    learningGoals: [],
    progressRecords: [],
    tasks: [],
    routineTasks: [],
    meetings: [],
    mockExamResults: [],
    studyRoomSessions: [],
    pointTransactions: [],
    studentAssignments: [],
  };

  const ROLLBACK = Symbol("dry-run-rollback");

  try {
    await prisma.$transaction(async (tx) => {
      const { tanaka, suzuki, yamada, sato } = await findFixtures(tx);

      // ---- StudentAssignment: ensure all 4 combos exist ----
      const combos: { teacherId: string; studentId: string }[] = [
        { teacherId: tanaka.id, studentId: yamada.id },
        { teacherId: tanaka.id, studentId: sato.id },
        { teacherId: suzuki.id, studentId: yamada.id },
        { teacherId: suzuki.id, studentId: sato.id },
      ];
      for (const c of combos) {
        const exists = await tx.studentAssignment.findUnique({
          where: { teacherId_studentId: { teacherId: c.teacherId, studentId: c.studentId } },
        });
        if (!exists) {
          const r = await tx.studentAssignment.create({ data: c });
          created.studentAssignments.push(r.id);
        }
      }

      // ---- BigGoal: add for each student (2 each) ----
      const bigGoalSpecs = [
        // Yamada (math/physics oriented via Tanaka)
        {
          studentId: yamada.id,
          subject: "数学",
          materialName: "青チャート数学IIB",
          targetPages: 480,
          startDate: daysFromToday(-30),
          dueDate: daysFromToday(120),
          notes: "夏休み前に基礎完成",
        },
        {
          studentId: yamada.id,
          subject: "英語",
          materialName: "ターゲット1900",
          targetPages: 1900,
          startDate: daysFromToday(-60),
          dueDate: daysFromToday(60),
          notes: "1日30個ペース",
        },
        // Sato (English/Japanese oriented via Suzuki)
        {
          studentId: sato.id,
          subject: "英語",
          materialName: "速読英単語 上級編",
          targetPages: 320,
          startDate: daysFromToday(-20),
          dueDate: daysFromToday(90),
          notes: "推薦入試対策",
        },
        {
          studentId: sato.id,
          subject: "国語",
          materialName: "現代文読解力の開発講座",
          targetPages: 200,
          startDate: daysFromToday(-30),
          dueDate: daysFromToday(60),
          notes: "",
        },
      ];
      const bigGoalIds: { yamadaMath: string; yamadaEng: string; satoEng: string; satoJpn: string } = {
        yamadaMath: "",
        yamadaEng: "",
        satoEng: "",
        satoJpn: "",
      };
      for (const g of bigGoalSpecs) {
        const r = await tx.bigGoal.create({ data: g });
        created.bigGoals.push(r.id);
        if (g.studentId === yamada.id && g.subject === "数学") bigGoalIds.yamadaMath = r.id;
        else if (g.studentId === yamada.id && g.subject === "英語") bigGoalIds.yamadaEng = r.id;
        else if (g.studentId === sato.id && g.subject === "英語") bigGoalIds.satoEng = r.id;
        else if (g.studentId === sato.id && g.subject === "国語") bigGoalIds.satoJpn = r.id;
      }

      // ---- LearningGoal: 2 weekly per BigGoal (last week + this week) ----
      const learningGoalSpecs = [
        // Yamada math
        { studentId: yamada.id, bigGoalId: bigGoalIds.yamadaMath, subject: "数学", materialName: "青チャート数学IIB", targetPages: 30, startDate: daysFromToday(-7), dueDate: daysFromToday(-1) },
        { studentId: yamada.id, bigGoalId: bigGoalIds.yamadaMath, subject: "数学", materialName: "青チャート数学IIB", targetPages: 30, startDate: daysFromToday(0), dueDate: daysFromToday(6) },
        // Yamada eng
        { studentId: yamada.id, bigGoalId: bigGoalIds.yamadaEng, subject: "英語", materialName: "ターゲット1900", targetPages: 100, startDate: daysFromToday(-7), dueDate: daysFromToday(-1) },
        { studentId: yamada.id, bigGoalId: bigGoalIds.yamadaEng, subject: "英語", materialName: "ターゲット1900", targetPages: 100, startDate: daysFromToday(0), dueDate: daysFromToday(6) },
        // Sato eng
        { studentId: sato.id, bigGoalId: bigGoalIds.satoEng, subject: "英語", materialName: "速読英単語 上級編", targetPages: 20, startDate: daysFromToday(-7), dueDate: daysFromToday(-1) },
        { studentId: sato.id, bigGoalId: bigGoalIds.satoEng, subject: "英語", materialName: "速読英単語 上級編", targetPages: 20, startDate: daysFromToday(0), dueDate: daysFromToday(6) },
        // Sato jpn
        { studentId: sato.id, bigGoalId: bigGoalIds.satoJpn, subject: "国語", materialName: "現代文読解力の開発講座", targetPages: 15, startDate: daysFromToday(-7), dueDate: daysFromToday(-1) },
        { studentId: sato.id, bigGoalId: bigGoalIds.satoJpn, subject: "国語", materialName: "現代文読解力の開発講座", targetPages: 15, startDate: daysFromToday(0), dueDate: daysFromToday(6) },
      ];
      for (const g of learningGoalSpecs) {
        const r = await tx.learningGoal.create({ data: g });
        created.learningGoals.push(r.id);
      }

      // ---- ProgressRecord: ~3 records per student per week, last 2 weeks ----
      const progressSpecs = [
        // Yamada
        { studentId: yamada.id, teacherId: tanaka.id, subject: "数学", date: daysFromToday(-12), material: "青チャート数学IIB", topic: "ベクトルの内積", pagesCompleted: 8 },
        { studentId: yamada.id, teacherId: tanaka.id, subject: "数学", date: daysFromToday(-9), material: "青チャート数学IIB", topic: "空間ベクトル", pagesCompleted: 6 },
        { studentId: yamada.id, teacherId: suzuki.id, subject: "英語", date: daysFromToday(-10), material: "ターゲット1900", topic: "501-600 暗記テスト", pagesCompleted: 100 },
        { studentId: yamada.id, teacherId: tanaka.id, subject: "数学", date: daysFromToday(-5), material: "青チャート数学IIB", topic: "数列の和", pagesCompleted: 10 },
        { studentId: yamada.id, teacherId: suzuki.id, subject: "英語", date: daysFromToday(-3), material: "ターゲット1900", topic: "601-700 暗記テスト", pagesCompleted: 100 },
        // Sato
        { studentId: sato.id, teacherId: suzuki.id, subject: "英語", date: daysFromToday(-11), material: "速読英単語 上級編", topic: "Unit 1-3 長文読解", pagesCompleted: 6 },
        { studentId: sato.id, teacherId: suzuki.id, subject: "国語", date: daysFromToday(-8), material: "現代文読解力の開発講座", topic: "第1章 評論文の構造", pagesCompleted: 4 },
        { studentId: sato.id, teacherId: suzuki.id, subject: "英語", date: daysFromToday(-4), material: "速読英単語 上級編", topic: "Unit 4-5 長文読解", pagesCompleted: 4 },
        { studentId: sato.id, teacherId: suzuki.id, subject: "国語", date: daysFromToday(-2), material: "現代文読解力の開発講座", topic: "第2章 対比構造", pagesCompleted: 5 },
      ];
      for (const p of progressSpecs) {
        const r = await tx.progressRecord.create({ data: p });
        created.progressRecords.push(r.id);
      }

      // ---- Task: a mix of student-targeted and teacher-only ----
      const taskSpecs = [
        // student-targeted
        { teacherId: tanaka.id, studentId: yamada.id, subject: "数学", title: "ベクトル章末問題 p.120-125", description: "次回授業までに完了", dueDate: daysFromToday(3), type: "通常" },
        { teacherId: suzuki.id, studentId: yamada.id, subject: "英語", title: "ターゲット1900 p.701-800 暗記", description: "週末テスト範囲", dueDate: daysFromToday(5), type: "通常" },
        { teacherId: suzuki.id, studentId: sato.id, subject: "英語", title: "過去問演習 2025年度", description: "解説まで読み切ること", dueDate: daysFromToday(7), type: "要引き継ぎ" },
        { teacherId: suzuki.id, studentId: sato.id, subject: "国語", title: "現代文 第3章 演習", description: "", dueDate: daysFromToday(2), type: "通常" },
        // teacher-only (no student linked)
        { teacherId: tanaka.id, studentId: null, subject: "数学", title: "5月度教材発注リスト作成", description: "新刊問題集の選定含む", dueDate: daysFromToday(4), type: "通常" },
        { teacherId: suzuki.id, studentId: null, subject: "英語", title: "夏期講習カリキュラム原案", description: "", dueDate: daysFromToday(10), type: "通常" },
      ];
      for (const t of taskSpecs) {
        const r = await tx.task.create({ data: { ...t, status: "pending" } });
        created.tasks.push(r.id);
      }

      // ---- RoutineTask: 2 per teacher ----
      const routineSpecs = [
        { teacherId: tanaka.id, studentId: yamada.id, subject: "数学", title: "週次進捗チェック", description: "毎週月曜にBigGoal達成率を確認", type: "通常" },
        { teacherId: tanaka.id, studentId: null, subject: "数学", title: "授業準備（板書計画）", description: "前日までに作成", type: "通常" },
        { teacherId: suzuki.id, studentId: sato.id, subject: "英語", title: "推薦入試対策面談", description: "月1回30分", type: "面談" },
        { teacherId: suzuki.id, studentId: null, subject: "英語", title: "週次小テスト作成", description: "金曜実施分", type: "通常" },
      ];
      for (const r0 of routineSpecs) {
        const r = await tx.routineTask.create({ data: r0 });
        created.routineTasks.push(r.id);
      }

      // ---- Meeting: 2 per student ----
      const meetingSpecs = [
        {
          studentId: yamada.id,
          teacherId: tanaka.id,
          date: daysFromToday(-21),
          durationMinutes: 30,
          type: "定期面談",
          status: "conducted",
          content: "前回模試の振り返り。数学IAの基礎は安定、IIBの三角関数で苦戦。次回までに章末問題反復。",
          parentComment: "数学IIBの理解度向上が必要。週末の自習時間確保をお願いします。",
          nextMeetingDate: daysFromToday(7),
        },
        {
          studentId: yamada.id,
          teacherId: suzuki.id,
          date: daysFromToday(-7),
          durationMinutes: 20,
          type: "学習相談",
          status: "conducted",
          content: "英単語暗記の進捗確認。ターゲット600語までほぼ定着、701以降の継続が課題。",
          parentComment: "",
          nextMeetingDate: daysFromToday(14),
        },
        {
          studentId: sato.id,
          teacherId: suzuki.id,
          date: daysFromToday(-14),
          durationMinutes: 45,
          type: "進路相談",
          status: "conducted",
          content: "推薦入試の出願書類作成スケジュール確認。志望理由書の初稿レビュー。",
          parentComment: "推薦書類の進捗、家庭でも声かけ続けます。",
          nextMeetingDate: daysFromToday(7),
        },
        {
          studentId: sato.id,
          teacherId: suzuki.id,
          date: daysFromToday(-3),
          durationMinutes: 30,
          type: "定期面談",
          status: "conducted",
          content: "現代文の読解スピードが向上。引き続き演習量確保。",
          parentComment: "",
          nextMeetingDate: null,
        },
      ];
      for (const m of meetingSpecs) {
        const r = await tx.meeting.create({ data: m });
        created.meetings.push(r.id);
      }

      // ---- MockExamResult: 3 per student ----
      const mockSpecs = [
        // Yamada (high2 想定)
        {
          studentId: yamada.id,
          examName: "全統高2記述模試 第1回",
          examDate: daysFromToday(-90),
          gradeLevel: "high2",
          overallDeviation: 58.3,
          overallScore: 412,
          schoolRank: 12,
          judgment: "B",
          subjects: JSON.stringify([
            { subject: "数学", deviation: 62.1, score: 145 },
            { subject: "英語", deviation: 56.4, score: 138 },
            { subject: "国語", deviation: 54.2, score: 129 },
          ]),
          notes: "数学は安定、英語の長文で時間配分課題",
        },
        {
          studentId: yamada.id,
          examName: "進研模試 高2 第2回",
          examDate: daysFromToday(-45),
          gradeLevel: "high2",
          overallDeviation: 60.5,
          overallScore: 438,
          schoolRank: 8,
          judgment: "B",
          subjects: JSON.stringify([
            { subject: "数学", deviation: 64.0, score: 152 },
            { subject: "英語", deviation: 58.8, score: 144 },
            { subject: "国語", deviation: 56.1, score: 142 },
          ]),
          notes: "全体的に上昇傾向",
        },
        {
          studentId: yamada.id,
          examName: "全統高2記述模試 第2回",
          examDate: daysFromToday(-15),
          gradeLevel: "high2",
          overallDeviation: 61.8,
          overallScore: 451,
          schoolRank: 6,
          judgment: "A",
          subjects: JSON.stringify([
            { subject: "数学", deviation: 65.2, score: 156 },
            { subject: "英語", deviation: 60.1, score: 148 },
            { subject: "国語", deviation: 57.5, score: 147 },
          ]),
          notes: "",
        },
        // Sato (high3 想定)
        {
          studentId: sato.id,
          examName: "全統共通テスト模試 第1回",
          examDate: daysFromToday(-75),
          gradeLevel: "high3",
          overallDeviation: 63.4,
          overallScore: 525,
          schoolRank: 3,
          judgment: "B",
          subjects: JSON.stringify([
            { subject: "英語", deviation: 68.2, score: 175 },
            { subject: "国語", deviation: 64.5, score: 168 },
            { subject: "数学", deviation: 55.1, score: 110 },
          ]),
          notes: "英国は安定、数学が課題",
        },
        {
          studentId: sato.id,
          examName: "進研模試 高3 第1回",
          examDate: daysFromToday(-40),
          gradeLevel: "high3",
          overallDeviation: 64.8,
          overallScore: 542,
          schoolRank: 2,
          judgment: "A",
          subjects: JSON.stringify([
            { subject: "英語", deviation: 70.1, score: 180 },
            { subject: "国語", deviation: 65.3, score: 172 },
            { subject: "数学", deviation: 56.2, score: 115 },
          ]),
          notes: "",
        },
        {
          studentId: sato.id,
          examName: "全統共通テスト模試 第2回",
          examDate: daysFromToday(-10),
          gradeLevel: "high3",
          overallDeviation: 66.1,
          overallScore: 558,
          schoolRank: 1,
          judgment: "A",
          subjects: JSON.stringify([
            { subject: "英語", deviation: 71.4, score: 184 },
            { subject: "国語", deviation: 66.8, score: 176 },
            { subject: "数学", deviation: 57.5, score: 118 },
          ]),
          notes: "推薦判定A継続",
        },
      ];
      for (const m of mockSpecs) {
        const r = await tx.mockExamResult.create({ data: m });
        created.mockExamResults.push(r.id);
      }

      // ---- StudyRoomSession: 8 per student in last 2 weeks ----
      const sessionSpecs: Array<{
        studentId: string;
        campus: string;
        seatType: string;
        checkInAt: Date;
        checkOutAt: Date;
        autoCheckedOut: boolean;
        pointAwarded: boolean;
      }> = [];
      // Helper to make a session at offset days, hour from-to
      function mkSession(studentId: string, dayOffset: number, hourFrom: number, hourTo: number, campus: string) {
        const inAt = daysFromToday(dayOffset);
        inAt.setUTCHours(hourFrom - 9, 0, 0, 0); // Convert JST hour to UTC (JST=UTC+9)
        const outAt = new Date(inAt);
        outAt.setUTCHours(outAt.getUTCHours() + (hourTo - hourFrom));
        sessionSpecs.push({
          studentId,
          campus,
          seatType: "booth",
          checkInAt: inAt,
          checkOutAt: outAt,
          autoCheckedOut: false,
          pointAwarded: true,
        });
      }
      // Yamada: shuri
      mkSession(yamada.id, -13, 17, 21, "shuri");
      mkSession(yamada.id, -11, 16, 20, "shuri");
      mkSession(yamada.id, -9, 17, 21, "shuri");
      mkSession(yamada.id, -7, 14, 18, "shuri");
      mkSession(yamada.id, -5, 17, 21, "shuri");
      mkSession(yamada.id, -3, 16, 21, "shuri");
      mkSession(yamada.id, -1, 17, 20, "shuri");
      mkSession(yamada.id, 0, 14, 18, "shuri");
      // Sato: naha
      mkSession(sato.id, -13, 18, 21, "naha");
      mkSession(sato.id, -10, 17, 21, "naha");
      mkSession(sato.id, -8, 13, 17, "naha");
      mkSession(sato.id, -6, 17, 21, "naha");
      mkSession(sato.id, -4, 18, 21, "naha");
      mkSession(sato.id, -2, 17, 21, "naha");
      mkSession(sato.id, -1, 16, 20, "naha");
      mkSession(sato.id, 0, 14, 19, "naha");
      for (const s of sessionSpecs) {
        const r = await tx.studyRoomSession.create({ data: s });
        created.studyRoomSessions.push(r.id);
      }

      // ---- PointTransaction: 5 per student ----
      const pointSpecs = [
        // Yamada
        { studentId: yamada.id, delta: 1, reason: "自習室利用 (5/2)" },
        { studentId: yamada.id, delta: 1, reason: "自習室利用 (5/4)" },
        { studentId: yamada.id, delta: 1, reason: "週次目標達成" },
        { studentId: yamada.id, delta: 1, reason: "模試成績向上" },
        { studentId: yamada.id, delta: -3, reason: "図書カード500円分と交換" },
        // Sato
        { studentId: sato.id, delta: 1, reason: "自習室利用 (4/27)" },
        { studentId: sato.id, delta: 1, reason: "自習室利用 (4/30)" },
        { studentId: sato.id, delta: 1, reason: "面談出席" },
        { studentId: sato.id, delta: 1, reason: "週次目標達成" },
        { studentId: sato.id, delta: -2, reason: "おやつBOX交換" },
      ];
      for (const p of pointSpecs) {
        const r = await tx.pointTransaction.create({ data: p });
        created.pointTransactions.push(r.id);
      }

      if (dryRun) {
        // Roll back the entire transaction
        throw ROLLBACK;
      }
    }, { timeout: 60000 });
  } catch (e) {
    if (e === ROLLBACK) {
      console.log("=== DRY RUN COMPLETE (transaction rolled back, no writes) ===");
      console.log(JSON.stringify({
        wouldCreate: {
          studentAssignments: created.studentAssignments.length,
          bigGoals: created.bigGoals.length,
          learningGoals: created.learningGoals.length,
          progressRecords: created.progressRecords.length,
          tasks: created.tasks.length,
          routineTasks: created.routineTasks.length,
          meetings: created.meetings.length,
          mockExamResults: created.mockExamResults.length,
          studyRoomSessions: created.studyRoomSessions.length,
          pointTransactions: created.pointTransactions.length,
          total:
            created.studentAssignments.length +
            created.bigGoals.length +
            created.learningGoals.length +
            created.progressRecords.length +
            created.tasks.length +
            created.routineTasks.length +
            created.meetings.length +
            created.mockExamResults.length +
            created.studyRoomSessions.length +
            created.pointTransactions.length,
        },
      }, null, 2));
      return;
    }
    throw e;
  }

  // commit branch
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const batchPath = resolve(process.cwd(), `prisma/.test-batch-${ts}.json`);
  writeFileSync(batchPath, JSON.stringify({ createdAt: new Date().toISOString(), ids: created }, null, 2));
  console.log("=== COMMIT COMPLETE ===");
  console.log(`Batch file: ${batchPath}`);
  console.log(JSON.stringify({
    created: {
      studentAssignments: created.studentAssignments.length,
      bigGoals: created.bigGoals.length,
      learningGoals: created.learningGoals.length,
      progressRecords: created.progressRecords.length,
      tasks: created.tasks.length,
      routineTasks: created.routineTasks.length,
      meetings: created.meetings.length,
      mockExamResults: created.mockExamResults.length,
      studyRoomSessions: created.studyRoomSessions.length,
      pointTransactions: created.pointTransactions.length,
    },
  }, null, 2));
}

run()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
