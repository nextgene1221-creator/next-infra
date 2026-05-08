// Cleanup script for records created by seed-content-test-data.ts.
//
// Usage:
//   npx tsx prisma/cleanup-content-test-data.ts <batch-file> --dry-run
//   npx tsx prisma/cleanup-content-test-data.ts <batch-file> --commit

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { readFileSync } from "node:fs";
import "dotenv/config";

const args = process.argv.slice(2);
const batchPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const commit = args.includes("--commit");

if (!batchPath || (!dryRun && !commit) || (dryRun && commit)) {
  console.error("Usage: npx tsx prisma/cleanup-content-test-data.ts <batch-file> --dry-run|--commit");
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
  ids: { articles: string[]; blogCategories: string[]; blogPosts: string[] };
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
      // BlogPost references BlogCategory; delete posts first.
      const r1 = await tx.blogPost.deleteMany({ where: { id: { in: batch.ids.blogPosts } } });
      const r2 = await tx.blogCategory.deleteMany({ where: { id: { in: batch.ids.blogCategories } } });
      const r3 = await tx.article.deleteMany({ where: { id: { in: batch.ids.articles } } });
      console.log("Deleted counts:", { blogPost: r1.count, blogCategory: r2.count, article: r3.count });
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
