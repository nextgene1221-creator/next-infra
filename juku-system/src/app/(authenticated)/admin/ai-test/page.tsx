import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AiTestClient, { type StudentOption } from "./AiTestClient";

export const dynamic = "force-dynamic";

export default async function AiTestPage() {
  await requireAuth(["admin"]);

  const students = await prisma.student.findMany({
    where: { status: "active" },
    include: { user: { select: { name: true } } },
    orderBy: { furigana: "asc" },
  });

  const options: StudentOption[] = students.map((s) => ({
    id: s.id,
    name: s.user.name,
    firstChoiceSchool: s.firstChoiceSchool,
    graduationYear: s.graduationYear,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-2">AI診断テスト（管理者）</h1>
      <p className="text-sm text-dark/60 mb-6">
        ①志望校診断・②出願戦略の検証用ページです。生徒のプロフィールと直近模試（②は加えて「大学データ」で収集した入試情報・予算）をもとにAIが生成します。
        <span className="font-medium">結果は保存されず、生徒には表示されません。</span>
        AI基盤（Vercel AI Gateway）の疎通確認を目的としています。
      </p>
      <AiTestClient students={options} />
    </div>
  );
}
