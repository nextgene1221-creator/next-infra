// Seed Article (イントロダクション) and BlogCategory + BlogPost (ブログ).
//
// Run modes:
//   npx tsx prisma/seed-content-test-data.ts --dry-run
//   npx tsx prisma/seed-content-test-data.ts --commit
//
// On --commit success, writes prisma/.test-batch-content-<ISO>.json with all created IDs.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import "dotenv/config";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const commit = args.includes("--commit");

if (!dryRun && !commit) {
  console.error("Pass either --dry-run or --commit");
  process.exit(1);
}
if (dryRun && commit) {
  console.error("Pass only one of --dry-run or --commit");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TODAY = new Date("2026-05-06T00:00:00.000Z");
function daysFromToday(offset: number): Date {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

type CreatedIds = {
  articles: string[];
  blogCategories: string[];
  blogPosts: string[];
};

async function run() {
  const created: CreatedIds = { articles: [], blogCategories: [], blogPosts: [] };
  const ROLLBACK = Symbol("dry-run-rollback");

  try {
    await prisma.$transaction(async (tx) => {
      const admin = await tx.user.findFirstOrThrow({
        where: { email: "admin@juku.example.com" },
      });

      // ---- Articles (5 items) ----
      const articleSpecs = [
        {
          title: "システムの使い方ガイド",
          audience: "both",
          category: "システム使い方",
          publishedAt: daysFromToday(-45),
          body: `# システムの使い方ガイド

このページでは、本システムの基本的な使い方を説明します。

## ログインと初期画面

ログイン後はダッシュボードが表示されます。左のサイドバーから各機能に移動できます。

## 主な機能

- **学習進捗**: 日々の学習記録を確認・入力
- **ゼミ管理**: ゼミの予定と教材プリントを管理
- **タスク管理**: 講師から生徒への課題を管理
- **シフト管理**: 講師のシフト確認・出退勤打刻

## 困ったときは

操作に迷った場合は、各画面の右上にあるヘルプアイコンを参照するか、運営にお問い合わせください。`,
        },
        {
          title: "学習進捗の入力方法",
          audience: "teacher",
          category: "システム使い方",
          publishedAt: daysFromToday(-38),
          body: `# 学習進捗の入力方法（講師向け）

授業後は必ず学習進捗を記録してください。

## 入力手順

1. サイドバー「学習進捗」をクリック
2. 担当生徒を選択
3. 「進捗を追加」から以下を入力
   - 科目
   - 教材名
   - 学習内容（topic）
   - 進めたページ数
   - 紐づく週次目標（任意）

## 注意事項

- **当日中の入力**を徹底してください。翌日以降になると記憶が曖昧になります。
- 教材名は既存の表記に揃えてください（例: "青チャート数学IIB"）。
- 週次目標と紐づけると、目標達成率が自動計算されます。`,
        },
        {
          title: "自習室の利用ルール",
          audience: "student",
          category: "塾ルール",
          publishedAt: daysFromToday(-30),
          body: `# 自習室の利用ルール

自習室を快適に使うため、以下のルールを守ってください。

## 利用時間

- 平日: 16:00 〜 21:00
- 土曜: 13:00 〜 21:00
- 日祝: 休室

## 入退室

- 入室時・退室時に必ずタブレットでチェックイン/チェックアウト
- 21:00 までにチェックアウトしない場合、自動チェックアウトされます

## 守ってほしいこと

- **私語は厳禁**。質問は講師室で
- 飲食はペットボトル飲料のみ可
- 携帯電話は鞄にしまうかマナーモード
- 退室時は机を整え、消しゴムカスを捨ててください

## ポイントについて

1日1回の利用で 1pt 付与されます。10pt で図書カードと交換できます。`,
        },
        {
          title: "保護者面談の流れ",
          audience: "student",
          category: "事務手続き",
          publishedAt: daysFromToday(-20),
          body: `# 保護者面談の流れ

定期面談は年3回（5月・8月・12月）実施しています。

## 予約方法

1. 運営から面談案内のメールが届きます
2. 候補日から希望日時を選び返信
3. 確定したら自動でカレンダー招待が送られます

## 当日の持ち物

- 学習計画書（前回面談時に配布したもの）
- 直近の模試結果（あれば）

## 面談で話すこと

- 学習進捗の振り返り
- 次の3ヶ月の目標設定
- 進路相談（高3は重点的に）

## 緊急の相談

通常の面談タイミング以外でも、気になることがあれば運営までご連絡ください。`,
        },
        {
          title: "シフト提出の手順",
          audience: "teacher",
          category: "事務手続き",
          publishedAt: daysFromToday(-10),
          body: `# シフト提出の手順（講師向け）

毎月のシフトは前月15日までに提出してください。

## 提出方法

1. サイドバー「シフト管理」を開く
2. 「シフト希望を登録」から月単位で入力
3. 曜日テンプレートを使うと毎月の入力が楽になります

## 締切と確定

- **15日**: 講師シフト希望の提出締切
- **20日**: 運営側で調整の上、シフト確定をお知らせ
- **月末**: シフト表が確定し、変更不可になります

## 当日の出退勤

- 校舎到着後、すぐにタブレットで打刻
- 退勤時も忘れずに打刻
- 打刻忘れがあった場合は翌日までに運営に連絡

## 急な欠勤

体調不良などで急に出勤できない場合は、可能な限り**前日まで**に運営LINEへ連絡してください。`,
        },
      ];

      for (const a of articleSpecs) {
        const r = await tx.article.create({
          data: { ...a, images: "[]" },
        });
        created.articles.push(r.id);
      }

      // ---- BlogCategory (4 items) ----
      const categoryNames = [
        { name: "校舎からのお知らせ", sortOrder: 1 },
        { name: "学習Tips", sortOrder: 2 },
        { name: "進路情報", sortOrder: 3 },
        { name: "イベント報告", sortOrder: 4 },
      ];
      const categoryIdByName = new Map<string, string>();
      for (const c of categoryNames) {
        const r = await tx.blogCategory.create({ data: c });
        created.blogCategories.push(r.id);
        categoryIdByName.set(c.name, r.id);
      }

      // ---- BlogPost (8 items, 2 per category) ----
      const blogSpecs = [
        // 校舎からのお知らせ
        {
          title: "GW期間中の自習室開室について",
          category: "校舎からのお知らせ",
          audience: "both",
          publishedAt: daysFromToday(-50),
          body: `# GW期間中の自習室開室について

GW期間中の自習室開室時間をお知らせします。

| 日付 | 開室時間 |
|------|----------|
| 5/3 (土) | 13:00 - 21:00 |
| 5/4 (日) | **休室** |
| 5/5 (月・祝) | 13:00 - 21:00 |
| 5/6 (火) | 通常通り 16:00 - 21:00 |

休室日は校舎全体が閉まりますので、ご注意ください。受験生はぜひ自習室を活用してください！`,
        },
        {
          title: "5月の月例テスト日程",
          category: "校舎からのお知らせ",
          audience: "student",
          publishedAt: daysFromToday(-25),
          body: `# 5月の月例テスト日程

5月の月例テストの日程が確定しましたのでお知らせします。

## 日程

- **5/18 (日)** 9:00-13:00 高3 共通テスト形式
- **5/25 (日)** 14:00-17:00 高1・高2 学校進度準拠

## 持ち物

- 筆記用具
- 受験票（前日までに配布）
- 昼食（高3のみ）

申込みは前週の金曜日までにお願いします。`,
        },
        // 学習Tips
        {
          title: "英単語の覚え方 - 1日100単語を回す方法",
          category: "学習Tips",
          audience: "student",
          publishedAt: daysFromToday(-40),
          body: `# 英単語の覚え方 - 1日100単語を回す方法

「単語が覚えられない」と悩む生徒は多いです。今回は実践的な方法を紹介します。

## 基本の考え方

**完璧を目指さず、回数を稼ぐ**。1回で覚えようとせず、7回繰り返す前提で進めます。

## 具体的な手順

1. 朝: 100単語を1周（覚えなくてOK、目を通すだけ）
2. 昼: 同じ100単語をもう1周
3. 夜: 同じ100単語を3周目（このときは意味を思い出す）
4. 翌日: 同じ100単語を1周（復習）+ 新しい100単語を1周

このサイクルで1週間続けると、ターゲット1900なら2-3ヶ月で1周できます。

## ポイント

- 発音記号も声に出す
- 例文の中で覚える（裸の単語暗記より定着率3倍）
- 派生語は後回しでOK`,
        },
        {
          title: "数学の問題集の進め方",
          category: "学習Tips",
          audience: "student",
          publishedAt: daysFromToday(-15),
          body: `# 数学の問題集の進め方

青チャートやFocus Goldのような分厚い問題集、どう進めるのが正解？

## 結論：3周する前提で組む

1周目: 全問解こうとせず、例題のみ
2周目: 例題の解き直し + 練習問題
3周目: 苦手問題のみ集中

## 1周目のコツ

- 5分考えて分からなかったら答えを見る
- 答えを見たら必ず**自分の手で再現**してみる
- 解けなかった問題には印（△ or ×）

## 周回スパン

- 1周目: 2ヶ月
- 2周目: 1ヶ月
- 3周目: 2週間

合計3.5ヶ月で1冊が回せます。これを2回やれば、入試レベルで戦えます。`,
        },
        // 進路情報
        {
          title: "国公立大学 出願スケジュール (2026年度)",
          category: "進路情報",
          audience: "student",
          publishedAt: daysFromToday(-35),
          body: `# 国公立大学 出願スケジュール (2026年度)

高3生向けに、国公立大学の出願スケジュールをまとめました。

## 主要日程

| 時期 | 内容 |
|------|------|
| 1月中旬 | 共通テスト |
| 1月下旬 | 共通テスト自己採点 → 出願校決定 |
| 1月末〜2月初旬 | 国公立2次試験 出願期間 |
| 2月25日 | 国公立2次試験 前期日程 |
| 3月12日 | 国公立2次試験 後期日程 |

## 早めにやっておくこと

- 共通テスト リサーチの返却日を確認
- 志望校のボーダーラインを把握
- 二次試験の科目バランスを再確認

## 私大併願の戦略

国公立志望者でも、私大は3〜5校受けるのが標準です。学費・通学・滑り止めの3観点で選びましょう。`,
        },
        {
          title: "推薦入試と一般入試 - どちらを選ぶ？",
          category: "進路情報",
          audience: "student",
          publishedAt: daysFromToday(-12),
          body: `# 推薦入試と一般入試 - どちらを選ぶ？

近年、推薦入試で大学に進学する割合は5割を超えています。どちらを選ぶべきか整理します。

## 推薦入試が向いている人

- 評定平均が4.0以上
- 部活や課外活動で実績がある
- 志望校が明確で、一本に絞れる
- 文章作成・面接が得意

## 一般入試が向いている人

- 学力に自信がある（特に苦手科目がない）
- 複数校受けて比較したい
- 評定が3.5未満

## 併願戦略

推薦と一般、両方準備しておくのがベストです。推薦で決まれば早期に進路確定、ダメでも一般に切り替えられます。

## 個別相談

進路で迷ったら遠慮なく面談予約してください。`,
        },
        // イベント報告
        {
          title: "春の合格祝賀会を開催しました",
          category: "イベント報告",
          audience: "both",
          publishedAt: daysFromToday(-55),
          body: `# 春の合格祝賀会を開催しました

3月末に、卒塾生の合格祝賀会を開催しました。

## 参加者

- 卒塾生 23名
- 在塾生 15名（現高3が中心）
- 講師・運営スタッフ 12名

## 主な内容

- 卒塾生からの合格体験談
- 在塾生との座談会
- 講師からの送別メッセージ

## 印象に残った言葉

> 「最後まで諦めなかったことが結果につながった」
> （東大理一合格・A.K.さん）

> 「自習室の仲間がいたから頑張れた」
> （早稲田政経合格・M.S.さん）

来年も素晴らしい結果を出せるよう、皆で頑張りましょう！`,
        },
        {
          title: "新高3生 受験生決起集会レポート",
          category: "イベント報告",
          audience: "student",
          publishedAt: daysFromToday(-5),
          body: `# 新高3生 受験生決起集会レポート

4月最終週、新高3生向けの決起集会を実施しました。

## 当日のプログラム

1. 校舎長挨拶: 「受験は団体戦」
2. 主任講師による年間スケジュール説明
3. 卒塾生（現役大学生）パネルディスカッション
4. 個別目標設定ワーク

## 印象的だったワーク

「3月の自分に何と言いたいか」を全員が紙に書き、来年3月に開封する形式。受験への覚悟が芽生える瞬間でした。

## 今後の主要イベント

- 5月: 月例テスト
- 7月: 夏期講習説明会
- 8月: 共通テスト型 模試強化週間
- 10月: 出願校 最終決定面談

1年間、講師・運営一同、全力でサポートします。`,
        },
      ];

      for (const b of blogSpecs) {
        const categoryId = categoryIdByName.get(b.category);
        if (!categoryId) {
          throw new Error(`Category not found: ${b.category}`);
        }
        const r = await tx.blogPost.create({
          data: {
            title: b.title,
            body: b.body,
            audience: b.audience,
            categoryId,
            authorId: admin.id,
            images: "[]",
            publishedAt: b.publishedAt,
          },
        });
        created.blogPosts.push(r.id);
      }

      if (dryRun) throw ROLLBACK;
    }, { timeout: 60000 });
  } catch (e) {
    if (e === ROLLBACK) {
      console.log("=== DRY RUN COMPLETE (rolled back) ===");
      console.log(JSON.stringify({
        wouldCreate: {
          articles: created.articles.length,
          blogCategories: created.blogCategories.length,
          blogPosts: created.blogPosts.length,
          total: created.articles.length + created.blogCategories.length + created.blogPosts.length,
        },
      }, null, 2));
      return;
    }
    throw e;
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const batchPath = resolve(process.cwd(), `prisma/.test-batch-content-${ts}.json`);
  writeFileSync(batchPath, JSON.stringify({ createdAt: new Date().toISOString(), ids: created }, null, 2));
  console.log("=== COMMIT COMPLETE ===");
  console.log(`Batch file: ${batchPath}`);
  console.log(JSON.stringify({
    created: {
      articles: created.articles.length,
      blogCategories: created.blogCategories.length,
      blogPosts: created.blogPosts.length,
    },
  }, null, 2));
}

run()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
