import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { AUDIENCE_LABELS } from "@/lib/articles";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();

  const role = session.user.role;
  if (
    role !== "admin" &&
    article.audience !== "both" &&
    article.audience !== role
  ) {
    notFound();
  }

  // 既読マーク
  await prisma.articleRead.upsert({
    where: { userId_articleId: { userId: session.user.id, articleId: id } },
    create: { userId: session.user.id, articleId: id },
    update: {},
  });

  const html = marked.parse(article.body, { breaks: true, async: false }) as string;
  const images: { url: string; name: string }[] = article.images
    ? JSON.parse(article.images)
    : [];

  return (
    <div className="max-w-3xl">
      <Link href="/articles" className="text-sm text-primary hover:underline">← 一覧へ戻る</Link>
      <article className="bg-white rounded-lg shadow p-6 mt-3">
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-primary-light text-primary font-medium">{article.category}</span>
          <span className="px-2 py-0.5 rounded-full bg-surface text-dark/70">{AUDIENCE_LABELS[article.audience] || article.audience}</span>
          <span className="text-dark/50">{new Date(article.publishedAt).toLocaleDateString("ja-JP")}</span>
        </div>
        <h1 className="text-2xl font-bold text-dark mb-4">{article.title}</h1>
        <div
          className="prose prose-sm max-w-none [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_img]:my-2 [&_code]:bg-surface [&_code]:px-1 [&_code]:rounded"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {images.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h2 className="text-sm font-semibold text-dark mb-2">添付画像</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {images.map((img, i) => (
                <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={img.url} alt={img.name} className="w-full h-32 object-cover rounded border border-gray-200" />
                  <p className="text-xs text-dark/60 truncate">{img.name}</p>
                </a>
              ))}
            </div>
          </div>
        )}
        {role === "admin" && (
          <div className="mt-6 pt-4 border-t flex gap-3">
            <Link href={`/articles/${article.id}/edit`} className="bg-primary text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-dark">編集</Link>
          </div>
        )}
      </article>
    </div>
  );
}
