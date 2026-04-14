import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ArticleEditor from "../../ArticleEditor";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth(["admin"]);
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">記事を編集</h1>
      <ArticleEditor
        articleId={article.id}
        initial={{
          title: article.title,
          body: article.body,
          audience: article.audience,
          category: article.category,
          images: article.images ? JSON.parse(article.images) : [],
          publishedAt: article.publishedAt.toISOString().split("T")[0],
        }}
      />
    </div>
  );
}
