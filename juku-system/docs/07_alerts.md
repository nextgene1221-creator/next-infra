# アラート管理 詳細仕様書

## 基本情報

| 項目 | 内容 |
|------|------|
| パス | `/alerts` |
| ソースファイル（ページ） | `src/app/(authenticated)/alerts/page.tsx` |
| ソースファイル（リスト） | `src/app/(authenticated)/alerts/AlertList.tsx` |
| レンダリング | ハイブリッド（SSR でデータ取得 → クライアントで既読操作） |
| アクセス可能ロール | admin, teacher, student |

### API エンドポイント

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| PUT | `/api/alerts/:id` | 個別アラートを既読にする | 認証済み（自身のアラートのみ） |
| PUT | `/api/alerts/mark-all-read` | 全未読アラートを一括既読にする | 認証済み（自身のアラートのみ） |

---

## 機能説明

### データ取得
- サーバーサイドでログインユーザーの全アラートを取得（最大100件、作成日時降順）
- 取得データをクライアントコンポーネント `AlertList` に初期データとして渡す

### 既読管理
- **個別既読**: 各未読アラートの「既読にする」ボタンを押下 → PUT `/api/alerts/:id`
  - APIはログインユーザーのアラートのみ更新可能（`userId` チェック）
  - クライアント側で即時UI反映（オプティミスティック更新）
- **一括既読**: 「全て既読にする」ボタンを押下 → PUT `/api/alerts/mark-all-read`
  - ログインユーザーの全未読アラートを一括で `is_read = true` に更新
  - クライアント側で即時UI反映

### 未読件数表示
- 未読アラートが1件以上ある場合、リスト上部に「未読: {n}件」と「全て既読にする」ボタンを表示
- 全て既読の場合、この行は非表示

### アラートの種別

| 種別値 | 表示ラベル | 発生契機 |
|--------|----------|---------|
| task_overdue | 期限超過 | タスクの期限超過時 |
| shift_reminder | シフト | シフト予定のリマインダー |
| progress_warning | 進捗警告 | 理解度が低い進捗記録時 |
| general | 一般 | その他の一般的な通知 |

---

## デザイン仕様

### ページタイトル
- 「アラート一覧」：`text-2xl font-bold text-gray-900`、下余白 `mb-6`

### 未読カウント行
- `flex justify-between items-center mb-4`
- 左: 「未読: {n}件」（`text-sm text-gray-600`）
- 右: 「全て既読にする」ボタン（`text-sm text-blue-600 hover:underline`）

### アラートカード
- カード間: `space-y-3`
- 各カード: `bg-white rounded-lg shadow p-4`
- **左ボーダー**: `border-l-4`
  - 未読: `border-blue-500`（青色、強調）
  - 既読: `border-gray-200`（グレー）+ `opacity-60`（半透明）

#### カード内レイアウト
- `flex justify-between items-start`
- 左側:
  - 種別バッジ + タイトル（`flex items-center gap-2 mb-1`）
  - 本文（`text-sm text-gray-600`）
  - 日時（`text-xs text-gray-400 mt-1`、ja-JP `toLocaleString` 形式）
- 右側:
  - 未読時のみ「既読にする」ボタン（`text-xs text-blue-600 hover:underline whitespace-nowrap ml-4`）

### 種別バッジの色分け

| 種別 | 表示名 | バッジ色 |
|------|--------|---------|
| task_overdue | 期限超過 | 赤（`bg-red-100 text-red-800`） |
| shift_reminder | シフト | 青（`bg-blue-100 text-blue-800`） |
| progress_warning | 進捗警告 | 黄（`bg-yellow-100 text-yellow-800`） |
| general | 一般 | グレー（`bg-gray-100 text-gray-800`） |

バッジスタイル: `px-2 py-0.5 rounded-full text-xs font-medium`

### 0件時表示
- 「アラートはありません」を中央表示（`text-center text-gray-500 py-8`）
