import { PrismaClient } from "./generated-client.cjs";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.alert.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.task.deleteMany();
  await prisma.progressRecord.deleteMany();
  await prisma.studentTeacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: { email: "admin@juku.example.com", passwordHash: hash, role: "admin", name: "管理者 太郎" },
  });

  const teacherUser1 = await prisma.user.create({
    data: { email: "tanaka@juku.example.com", passwordHash: hash, role: "teacher", name: "田中 花子" },
  });
  const teacher1 = await prisma.teacher.create({
    data: { userId: teacherUser1.id, subjects: JSON.stringify(["数学", "物理"]), employmentType: "full_time", phone: "090-1234-5678", status: "active" },
  });

  const teacherUser2 = await prisma.user.create({
    data: { email: "suzuki@juku.example.com", passwordHash: hash, role: "teacher", name: "鈴木 一郎" },
  });
  const teacher2 = await prisma.teacher.create({
    data: { userId: teacherUser2.id, subjects: JSON.stringify(["英語", "国語"]), employmentType: "part_time", phone: "090-9876-5432", status: "active" },
  });

  const studentUser1 = await prisma.user.create({
    data: { email: "yamada@student.example.com", passwordHash: hash, role: "student", name: "山田 太郎" },
  });
  const student1 = await prisma.student.create({
    data: { userId: studentUser1.id, grade: 2, schoolName: "都立第一高校", parentName: "山田 一男", parentPhone: "03-1234-5678", parentEmail: "yamada.parent@example.com", enrollmentDate: new Date("2025-04-01"), status: "active", notes: "理系志望" },
  });

  const studentUser2 = await prisma.user.create({
    data: { email: "sato@student.example.com", passwordHash: hash, role: "student", name: "佐藤 美咲" },
  });
  const student2 = await prisma.student.create({
    data: { userId: studentUser2.id, grade: 3, schoolName: "私立桜丘高校", parentName: "佐藤 正", parentPhone: "03-8765-4321", parentEmail: "sato.parent@example.com", enrollmentDate: new Date("2024-04-01"), status: "active", notes: "文系志望・推薦入試対策中" },
  });

  await prisma.studentTeacher.createMany({
    data: [
      { studentId: student1.id, teacherId: teacher1.id, subject: "数学" },
      { studentId: student1.id, teacherId: teacher2.id, subject: "英語" },
      { studentId: student2.id, teacherId: teacher2.id, subject: "英語" },
      { studentId: student2.id, teacherId: teacher2.id, subject: "国語" },
    ],
  });

  await prisma.progressRecord.createMany({
    data: [
      { studentId: student1.id, teacherId: teacher1.id, subject: "数学", date: new Date("2026-04-01"), topic: "微分の基礎", understandingLevel: 4, comment: "微分の概念をしっかり理解できている。演習を増やそう。" },
      { studentId: student1.id, teacherId: teacher2.id, subject: "英語", date: new Date("2026-04-02"), topic: "関係代名詞", understandingLevel: 3, comment: "基本は理解しているが、複雑な文で混乱する。" },
      { studentId: student2.id, teacherId: teacher2.id, subject: "英語", date: new Date("2026-04-03"), topic: "長文読解", understandingLevel: 5, comment: "非常に良い読解力。入試レベルの問題も正確に解ける。" },
    ],
  });

  await prisma.task.createMany({
    data: [
      { studentId: student1.id, teacherId: teacher1.id, subject: "数学", title: "微分の演習問題 p.45-50", description: "教科書の演習問題を解くこと。途中式も書くように。", dueDate: new Date("2026-04-10"), status: "pending" },
      { studentId: student1.id, teacherId: teacher2.id, subject: "英語", title: "英単語テスト範囲の暗記", description: "ターゲット1900の501-600を暗記。", dueDate: new Date("2026-04-08"), status: "in_progress" },
      { studentId: student2.id, teacherId: teacher2.id, subject: "英語", title: "過去問演習 2024年度", description: "志望校の2024年度英語過去問を時間を計って解く。", dueDate: new Date("2026-04-05"), status: "overdue" },
    ],
  });

  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0) continue;
    await prisma.shift.create({
      data: { teacherId: teacher1.id, date: d, startTime: "14:00", endTime: "20:00", status: i < 3 ? "confirmed" : "scheduled", notes: "" },
    });
    if (d.getDay() !== 6) {
      await prisma.shift.create({
        data: { teacherId: teacher2.id, date: d, startTime: "16:00", endTime: "21:00", status: i < 3 ? "confirmed" : "scheduled", notes: "" },
      });
    }
  }

  await prisma.alert.createMany({
    data: [
      { userId: admin.id, type: "task_overdue", title: "タスク期限超過", message: "佐藤 美咲さんの「過去問演習 2024年度」が期限を超過しています。", isRead: false },
      { userId: teacherUser2.id, type: "task_overdue", title: "タスク期限超過", message: "佐藤 美咲さんの「過去問演習 2024年度」が期限を超過しています。", isRead: false },
      { userId: admin.id, type: "general", title: "新学期のお知らせ", message: "新学期の時間割を確認してください。", isRead: false },
      { userId: studentUser1.id, type: "shift_reminder", title: "明日の授業", message: "明日14:00から数学の授業があります。", isRead: false },
    ],
  });

  console.log("Seed data created successfully!");
  console.log("\nLogin accounts (password: password123):");
  console.log("  Admin:   admin@juku.example.com");
  console.log("  Teacher: tanaka@juku.example.com");
  console.log("  Teacher: suzuki@juku.example.com");
  console.log("  Student: yamada@student.example.com");
  console.log("  Student: sato@student.example.com");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
