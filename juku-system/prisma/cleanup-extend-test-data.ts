// Cleanup script for records created by seed-extend-test-data.ts.
// Reads a batch JSON file (prisma/.test-batch-*.json) and deletes only those records.
//
// Usage:
//   npx tsx prisma/cleanup-extend-test-data.ts <batch-file> --dry-run
//   npx tsx prisma/cleanup-extend-test-data.ts <batch-file> --commit

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { readFileSync } from "node:fs";
import "dotenv/config";

const args = process.argv.slice(2);
const batchPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const commit = args.includes("--commit");

if (!batchPath || (!dryRun && !commit) || (dryRun && commit)) {
  console.error("Usage: npx tsx prisma/cleanup-extend-test-data.ts <batch-file> --dry-run|--commit");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Batch = {
  createdAt: string;
  ids: {
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
};

async function main() {
  const batch: Batch = JSON.parse(readFileSync(batchPath as string, "utf8"));
  console.log(`Batch created at: ${batch.createdAt}`);
  console.log(`To delete:`);
  for (const [k, v] of Object.entries(batch.ids)) {
    console.log(`  ${k}: ${(v as string[]).length}`);
  }

  const ROLLBACK = Symbol("dry-run-rollback");
  try {
    await prisma.$transaction(async (tx) => {
      // Delete order: child → parent. LearningGoal references BigGoal, ProgressRecord
      // references LearningGoal (via goalId). Meetings, tasks etc. are independent.
      const r1 = await tx.progressRecord.deleteMany({ where: { id: { in: batch.ids.progressRecords } } });
      const r2 = await tx.learningGoal.deleteMany({ where: { id: { in: batch.ids.learningGoals } } });
      const r3 = await tx.bigGoal.deleteMany({ where: { id: { in: batch.ids.bigGoals } } });
      const r4 = await tx.task.deleteMany({ where: { id: { in: batch.ids.tasks } } });
      const r5 = await tx.routineTask.deleteMany({ where: { id: { in: batch.ids.routineTasks } } });
      const r6 = await tx.meeting.deleteMany({ where: { id: { in: batch.ids.meetings } } });
      const r7 = await tx.mockExamResult.deleteMany({ where: { id: { in: batch.ids.mockExamResults } } });
      const r8 = await tx.studyRoomSession.deleteMany({ where: { id: { in: batch.ids.studyRoomSessions } } });
      const r9 = await tx.pointTransaction.deleteMany({ where: { id: { in: batch.ids.pointTransactions } } });
      const r10 = await tx.studentAssignment.deleteMany({ where: { id: { in: batch.ids.studentAssignments } } });

      console.log("Deleted counts:", {
        progressRecord: r1.count,
        learningGoal: r2.count,
        bigGoal: r3.count,
        task: r4.count,
        routineTask: r5.count,
        meeting: r6.count,
        mockExamResult: r7.count,
        studyRoomSession: r8.count,
        pointTransaction: r9.count,
        studentAssignment: r10.count,
      });

      if (dryRun) throw ROLLBACK;
    }, { timeout: 60000 });
    console.log("=== COMMIT COMPLETE ===");
  } catch (e) {
    if (e === ROLLBACK) {
      console.log("=== DRY RUN COMPLETE (rolled back) ===");
      return;
    }
    throw e;
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
