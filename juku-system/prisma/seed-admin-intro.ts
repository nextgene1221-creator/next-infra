// 管理者向けイントロダクション記事「新規ユーザーのサインアップURL」を投入（冪等）。
// audience="admin" のため管理者にのみ表示され、生徒/講師には出ない。
// 同一タイトルの記事が既にあれば本文を更新、なければ新規作成する。他データには触れない。
//   実行: npx tsx prisma/seed-admin-intro.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const BASE_URL = "https://juku-system.vercel.app";
const TITLE = "【管理者用】新規ユーザーのサインアップURL";
const CATEGORY = "事務手続き";
const AUDIENCE = "admin";

const BODY = `新規の生徒・講師をシステムに登録する際に案内する**セルフ登録（サインアップ）URL**です。この記事は管理者にのみ表示されます（生徒・講師には表示されません）。

## サインアップURL

- **生徒用**: ${BASE_URL}/signup/student
- **講師用**: ${BASE_URL}/signup/teacher

## 運用メモ

- これらは**ログイン不要の公開ページ**です。URLを知っている人は誰でも登録できるため、案内先の管理にご注意ください。
- 登録後の**初期パスワードは \`password123\`** です。初回ログイン後にパスワード変更（\`/account/password\`）を案内してください。
- 生徒登録では氏名・高校・卒業年度・保護者情報のほか、校舎・文理・第1志望校・受験科目なども入力できます（後から生徒管理で編集可）。
- 初期導入が完了して**招待制に戻す**場合は、\`src/app/signup/\` と \`src/app/api/signup/\` を削除してデプロイします。
`;

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    const existing = await prisma.article.findFirst({ where: { title: TITLE } });
    if (existing) {
      const updated = await prisma.article.update({
        where: { id: existing.id },
        data: { body: BODY, audience: AUDIENCE, category: CATEGORY },
      });
      console.log("更新しました:", updated.id, "|", updated.title, "| audience=" + updated.audience);
    } else {
      const created = await prisma.article.create({
        data: {
          title: TITLE,
          body: BODY,
          audience: AUDIENCE,
          category: CATEGORY,
          publishedAt: new Date(),
        },
      });
      console.log("作成しました:", created.id, "|", created.title, "| audience=" + created.audience);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
