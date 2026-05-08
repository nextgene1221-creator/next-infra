// Read-only: inspect existing Article / BlogCategory / BlogPost shape & content
// to plan content seed.
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const articles = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      audience: true,
      category: true,
      publishedAt: true,
      body: true,
    },
  });
  const articlePreview = articles.map((a) => ({
    ...a,
    bodyHead: a.body.slice(0, 120),
    bodyLength: a.body.length,
    body: undefined,
  }));

  const blogCategories = await prisma.blogCategory.findMany();
  const blogPosts = await prisma.blogPost.findMany({
    select: { id: true, title: true, audience: true, categoryId: true, publishedAt: true },
  });

  console.log(JSON.stringify({ articlePreview, blogCategories, blogPosts }, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
