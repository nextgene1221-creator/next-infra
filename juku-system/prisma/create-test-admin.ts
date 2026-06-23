// 開発環境用: テスト専用の管理者アカウントを1件だけ作成/更新する（冪等）。
// 他のデータには一切触れない。
//   実行: npx tsx prisma/create-test-admin.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const EMAIL = "test-admin@dev.local";
const PASSWORD = "test1234";
const NAME = "テスト管理者";

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash, role: "admin", name: NAME },
    create: { email: EMAIL, passwordHash, role: "admin", name: NAME },
  });

  console.log("✓ テスト管理者を用意しました");
  console.log(`  email:    ${user.email}`);
  console.log(`  password: ${PASSWORD}`);
  console.log(`  role:     ${user.role}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
