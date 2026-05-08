# 後で対応するもの（バックログ）

バックアップ周りの構築で残った未完了タスク。優先度順。

---

## ユーザー対応必要

### B-1. GitHub Secrets を登録する

GitHub Actions の自動バックアップを動かすために必須。手順は本ファイル末尾の **付録 A** を参照。

- [ ] `BACKUP_DATABASE_URL` を登録（Neon の Direct connection 文字列）
- [ ] `BLOB_READ_WRITE_TOKEN` を登録（Vercel Blob の Read & Write スコープ付きトークン）

### B-2. 自動バックアップの動作確認

Secrets 登録後、初回は手動実行で確認しておく。

- [ ] GitHub Actions タブから "Database Backup" を `workflow_dispatch` で 1 回実行
- [ ] 各ステップ（Dump database / Upload to Vercel Blob / Cleanup）が成功することを確認
- [ ] Vercel ダッシュボード → Storage → 該当 Blob ストアで `db-backups/backup-*.sql.gz` の存在を確認

### B-3.（任意）バックアップ専用 DB ロールを作る

現状は本番アプリと同じ接続文字列を `BACKUP_DATABASE_URL` に入れる想定。漏洩時の影響範囲を絞りたい場合、Neon ダッシュボードで `backup_reader` ロールを作成し `pg_read_all_data` 相当を付与してその接続文字列に置き換える。

---

## Claude が対応予定

### C-1. JSON エクスポートのストリーミング化

`juku-system/src/app/api/admin/backup/export/route.ts` を `ReadableStream` で書き換える。現状は全テーブルの `findMany` 結果をメモリに展開してから `JSON.stringify` するので、Vercel Functions のメモリ/タイムアウトに当たるリスクがある。テーブルごとに逐次 enqueue する方針。

### C-2.（任意）JSON エクスポートのカーソルページング化

C-1 のあとも、1 テーブル内の全行を一度に `findMany` する設計は残る。行数の多いテーブル（例: `StudentPrint`, `AttendanceRecord` 等）でメモリ圧迫の可能性。Prisma のカーソルページネーションで 1,000 行ずつ取得する形に再設計するかは要検討（複雑さとのトレードオフ）。

### C-3.（任意）バックアップ一覧 CLI / 管理画面

現状、Blob に上がったバックアップの一覧は Vercel ダッシュボードでしか確認できない。`/backup` 画面に「直近のバックアップ一覧」セクションを追加できると便利。`@vercel/blob` の `list` を呼ぶ admin 専用 API を経由する形。

---

## 付録 A. GitHub Secrets 登録手順

### 1. 値を 2 つ用意する

#### `BACKUP_DATABASE_URL`（Neon の接続文字列）

1. https://console.neon.tech にログイン
2. 対象プロジェクトを開く → **Dashboard** または **Connection Details**
3. **Direct connection** をコピー（Pooled は `pg_dump` で失敗しやすい）
4. 形式: `postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/DBNAME?sslmode=require`

#### `BLOB_READ_WRITE_TOKEN`（Vercel Blob のトークン）

1. https://vercel.com/dashboard にログイン
2. 該当チーム → **Storage** → 既存の Blob ストアを開く（無ければ「Create Database」→「Blob」）
3. **Settings** タブ → **Tokens** → **Create Token**
4. スコープを **Read & Write** にして発行
5. 表示された `vercel_blob_rw_xxxxx...` をすぐコピー（後から全体は再表示できない）

### 2. GitHub Secrets に登録する

1. https://github.com/nextgene1221-creator/next-infra
2. **Settings** タブ → 左サイドバーの **Secrets and variables** → **Actions**
3. **New repository secret** を 2 回押し、それぞれ次の名前で登録
   - `BACKUP_DATABASE_URL`
   - `BLOB_READ_WRITE_TOKEN`

### 3. 動作確認

1. https://github.com/nextgene1221-creator/next-infra/actions
2. **Database Backup** → **Run workflow** → ブランチ `main` を選んで実行
3. ジョブが緑になり、Vercel Blob の `db-backups/` 配下にファイルが現れればOK

### 4. よくある詰まりどころ

| 症状 | 対処 |
|---|---|
| `BACKUP_DATABASE_URL secret is not set` | 名前のタイポ確認 |
| `pg_dump: error: connection ... SSL` | URL 末尾に `?sslmode=require` |
| `pg_dump: error: server version mismatch` | Neon が PG18+ に上がった場合、`.github/workflows/db-backup.yml` の `postgresql-client-17` を上げる |
| `permission denied for table xxx` | 専用ロール使用時、`GRANT pg_read_all_data TO <role>;` |
| Vercel Blob で 401/403 | トークンの権限が Read のみ。Read & Write で再発行 |

### 5.（任意）`gh` CLI 派の場合

```sh
winget install GitHub.cli
gh auth login

gh secret set BACKUP_DATABASE_URL --repo nextgene1221-creator/next-infra
gh secret set BLOB_READ_WRITE_TOKEN --repo nextgene1221-creator/next-infra

gh secret list --repo nextgene1221-creator/next-infra
gh workflow run "Database Backup" --repo nextgene1221-creator/next-infra
```
