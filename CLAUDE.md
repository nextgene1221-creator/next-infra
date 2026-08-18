# next infra / 塾基幹システム

## ⚠️ 最初に必ず読むもの

**セッション開始時・`/clear` 後・別スレッド移行時は、作業を始める前に必ず [`docs/playbook.md`](docs/playbook.md) を読むこと。**

これはこのプロジェクトの単一の運用書で、進行手順・評価委員会・判断境界・ローカル検証手順・教訓が全て入っている。読み込み順とその後の行動は playbook §7「セッション再開手順」に従う:

1. `docs/playbook.md` — 進行手順とタスクリスト
2. `docs/current-task.md` — 直近の作業状態と **このセッションの特例ルール（push 可否など）**
3. `docs/questions-for-owner.md` — オーナー判断の未回答・回答済みを取り込む
4. `docs/todo.md` の「進行中」節 — オーナー指示の現在地

playbook は生きた文書。教訓・ルール変更が出たら §9 教訓ログ または該当節に追記すること。

---

## ファイルの役割（詳細は playbook §0・§6）

| ファイル | 役割 |
|---|---|
| `docs/playbook.md` | 進行手順・評価委員会・中期ロードマップ・教訓（**運用の正**） |
| `docs/current-task.md` | いま手を動かしていること / セッション特例ルール |
| `docs/questions-for-owner.md` | オーナー判断窓口（Q1〜。デフォルト判断を併記して進める） |
| `docs/todo.md` | オーナーからの修正指示リスト（進行中 / 完了、コミットハッシュ付き） |
| `docs/backlog.md` | バックアップ基盤の積み残し |
| `spec.md` | 仕様（**正**）。画面別詳細は `juku-system/docs/01〜08_*.md` |
| `CHANGELOG_AI.md` | Stop hook による自動ログ。**手動編集不可** |

同じ情報を 2 箇所に持たないこと。

---

## 実装時の必須ルール

- **着手前に不明点を確認する**。曖昧なまま実装しない（`docs/todo.md` 冒頭ルール）。
- **push 前に必ずローカル検証を通す**（playbook §8）。`juku-system/` で `npx tsc --noEmit` → `npm run lint` → `npm run build` の 3 つが緑になって初めて「実装完了」と書いてよい。未検証なら「実装済・未検証」と正確に書く。
- **仕様変更は `spec.md` に反映する**（`juku-system/CLAUDE.md` の同期ルールに従う）。
- **本番 Neon へのマイグレーション適用・本番 Vercel の設定変更・外部費用の発生はオーナー判断送り**（playbook §3）。勝手に実行しない。
- 生徒・保護者は**未成年を含む**。個人情報の扱い、外部 API（AI 含む）へのデータ送信は playbook §2 のセキュリティ視点を必ず通す。

---

## プロジェクト構成

- ルート = ドキュメントと運用（`docs/`, `spec.md`, `.github/workflows/`, `.claude/hooks/`）
- `juku-system/` = Next.js アプリ本体（Prisma + Neon / 開発は `prisma/dev.db`、NextAuth、Tailwind）
