import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";

const AUDIENCE_LABELS: Record<string, string> = {
  student: "生徒向け",
  teacher: "講師向け",
  admin: "運営向け",
  both: "全員向け",
};

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: { category: true, author: { select: { name: true } } },
  });
  if (!post) notFound();

  const role = session.user.role;
  if (role !== "admin" && post.audience !== "both" && post.audience !== role) {
    notFound();
  }

  // 既読マーク
  await prisma.blogRead.upsert({
    where: { userId_blogPostId: { userId: session.user.id, blogPostId: id } },
    create: { userId: session.user.id, blogPostId: id },
    update: {},
  });

  const html = marked.parse(post.body, { breaks: true, async: false }) as string;
  const images: { url: string; name: string }[] = post.images ? JSON.parse(post.images) : [];
  const canEdit = role === "admin" || post.authorId === session.user.id;

  return (
    <div className="max-w-3xl">
      <Link href="/blog" className="text-sm text-primary hover:underline">&larr; 一覧へ戻る</Link>
      <article className="bg-white rounded-lg shadow p-6 mt-3">
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-primary-light text-primary font-medium">{post.category.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-surface text-dark/70">{AUDIENCE_LABELS[post.audience] || post.audience}</span>
          <span className="text-dark/50">{new Date(post.publishedAt).toLocaleDateString("ja-JP")}</span>
          <span className="text-dark/40">by {post.author.name}</span>
        </div>
        <h1 className="text-2xl font-bold text-dark mb-4">{post.title}</h1>
        <div
          className="prose prose-sm max-w-none [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:rounded [&_img]:my-2"
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
        {canEdit && (
          <div className="mt-6 pt-4 border-t flex gap-3">
            <Link href={`/blog/${post.id}/edit`} className="bg-primary text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-dark">編集</Link>
          </div>
        )}
      </article>
    </div>
  );
}
