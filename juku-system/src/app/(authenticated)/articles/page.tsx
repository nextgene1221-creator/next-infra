import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ArticlesList from "./ArticlesList";

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await requireAuth();
  const role = session.user.role;
  const params = await searchParams;
  const q = params.q || "";
  const categoryFilter = params.category || "";

  const audienceFilter =
    role === "admin" ? undefined : { in: [role, "both"] };

  const articles = await prisma.article.findMany({
    where: {
      ...(audienceFilter ? { audience: audienceFilter } : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { body: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">イントロダクション</h1>
        {role === "admin" && (
          <Link
            href="/articles/new"
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
          >
            新規作成
          </Link>
        )}
      </div>
      <ArticlesList
        initialArticles={articles.map((a) => ({
          id: a.id,
          title: a.title,
          audience: a.audience,
          category: a.category,
          publishedAt: a.publishedAt.toISOString(),
        }))}
        initialQuery={q}
        initialCategory={categoryFilter}
      />
    </div>
  );
}
