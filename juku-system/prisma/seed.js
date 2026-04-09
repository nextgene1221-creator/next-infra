// Seed script using better-sqlite3 directly to avoid Prisma 7 ESM issues
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const path = require("path");

const dbPath = path.join(__dirname, "..", "dev.db");
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function now() {
  return new Date().toISOString();
}

async function main() {
  const hash = await bcrypt.hash("password123", 10);
  const timestamp = now();

  // Clean existing data
  db.exec("DELETE FROM alerts");
  db.exec("DELETE FROM shifts");
  db.exec("DELETE FROM tasks");
  db.exec("DELETE FROM progress_records");

  db.exec("DELETE FROM students");
  db.exec("DELETE FROM teachers");
  db.exec("DELETE FROM users");

  const insertUser = db.prepare(
    "INSERT INTO users (id, email, password_hash, role, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertStudent = db.prepare(
    "INSERT INTO students (id, user_id, graduation_year, school_name, parent_name, parent_phone, parent_email, enrollment_date, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertTeacher = db.prepare(
    "INSERT INTO teachers (id, user_id, subjects, employment_type, phone, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const insertProgress = db.prepare(
    "INSERT INTO progress_records (id, student_id, teacher_id, subject, date, material, pages_completed, goal_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertTask = db.prepare(
    "INSERT INTO tasks (id, student_id, teacher_id, subject, title, description, due_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertShift = db.prepare(
    "INSERT INTO shifts (id, teacher_id, date, start_time, end_time, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertAlert = db.prepare(
    "INSERT INTO alerts (id, user_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  // Admin
  const adminId = randomUUID();
  insertUser.run(adminId, "admin@juku.example.com", hash, "admin", "管理者 太郎", timestamp, timestamp);

  // Teacher 1
  const tu1Id = randomUUID();
  insertUser.run(tu1Id, "tanaka@juku.example.com", hash, "teacher", "田中 花子", timestamp, timestamp);
  const t1Id = randomUUID();
  insertTeacher.run(t1Id, tu1Id, JSON.stringify(["数学", "物理"]), "full_time", "090-1234-5678", "active", timestamp, timestamp);

  // Teacher 2
  const tu2Id = randomUUID();
  insertUser.run(tu2Id, "suzuki@juku.example.com", hash, "teacher", "鈴木 一郎", timestamp, timestamp);
  const t2Id = randomUUID();
  insertTeacher.run(t2Id, tu2Id, JSON.stringify(["英語", "国語"]), "part_time", "090-9876-5432", "active", timestamp, timestamp);

  // Student 1
  const su1Id = randomUUID();
  insertUser.run(su1Id, "yamada@student.example.com", hash, "student", "山田 太郎", timestamp, timestamp);
  const s1Id = randomUUID();
  insertStudent.run(s1Id, su1Id, 2028, "都立第一高校", "山田 一男", "03-1234-5678", "yamada.parent@example.com", "2025-04-01T00:00:00.000Z", "active", "理系志望", timestamp, timestamp);

  // Student 2
  const su2Id = randomUUID();
  insertUser.run(su2Id, "sato@student.example.com", hash, "student", "佐藤 美咲", timestamp, timestamp);
  const s2Id = randomUUID();
  insertStudent.run(s2Id, su2Id, 2027, "私立桜丘高校", "佐藤 正", "03-8765-4321", "sato.parent@example.com", "2024-04-01T00:00:00.000Z", "active", "文系志望・推薦入試対策中", timestamp, timestamp);

  // Progress records
  insertProgress.run(randomUUID(), s1Id, t1Id, "数学", "2026-04-01T00:00:00.000Z", "青チャート数学IA", 10, null, timestamp, timestamp);
  insertProgress.run(randomUUID(), s1Id, t2Id, "英語", "2026-04-02T00:00:00.000Z", "ターゲット1900", 20, null, timestamp, timestamp);
  insertProgress.run(randomUUID(), s2Id, t2Id, "英語", "2026-04-03T00:00:00.000Z", "速読英単語", 15, null, timestamp, timestamp);

  // Tasks
  insertTask.run(randomUUID(), s1Id, t1Id, "数学", "微分の演習問題 p.45-50", "教科書の演習問題を解くこと。途中式も書くように。", "2026-04-10T00:00:00.000Z", "pending", timestamp, timestamp);
  insertTask.run(randomUUID(), s1Id, t2Id, "英語", "英単語テスト範囲の暗記", "ターゲット1900の501-600を暗記。", "2026-04-08T00:00:00.000Z", "in_progress", timestamp, timestamp);
  insertTask.run(randomUUID(), s2Id, t2Id, "英語", "過去問演習 2024年度", "志望校の2024年度英語過去問を時間を計って解く。", "2026-04-05T00:00:00.000Z", "overdue", timestamp, timestamp);

  // Shifts (next 14 days)
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0) continue;
    const dateStr = d.toISOString();
    const status = i < 3 ? "confirmed" : "scheduled";

    insertShift.run(randomUUID(), t1Id, dateStr, "14:00", "20:00", status, "", timestamp, timestamp);
    if (d.getDay() !== 6) {
      insertShift.run(randomUUID(), t2Id, dateStr, "16:00", "21:00", status, "", timestamp, timestamp);
    }
  }

  // Alerts
  insertAlert.run(randomUUID(), adminId, "task_overdue", "タスク期限超過", "佐藤 美咲さんの「過去問演習 2024年度」が期限を超過しています。", 0, timestamp);
  insertAlert.run(randomUUID(), tu2Id, "task_overdue", "タスク期限超過", "佐藤 美咲さんの「過去問演習 2024年度」が期限を超過しています。", 0, timestamp);
  insertAlert.run(randomUUID(), adminId, "general", "新学期のお知らせ", "新学期の時間割を確認してください。", 0, timestamp);
  insertAlert.run(randomUUID(), su1Id, "shift_reminder", "明日の授業", "明日14:00から数学の授業があります。", 0, timestamp);

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
  .finally(() => db.close());
