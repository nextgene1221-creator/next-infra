import { requireAuth } from "@/lib/session";
import UniversitiesClient from "./UniversitiesClient";

export const dynamic = "force-dynamic";

export default async function UniversitiesPage() {
  await requireAuth(["admin"]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-2">大学データ（受験情報の収集・追跡）</h1>
      <p className="text-sm text-dark/60 mb-6">
        大学HPのページURLを指定してクロールすると、AIが入試情報（学部・方式・日程・科目・受験料など）を抽出して保存します。
        再クロール時は前回との差分を検知し、変更履歴を残します。②出願戦略ジェネレータの参照データにもなります。
      </p>
      <UniversitiesClient />
    </div>
  );
}
