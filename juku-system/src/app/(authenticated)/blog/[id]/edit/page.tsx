import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BlogEditor from "../../BlogEditor";

export default async function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth(["admin", "teacher"]);
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">ブログ編集</h1>
      <BlogEditor
        postId={post.id}
        initial={{
          title: post.title,
          body: post.body,
          audience: post.audience,
          categoryId: post.categoryId,
          images: JSON.parse(post.images || "[]"),
          publishedAt: post.publishedAt.toISOString().split("T")[0],
        }}
      />
    </div>
  );
}
