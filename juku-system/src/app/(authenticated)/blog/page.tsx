import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import BlogList from "./BlogList";

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string }>;
}) {
  const session = await requireAuth();
  const role = session.user.role;
  const params = await searchParams;
  const q = params.q || "";
  const categoryFilter = params.categoryId || "";

  const audienceFilter = role === "admin" ? undefined : { in: [role, "both"] };

  const posts = await prisma.blogPost.findMany({
    where: {
      ...(audienceFilter ? { audience: audienceFilter } : {}),
      ...(categoryFilter ? { categoryId: categoryFilter } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { body: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: { category: true, author: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
  });

  const categories = await prisma.blogCategory.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">ブログ</h1>
        <div className="flex gap-2">
          {role === "admin" && (
            <Link
              href="/blog-categories"
              className="bg-charcoal text-white px-4 py-2 rounded-md text-sm hover:bg-dark"
            >
              カテゴリ管理
            </Link>
          )}
          {role !== "student" && (
            <Link
              href="/blog/new"
              className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
            >
              新規投稿
            </Link>
          )}
        </div>
      </div>
      <BlogList
        initialPosts={posts.map((p) => ({
          id: p.id,
          title: p.title,
          audience: p.audience,
          categoryName: p.category.name,
          authorName: p.author.name,
          publishedAt: p.publishedAt.toISOString(),
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initialQuery={q}
        initialCategoryId={categoryFilter}
      />
    </div>
  );
}
