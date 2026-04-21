import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import BlogCategoryManager from "./BlogCategoryManager";

export default async function BlogCategoriesPage() {
  await requireAuth(["admin"]);
  const categories = await prisma.blogCategory.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">ブログカテゴリ管理</h1>
      <BlogCategoryManager
        initialCategories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          sortOrder: c.sortOrder,
        }))}
      />
    </div>
  );
}
