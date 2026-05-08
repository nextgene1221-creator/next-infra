# データベースバックアップと復旧手順

## 概要

本システムには 2 系統のバックアップがある。

| 種類 | 形式 | 保存先 | スケジュール | 用途 |
|---|---|---|---|---|
| 手動バックアップ | JSON (Prisma `findMany`) | ブラウザダウンロード | 任意 | リリース直前など重要操作の前にスナップショット取得 |
| 自動バックアップ | `pg_dump` 圧縮 (`.sql.gz`) | Vercel Blob (`db-backups/`、非公開) | 毎日 03:00 JST | 障害時の復旧用、30 日保持 |

復旧の本命は SQL ダンプ。JSON は緊急避難用かつ限定的な用途と捉える。

---

## 1. 自動バックアップ（GitHub Actions + Vercel Blob）

### 構成

- ワークフロー: `.github/workflows/db-backup.yml`
- アップロードスクリプト: `.github/scripts/upload-backup.mjs`
- 削除スクリプト: `.github/scripts/cleanup-backups.mjs`
- Blob のキープレフィックス: `db-backups/`
- ファイル名: `backup-YYYYMMDD-HHMMSS.sql.gz`（ランダムサフィックス付き）
- アクセス: `private`（URL を知っていてもダウンロード不可）
- 保持期間: 30 日

### 必要な GitHub Secrets

リポジトリ設定 → Settings → Secrets and variables → Actions に登録する。

| 名前 | 内容 |
|---|---|
| `BACKUP_DATABASE_URL` | Neon の接続文字列。例: `postgresql://USER:PASS@HOST/DB?sslmode=require` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob の Read/Write スコープ付きトークン |

`BLOB_READ_WRITE_TOKEN` は Vercel ダッシュボード → Storage → 該当 Blob ストア → Settings から発行する。

### 手動実行

GitHub の Actions タブ → "Database Backup" → Run workflow。
（毎日 03:00 JST に自動起動。手動実行も同じワークフローを叩く）

### バックアップの確認

1. Vercel ダッシュボード → Storage → 該当 Blob ストア
2. `db-backups/` プレフィックスでフィルタ
3. 該当ファイルを選択し「Download」または signed URL を取得

CLI で確認する場合は `@vercel/blob` の `list` を呼ぶスクリプトを別途作成する（現状リポジトリには未配置）。

---

## 2. 復旧手順（SQL ダンプから）

### 2.1 ダンプを取得

Vercel ダッシュボードから対象ファイルをダウンロード。私的環境に保存する。

```sh
# 取得後、整合性確認
gunzip -t backup-YYYYMMDD-HHMMSS.sql.gz
```

### 2.2 復旧先 DB を準備

**本番に直接戻す前に、必ず別の DB（Neon の branch、ローカル PostgreSQL 等）に流して動作確認する。**

Neon ブランチで検証する例:

```sh
# Neon CLI を使うか、ダッシュボードで dev ブランチを作成
# 接続文字列を控える
export RESTORE_URL="postgresql://USER:PASS@BRANCH-HOST/DB?sslmode=require"
```

### 2.3 復旧コマンド

`pg_dump` は `--no-owner --no-acl --format=plain` で取得しているため、`psql` で流し込める。

```sh
gunzip -c backup-YYYYMMDD-HHMMSS.sql.gz | psql "$RESTORE_URL"
```

エラーで止まらないように `ON_ERROR_STOP=on` を付けたい場合:

```sh
gunzip -c backup-YYYYMMDD-HHMMSS.sql.gz | psql "$RESTORE_URL" -v ON_ERROR_STOP=on -f -
```

### 2.4 既存 DB に上書きする場合の注意

そのまま流すとテーブルが既に存在してエラーになる。本番上書きは以下のいずれか:

- **新規 DB に流して切り替え**: Neon の場合、別ブランチに復元してアプリの `DATABASE_URL` を切り替えるのが安全。
- **drop して流す**: 既存スキーマを drop してから流す。データは完全に置き換わる。

```sh
# 例: public スキーマを drop してから流す（極めて破壊的）
psql "$RESTORE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c backup-YYYYMMDD-HHMMSS.sql.gz | psql "$RESTORE_URL"
```

### 2.5 復旧後の確認

- Prisma マイグレーションの状態確認: `npx prisma migrate status`
- アプリ起動して主要画面（生徒管理、ゼミ管理、シフト管理）の表示確認
- 件数突合: 復旧前後で `SELECT COUNT(*) FROM "Student";` などをスポットチェック

---

## 3. 手動バックアップ（JSON）

### 取得

1. 管理者で `/backup` にアクセス
2. 「JSON をダウンロード」をクリック
3. `juku-backup-<ISO timestamp>.json` がダウンロードされる

### 中身

`/api/admin/backup/export` が Prisma の全モデルに `findMany({})` を発行し、以下の構造で返す:

```json
{
  "generatedAt": "2026-05-06T...",
  "schemaModels": ["Student", "Teacher", ...],
  "data": {
    "Student": [...],
    "Teacher": [...]
  }
}
```

### 用途と限界

- **用途**: リリース直前の差分把握、特定テーブルの状態スナップショット、開発環境への簡易ロード
- **限界**:
  - リレーションは ID 参照のみ（外部キー整合性は呼び出し側で担保）
  - 全件メモリ展開のためデータ量が増えると Vercel Functions のメモリ/タイムアウトに当たる可能性あり
  - 復旧用ではなく**スナップショット用**

JSON からの復元スクリプトは現状未整備。完全な復旧は SQL ダンプ経由で行う。

---

## 4. トラブルシュート

### バックアップが失敗した

- GitHub Actions タブで該当 run のログを確認
- `BACKUP_DATABASE_URL` が未設定: secret を登録
- `pg_dump: server version mismatch`: ワークフローは PostgreSQL 17 client を入れている。Neon が 18 以上に上がった場合は `db-backup.yml` の client バージョンを上げる
- `BLOB_READ_WRITE_TOKEN` 失効: Vercel ダッシュボードで再発行 → secret 更新

### 30 日より古いバックアップを残したい

- `cleanup-backups.mjs` の `RETENTION_DAYS` を変更
- または、特定ファイルを別 Blob プレフィックスにコピー（cleanup は `db-backups/` プレフィックスのみ対象）

### 緊急復旧を即時に行いたい

- 直近のバックアップから `pg_dump` 復元（上記 2 章）
- それで足りない範囲（最終バックアップ以降の更新）は失われる。本システムは現状 PITR を構成していないため、より厳しい RPO が必要なら Neon の Point-in-Time Restore を有効化する別タスクとして起票すること。
