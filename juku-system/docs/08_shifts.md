# シフト管理 詳細仕様書

## 基本情報

| ページ | パス | ソースファイル | レンダリング | アクセス可能ロール |
|--------|------|---------------|-------------|-------------------|
| シフトカレンダー | `/shifts` | `src/app/(authenticated)/shifts/page.tsx` | サーバーサイド | admin, teacher |
| シフト登録 | `/shifts/edit` | `src/app/(authenticated)/shifts/edit/page.tsx` | クライアントサイド | admin |

### API エンドポイント

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| POST | `/api/shifts` | シフト新規登録 | admin のみ |
| GET | `/api/teachers-list` | 講師選択リスト取得 | admin のみ |

---

## 1. シフトカレンダーページ (`/shifts`)

### 機能説明

#### 月間表示
- URLクエリパラメータ `month`（形式: `YYYY-MM`）で表示月を指定
- パラメータなしの場合は現在月を表示
- 指定月の1日〜末日のシフトを取得

#### 月ナビゲーション
- 「前月」「翌月」リンクで月を切り替え
- リンクは `?month=YYYY-MM` 形式のクエリパラメータを付与

#### ロール別データスコープ
- **admin**: 全講師のシフトを表示
- **teacher**: 自身のシフトのみ表示

#### データのグルーピング
- シフトを日付ごとにグループ化して表示
- 各日付グループ内は開始時刻昇順

#### シフト登録ボタン
- admin ロールの場合のみ「シフト登録」ボタンを表示
- 遷移先: `/shifts/edit`

### デザイン仕様

#### ページタイトル
- 「シフト管理」：`text-2xl font-bold text-gray-900`

#### 月ナビゲーションバー
- 白背景カード（`bg-white rounded-lg shadow p-4 mb-6`）
- `flex items-center justify-between` で左右に前月/翌月、中央に年月表示
- 前月/翌月: `text-sm text-blue-600 hover:underline`
- 年月: `text-lg font-semibold`（例:「2026年4月」）

#### 日付グループカード
- カード間: `space-y-4`
- 各カード: `bg-white rounded-lg shadow overflow-hidden`
- 日付ヘッダー: `bg-gray-50 px-6 py-3 border-b`、日付テキスト `font-medium text-gray-900`（ja-JP形式）
- シフト行: `divide-y divide-gray-200`

#### シフト行レイアウト
- `px-6 py-3 flex items-center justify-between`
- 左側（`flex items-center gap-4`）:
  - 時間帯: `text-sm font-medium text-gray-900`（例:「14:00 - 20:00」）
  - 講師名: `text-sm text-gray-600`
- 右側（`flex items-center gap-3`）:
  - ステータスバッジ
  - 備考（存在する場合のみ）: `text-xs text-gray-400`

#### ステータスバッジの色分け

| ステータス | 表示名 | バッジ色 |
|-----------|--------|---------|
| scheduled | 予定 | 青（`bg-blue-100 text-blue-800`） |
| confirmed | 確定 | 緑（`bg-green-100 text-green-800`） |
| cancelled | キャンセル | 赤（`bg-red-100 text-red-800`） |

バッジスタイル: `px-2 py-1 rounded-full text-xs font-medium`

#### 0件時表示
- 白背景カード内に「この月のシフトはありません」を中央表示（`p-8 text-center text-gray-500`）

---

## 2. シフト登録ページ (`/shifts/edit`)

### 機能説明

#### データ取得
- ページ読み込み時に GET `/api/teachers-list` で稼働中講師リストを非同期取得

#### 送信処理
- POST `/api/shifts` でシフトを新規作成
- 成功時 → シフトカレンダーページ（`/shifts`）へ遷移

### フォームフィールド一覧

| フィールド | 型 | 必須 | 初期値 | 選択肢 |
|-----------|-----|------|--------|--------|
| 講師 | select | 必須 | 未選択 | APIから取得した講師リスト |
| 日付 | date | 必須 | 今日の日付 | |
| 開始時刻 | time | 必須 | 09:00 | |
| 終了時刻 | time | 必須 | 17:00 | |
| ステータス | select | 必須 | scheduled | 予定(scheduled) / 確定(confirmed) / キャンセル(cancelled) |
| 備考 | textarea（2行） | 任意 | 空 | |

### デザイン仕様

#### レイアウト
- ページタイトル「シフト登録」：`text-2xl font-bold text-gray-900 mb-6`
- 最大幅 `max-w-2xl` の白背景カード（`rounded-lg shadow p-6 space-y-4`）
- フォーム項目: 2カラムグリッド（`md:grid-cols-2 gap-4`）

#### 入力フィールド
- ラベル: `text-sm font-medium text-gray-700`
- 入力欄: `border-gray-300 rounded-md px-3 py-2 text-sm`、上余白 `mt-1`
- 時間入力: HTML5 `type="time"` を使用

#### ボタン
- 「登録」ボタン: 青色背景（`bg-blue-600`）、保存中は「保存中...」＋非活性
- 「キャンセル」ボタン: グレー背景（`bg-gray-200`）、ブラウザ戻る
