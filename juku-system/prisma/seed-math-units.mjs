import { PrismaNeon } from "@prisma/adapter-neon";
import "dotenv/config";

const { PrismaClient } = await import("../src/generated/prisma/client.ts");

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const units = [
  { subject: "数学1A", name: "数と式" },
  { subject: "数学1A", name: "集合と論理" },
  { subject: "数学1A", name: "二次関数" },
  { subject: "数学1A", name: "図形と計量" },
  { subject: "数学1A", name: "データの分析" },
  { subject: "数学1A", name: "場合の数" },
  { subject: "数学1A", name: "確率" },
  { subject: "数学1A", name: "図形の性質" },
  { subject: "数学1A", name: "整数" },
  { subject: "数学2BC", name: "式と証明" },
  { subject: "数学2BC", name: "複素数と方程式" },
  { subject: "数学2BC", name: "図形と方程式" },
  { subject: "数学2BC", name: "三角関数" },
  { subject: "数学2BC", name: "指数関数・対数関数" },
  { subject: "数学2BC", name: "微分" },
  { subject: "数学2BC", name: "積分" },
  { subject: "数学2BC", name: "数列" },
  { subject: "数学2BC", name: "統計的な推測" },
  { subject: "数学2BC", name: "ベクトル" },
  { subject: "数学2BC", name: "式と曲線" },
  { subject: "数学2BC", name: "複素数平面" },
  { subject: "数学3", name: "関数" },
  { subject: "数学3", name: "極限" },
  { subject: "数学3", name: "微分法" },
  { subject: "数学3", name: "微分法の応用" },
  { subject: "数学3", name: "積分法" },
  { subject: "数学3", name: "積分法の応用" },
];

let count = 0;
for (const u of units) {
  await prisma.printUnit.create({
    data: { subject: u.subject, name: u.name, printCount: 10 },
  });
  count++;
}
console.log(`Created ${count} math units`);
await prisma.$disconnect();
