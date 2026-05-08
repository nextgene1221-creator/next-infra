// Read-only inspection script. Does NOT call create/update/delete.
// Used to summarize existing test accounts so a follow-up seed can extend them.
//
// Usage (from juku-system/):
//   npx tsx prisma/inspect-data.ts

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type UserRow = { id: string; name: string; email: string; role: string };

async function main() {
  const users: UserRow[] = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  const teachers = await prisma.teacher.findMany({
    select: {
      id: true,
      userId: true,
      subjects: true,
      employmentType: true,
      status: true,
    },
  });

  const students = await prisma.student.findMany({
    select: {
      id: true,
      userId: true,
      graduationYear: true,
      schoolName: true,
      status: true,
      campus: true,
    },
  });

  const counts: Record<string, number | string> = {};
  const tables = [
    "user",
    "teacher",
    "student",
    "studentAssignment",
    "progressRecord",
    "task",
    "shift",
    "attendance",
    "shiftTemplateDay",
    "routineTask",
    "meeting",
    "learningGoal",
    "bigGoal",
    "mockExamResult",
    "studyRoomSession",
    "studyScheduleDay",
    "pointTransaction",
    "studentPrint",
    "alert",
    "campus",
    "printUnit",
    "school",
    "schoolEvent",
    "blogCategory",
    "blogPost",
    "article",
  ] as const;

  for (const t of tables) {
    try {
      // @ts-expect-error dynamic table access
      counts[t] = await prisma[t].count();
    } catch (e) {
      counts[t] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  const teacherByUser = new Map(teachers.map((t) => [t.userId, t]));
  const studentByUser = new Map(students.map((s) => [s.userId, s]));

  const joined = users.map((u) => {
    const base: Record<string, unknown> = { id: u.id, name: u.name, email: u.email, role: u.role };
    if (u.role === "teacher") {
      const t = teacherByUser.get(u.id);
      if (t) {
        let subjects: unknown = t.subjects;
        try {
          subjects = JSON.parse(t.subjects);
        } catch {
          /* leave as raw string */
        }
        base.teacherId = t.id;
        base.subjects = subjects;
        base.employmentType = t.employmentType;
        base.status = t.status;
      }
    }
    if (u.role === "student") {
      const s = studentByUser.get(u.id);
      if (s) {
        base.studentId = s.id;
        base.graduationYear = s.graduationYear;
        base.schoolName = s.schoolName;
        base.status = s.status;
        base.campus = s.campus;
      }
    }
    return base;
  });

  console.log(JSON.stringify({ counts, users: joined }, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
