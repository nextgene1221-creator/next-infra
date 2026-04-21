import { requireAuth } from "@/lib/session";
import BlogEditor from "../BlogEditor";

export default async function NewBlogPage() {
  await requireAuth(["admin", "teacher"]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">ブログ投稿</h1>
      <BlogEditor />
    </div>
  );
}
