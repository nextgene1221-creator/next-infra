import { requireAuth } from "@/lib/session";
import ArticleEditor from "../ArticleEditor";

export default async function NewArticlePage() {
  await requireAuth(["admin"]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">記事を作成</h1>
      <ArticleEditor />
    </div>
  );
}
