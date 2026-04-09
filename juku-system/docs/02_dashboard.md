# ダッシュボード 詳細仕様書

## 基本情報

| 項目 | 内容 |
|------|------|
| パス | `/dashboard` |
| ソースファイル | `src/app/(authenticated)/dashboard/page.tsx` |
| レンダリング | サーバーサイド（Server Component） |
| 認証 | 必須（全ロール） |
| アクセス可能ロール | admin, teacher, student |

---

## 機能説明

### 概要
ログイン後のホーム画面。ユーザーのロールに応じて異なる統計カードと未読アラートを表示する。各統計カードはクリックで対応する管理ページへ遷移可能。

### ロール別統計カード

#### 管理者（admin）
表示カード数: 4枚

| カード | 表示値 | 遷移先 | データソース |
|--------|--------|--------|-------------|
| 在籍生徒数 | `students` テーブルの `status = "active"` 件数 | `/students` | `prisma.student.count` |
| 講師数 | `teachers` テーブルの `status = "active"` 件数 | `/teachers` | `prisma.teacher.count` |
| 未完了タスク | `tasks` テーブルの `status = "pending" or "in_progress"` 件数 | `/tasks` | `prisma.task.count` |
| 今後のシフト | `shifts` テーブルの `date >= 現在日` かつ `status = "scheduled"` 件数 | `/shifts` | `prisma.shift.count` |

#### 講師（teacher）
表示カード数: 3枚（自身の担当分のみ）

| カード | 表示値 | 遷移先 |
|--------|--------|--------|
| 担当生徒数 | `student_teacher` テーブルの自身に紐づく件数 | `/students` |
| 未完了タスク | 自身が作成したタスクのうち `status = "pending" or "in_progress"` 件数 | `/tasks` |
| 今後のシフト | 自身のシフトのうち `date >= 現在日` かつ `status = "scheduled"` 件数 | `/shifts` |

#### 生徒（student）
表示カード数: 3枚（自身のデータのみ）

| カード | 表示値 | 遷移先 |
|--------|--------|--------|
| 未完了タスク | 自身のタスクのうち `status = "pending" or "in_progress"` 件数 | `/tasks` |
| 完了タスク | 自身のタスクのうち `status = "completed"` 件数 | `/tasks` |
| 進捗記録数 | 自身の `progress_records` 件数 | `/progress` |

### 未読アラートセクション
- ログインユーザーに紐づく未読アラート（`is_read = false`）を最新5件取得
- 各アラートにはタイトル、本文、作成日時を表示
- 未読アラートが0件の場合「未読のアラートはありません」メッセージを表示
- 未読アラートが1件以上の場合「全てのアラートを見る」リンク（→ `/alerts`）を表示

---

## デザイン仕様

### 共通レイアウト（認証後ページ共通）
- 左側にサイドバー（幅 `w-64` = 16rem / 256px）、右側にメインコンテンツ
- **サイドバー**
  - 背景色: `bg-gray-800`（ダークグレー）、テキスト: 白
  - ヘッダー: システム名「塾管理システム」+ ユーザー名・ロール表示
  - ナビゲーション: ロールに応じたメニュー項目をフィルタ表示
  - 現在ページ: `bg-gray-900` で強調、その他は `text-gray-300` + ホバー `bg-gray-700`
  - フッター: 「ログアウト」ボタン
- **メインコンテンツ**: 背景 `bg-gray-50`、パディング `p-6`

### ページタイトル
- 「ダッシュボード」：`text-2xl`、太字、色 `text-gray-900`、下余白 `mb-6`

### 統計カード
- グリッドレイアウト: 1列（モバイル）→ 2列（`md`）→ 4列（`lg`）
- カード間隔: `gap-4`
- 各カード:
  - 白背景（`bg-white`）、パディング `p-6`、角丸 `rounded-lg`、シャドウ `shadow`
  - ホバー時: `shadow-md` に変化（`transition-shadow`）
  - ラベル: `text-sm text-gray-500`
  - 数値: `text-3xl font-bold text-gray-900`、上余白 `mt-1`
  - カード全体がリンク（`<Link>`）として機能

### 未読アラートセクション
- 白背景カード（`bg-white rounded-lg shadow p-6`）
- セクションタイトル「未読アラート」: `text-lg font-semibold text-gray-900`、下余白 `mb-4`
- 各アラート:
  - 黄色背景（`bg-yellow-50`）、黄色枠線（`border-yellow-200`）、角丸 `rounded-md`
  - パディング `p-3`、アラート間 `space-y-3`
  - タイトル: `font-medium text-gray-900`
  - 本文: `text-sm text-gray-600`
  - 日時: `text-xs text-gray-400`、上余白 `mt-1`
- 「全てのアラートを見る」リンク: `text-sm text-blue-600`、ホバーで下線

---

## サイドバー ナビゲーション項目

| メニュー | パス | 表示ロール |
|---------|------|-----------|
| ダッシュボード | `/dashboard` | admin, teacher, student |
| 生徒管理 | `/students` | admin, teacher |
| 講師管理 | `/teachers` | admin |
| 学習進捗 | `/progress` | admin, teacher, student |
| タスク管理 | `/tasks` | admin, teacher, student |
| アラート | `/alerts` | admin, teacher, student |
| シフト管理 | `/shifts` | admin, teacher |
