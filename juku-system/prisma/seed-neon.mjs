import { PrismaNeon } from "@prisma/adapter-neon";
import "dotenv/config";

// Dynamic import for generated client (ESM)
const { PrismaClient } = await import("../src/generated/prisma/client.ts");

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const { default: bcrypt } = await import("bcryptjs");

async function main() {
  // Clean in correct order (foreign keys)
  await prisma.alert.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.shiftTemplate.deleteMany();
  await prisma.routineTask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.progressRecord.deleteMany();
  await prisma.learningGoal.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("password123", 10);

  // Admin
  const admin = await prisma.user.create({
    data: { email: "admin@juku.example.com", passwordHash: hash, role: "admin", name: "管理者 太郎" },
  });

  // Teachers
  const tu1 = await prisma.user.create({
    data: { email: "tanaka@juku.example.com", passwordHash: hash, role: "teacher", name: "田中 花子" },
  });
  const t1 = await prisma.teacher.create({
    data: { userId: tu1.id, subjects: JSON.stringify(["数学", "物理"]), employmentType: "full_time", phone: "090-1234-5678" },
  });

  const tu2 = await prisma.user.create({
    data: { email: "suzuki@juku.example.com", passwordHash: hash, role: "teacher", name: "鈴木 一郎" },
  });
  const t2 = await prisma.teacher.create({
    data: { userId: tu2.id, subjects: JSON.stringify(["英語", "国語"]), employmentType: "part_time", phone: "090-9876-5432" },
  });

  // Students
  const su1 = await prisma.user.create({
    data: { email: "yamada@student.example.com", passwordHash: hash, role: "student", name: "山田 太郎" },
  });
  const s1 = await prisma.student.create({
    data: { userId: su1.id, graduationYear: 2028, schoolName: "都立第一高校", parentName: "山田 一男", parentPhone: "03-1234-5678", parentEmail: "yamada.parent@example.com", enrollmentDate: new Date("2025-04-01"), notes: "理系志望" },
  });

  const su2 = await prisma.user.create({
    data: { email: "sato@student.example.com", passwordHash: hash, role: "student", name: "佐藤 美咲" },
  });
  const s2 = await prisma.student.create({
    data: { userId: su2.id, graduationYear: 2027, schoolName: "私立桜丘高校", parentName: "佐藤 正", parentPhone: "03-8765-4321", parentEmail: "sato.parent@example.com", enrollmentDate: new Date("2024-04-01"), notes: "文系志望・推薦入試対策中" },
  });

  // Progress
  await prisma.progressRecord.createMany({
    data: [
      { studentId: s1.id, teacherId: t1.id, subject: "数学", date: new Date("2026-04-01"), material: "青チャート数学IA", topic: "二次関数の基礎", pagesCompleted: 10 },
      { studentId: s1.id, teacherId: t2.id, subject: "英語", date: new Date("2026-04-02"), material: "ターゲット1900", topic: "500-600の暗記テスト", pagesCompleted: 20 },
      { studentId: s2.id, teacherId: t2.id, subject: "英語", date: new Date("2026-04-03"), material: "速読英単語", topic: "長文読解演習", pagesCompleted: 15 },
    ],
  });

  // Tasks
  await prisma.task.createMany({
    data: [
      { studentId: s1.id, teacherId: t1.id, subject: "数学", title: "微分の演習問題 p.45-50", description: "教科書の演習問題を解くこと。", dueDate: new Date("2026-04-15"), type: "通常" },
      { studentId: s1.id, teacherId: t2.id, subject: "英語", title: "英単語テスト範囲の暗記", description: "ターゲット1900の501-600。", dueDate: new Date("2026-04-12"), type: "要引き継ぎ" },
      { studentId: s2.id, teacherId: t2.id, subject: "英語", title: "過去問演習 2024年度", description: "志望校の2024年度英語過去問。", dueDate: new Date("2026-04-10"), type: "通常" },
    ],
  });

  // Alerts
  await prisma.alert.createMany({
    data: [
      { userId: admin.id, type: "general", title: "新学期のお知らせ", message: "新学期の時間割を確認してください。", isRead: false },
      { userId: su1.id, type: "shift_reminder", title: "明日の授業", message: "明日14:00から数学の授業があります。", isRead: false },
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
