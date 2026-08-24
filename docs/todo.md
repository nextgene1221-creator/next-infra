# 修正・機能追加 TODO

このファイルは修正指示を上から順に記載するためのリストです。
完了したものは完了に移動させ、各項の番号を振りなおすように。
各項着手前に不明点などを確認すること。また各項完了後に中間報告をしpushすること

---

## 進行中

A. 面談まわり改修・LINE連携・週次面談シート — **実装・push 完了。残るは実機確認のみ**

- 実装本体は「**完了 31**」へ移動（commit `e6e3ccc` / `5f05be2`）。2026-08-18 に git 履歴と突合し、両コミットとも `origin/main` に含まれる＝**push 済み**であることを確認した（旧表記「未コミット／push待ち」は誤り）。
- 項目定義は `spec.md` §5.9 が正（実装と差分なしを確認済み）。
- **残作業（実利用での確認のみ）**:
  - [ ] フェーズ1・2: ブラウザ実機での UI 確認（面談予定モーダルの4タブ / 週次面談シートの生成・記入・提出・講師側「週次シート」タブ）
  - [ ] フェーズ3: 実アカウントで LINE 友だち追加＋6桁コード連携 → 朝(9:00 JST)・夜(22:00 JST) 通知の実送信確認

---

B. 2026-08-18 受領の修正指示 10 件（B-1〜B-10）— **全項目 完了・push 済み** (commit `7eae25a`)

- **状態: 全 10 項目 完了**（2026-08-18, commit `7eae25a`）。確定事項は `docs/understanding-2026-08-18.md` 末尾の「✅ 確定事項」表が正。
- **本番 Neon に migration 4 本適用済み**（2026-08-18・`prisma migrate deploy`・ADD COLUMN / CREATE TABLE のみで非破壊）。
- **残**: ブラウザ実機確認（模試マスタは管理者が `/mock-exams` から登録する運用に変更済み。開発側での流し込みは行わない）
- 🖥 **ローカルテスト環境（URL・ログイン情報）は `docs/understanding-2026-08-18.md` の冒頭**を参照。⚠️ 現状はローカルの接続先が本番 DB のままで、かつ 4 マイグレーションが未適用のため**そのままでは動きません**（同ファイル冒頭に対処案）。
- 理解と対応方針は **`docs/understanding-2026-08-18.md`** に記載。オーナー確認が取れてから実装に入る（playbook §1「修正指示の受領フロー」）。
- 実施順（推奨）: B-1・B-2 → B-3 → B-4 → B-8 → B-10 → B-5 → B-7 → B-6 → B-9

| # | 指示 | スキーマ変更 | 状態 |
|---|---|---|---|
| B-1 | 出願思考を生徒項目に追加（国公立のみ〜私立のみ の5択） | 有 | ✅ **完了** (commit `7eae25a`) |
| B-2 | 志望校立地を生徒項目に追加（都会のみ〜沖縄のみ の6択） | 有 | ✅ **完了** (commit `7eae25a`) |
| B-3 | 出願戦略AIのプロンプト変更（国公立=前期/中期/後期、私立は別枠、挑戦/実力相応/安全を国公立・私立で別、①の「伸ばしたい科目」削除） | 無 | ✅ **完了** (commit `7eae25a`) |
| B-4 | ゼミ管理: 誤完了したプリントを取り消せるように | 無 | ✅ **完了** (commit `7eae25a`) |
| B-5 | 講師・管理者ダッシュボード／ゼミ管理に当日プリント（No・必要枚数）＋完了登録 | 無 | ✅ **完了** (commit `7eae25a`) |
| B-6 | 教材マスタに参考書ルートフォーマット機能（＝テンプレート方式で確定） | 有（新テーブル） | ✅ **完了** (commit `7eae25a`) |
| B-7 | 模試マスタ追加（表記ゆれによる集計ミス防止） | 有（新テーブル） | ✅ **完了** (commit `7eae25a`) |
| B-8 | 生徒一覧に面談日順ソートを追加 | 無 | ✅ **完了** (commit `7eae25a`) |
| B-9 | 給与計算機能（講師・管理者に時給、出退勤から月次給与明細） | 有 | ✅ **完了** (commit `7eae25a`) |
| B-10 | 発行するQR等に外部ブラウザ用URLパラメータを追加＋ログイン後復帰 | 無 | ✅ **完了** (commit `7eae25a`) |

### B-1・B-2 実装記録 (2026-08-18, commit `7eae25a`)

- スキーマ: `students` に `application_policy` / `location_preference` を追加。マイグレーション `20260818000000_add_student_application_preferences`（ADD COLUMN のみ・既存非破壊）。**開発 DB まで。本番 Neon 未適用**（playbook §3 によりオーナー判断送り）
- 新規 `src/lib/studentPreferences.ts`: 選択肢・ラベル・正規化関数（許可リスト外は空文字に倒す）・AI 用の「都会」定義注記
- 入力: `students/[id]/edit`・`signup/student` にプルダウン追加（未設定可・必須にしない）
- 表示: `students/[id]`・`account/profile` に表示（未設定/未知の値は「未設定」）
- API: `api/students`（POST）/ `api/students/[id]`（PUT）/ `api/signup/student` の 3 本で受け取り・正規化
- AI: `api/admin/ai-test` 系 4 ルートのプロフィールに「出願思考」「志望校立地」を日本語ラベルで追加
- 仕様反映: `spec.md` §4.2 / §5.3 に【実装追記 2026-08-18】として記載
- 検証: `tsc --noEmit` ✅ / `next build` ✅ / lint は**変更分エラー 0**（後述の既存エラー 14 件は別件）
- 未実施: ブラウザ実機での UI 確認

### B-3 実装記録 (2026-08-18, commit `7eae25a`)

- **出力スキーマを組み替え** (`api/admin/ai-test/strategy/route.ts`): 旧 `plan[]`（tier=本命/併願/滑り止め）を廃止 →
  - `publicPlan`: `前期` / `中期` / `後期` を**必須キー**で持つ（該当なしは空配列＝無理に埋めない）
  - `privatePlan`: 私立を**別枠**の独立した配列で
  - 各校の `tier` は `挑戦` / `実力相応` / `安全`。**国公立・私立でそれぞれ独立に判定**
  - 共通の `planItemSchema` / `planArray()` を `JSONSchema7` 型注釈付きで切り出し（`as const` だと readonly になり `jsonSchema` に渡せないため型注釈方式）
- **プロンプトに組み立てルールを明記**: 国公立を基本線 / 中期は該当なし可 / 私立は別枠 / tier は枠ごと独立 / B-1・B-2 の出願思考・志望校立地を反映 / 「都会」＝三大都市圏と定義（`URBAN_DEFINITION_NOTE`）
- **会話継続** (`strategy/consult/route.ts`): システムプロンプトを同じ枠組みに更新（旧「本命/併願/滑り止め」表記を排除）
- **①の「伸ばしたい科目」を削除** (`api/admin/ai-test/route.ts`): 型・`required`・properties の3箇所から `weakSubjects` を除去
- **UI** (`AiTestClient.tsx`): 出願プランを「国公立（前期・中期・後期）」「私立（別枠）」の2セクションに分割。日程ごとに見出し＋空なら「該当なし」。`PlanCard` コンポーネントに共通化。`TIER_STYLE` を新3値に（①の positioning と配色統一）。`strategyToText()` も新構造に。①の「伸ばしたい科目」表示セクションと会話テキストも削除
- 仕様反映: `spec.md` §5.13 / §5.15 に【実装追記 2026-08-18】
- 検証: `tsc --noEmit` ✅ / 変更ファイルの `eslint` ✅ エラー0 / `next build` ✅（88ページ生成）
- 未実施: **実 AI 呼び出しでの動作確認**（管理者ログイン＋AI Gateway トークンが必要）、ブラウザ実機 UI 確認

### B-4 実装記録 (2026-08-18, commit `7eae25a`)

- UI (`SeminarManager.tsx`): 完了済みセルを**講師・管理者のみ**クリック可に。モーダルに「完了を取り消す」ボタン（確認ダイアログ付き）を追加し、完了状態でボタン群を出し分け（完了中は「完了にする」「予定日を保存」を隠し、予定日入力も無効化）。完了日を明示表示
- **予定日は保持**したまま完了フラグのみ外す（B-4 (b)）
- API (`api/student-prints/route.ts` PUT): サーバー側の権限チェックを追加
  - `completedDate: null`（取り消し）を生徒が送ったら 403
  - **併せて既存の穴を塞いだ**: 生徒が他生徒のプリントの完了状態を操作できてしまっていた（所有者チェックが予定日変更にしか無かった）
- 仕様反映: `spec.md` に **§5.16 ゼミ管理（プリント運用）を新設**（従来ゼミ管理の独立した節が無かったため）
- 検証: `tsc --noEmit` ✅ / 変更ファイルの `eslint` ✅ エラー0 / `next build` ✅
- 未実施: ブラウザ実機 UI 確認

### B-8・B-10 実装記録 (2026-08-18, commit `7eae25a`)

**B-8 生徒一覧の面談日順ソート**

- `lib/nextMeeting.ts` に `getNextMeetingMap(studentIds)` を新設。**1 件ずつ引くと N+1 になるため 2 クエリ（面談タスク／面談記録）にまとめた**
- `/students` にソート「面談日順」を追加。近い順（昇順）・予定なしは末尾・同日は名前順
- 一覧に「次回面談」列を追加（予定なしは `-`）

**B-10 QR の外部ブラウザ誘導＋ログイン後復帰**

- 新規 `src/lib/externalBrowser.ts`: `buildQrUrl()` で URL 生成を集約（`openExternalBrowser=1` を必ず付与）＋ `safeCallbackUrl()`
- `CheckInQR.tsx` をヘルパー経由に変更
- `study-room/check-in/page.tsx`: `requireAuth()`（/login へ固定）をやめ `getSession()` 判定 → `/login?callbackUrl=<元URL>` へ誘導
- `login/page.tsx`: `callbackUrl` を読んで遷移先に使う（従来は常に `/dashboard`）。`useSearchParams` のため `Suspense` でラップ
- **オープンリダイレクト対策**: `safeCallbackUrl()` で `/` 始まりの相対パスのみ許可
- ⚠️ **限界を明記**: `openExternalBrowser=1` は LINE 内蔵ブラウザ専用。汎用 QR リーダーには効かないため、2 の復帰導線が実質的な解決策
- 仕様反映: `spec.md` §5.3（B-8）/ §5.11（B-10）
- 検証: `tsc --noEmit` ✅ / `next build` ✅ / lint は変更分の新規エラー 0（`CheckInQR.tsx` の `set-state-in-effect` は既存エラーで行番号がずれただけ）
- 未実施: ブラウザ実機確認（特に QR 読み取り → ログイン → 復帰の実機動線）

### B-5 実装記録 (2026-08-18, commit `7eae25a`)

- 新規 `src/lib/todayPrints.ts` `getTodayPrintRows()`: 単元 × No. で集計し、**対象生徒を `printId` 付きで個別に保持**（完了登録に id が要るため。従来は生徒名しか持っていなかった）
- 新規 `src/components/TodayPrintsPanel.tsx`（クライアント）: 行クリックで生徒を展開 → **生徒ごとに「完了」/「取り消し」**。楽観更新＋`router.refresh()`
- ダッシュボード: 従来の読み取り専用テーブル（未完了のみ）をこのパネルに置き換え
- ゼミ管理 `/seminar`: 既存マトリクスの**上**に「本日のプリント」として設置（B-5 (c)）
- **完了済みも表示**（打ち消し線・薄字）。必要枚数は完了済みを含む総数、別途「未実施」列を追加（B-5 (b)）
- **一括完了は付けない**: 「完了」＝生徒がプリントを実施し終えたことで、実施状況は生徒ごとに異なるため（オーナー指摘 2026-08-18）
- 仕様反映: `spec.md` §5.16
- 検証: `tsc --noEmit` ✅ / 変更ファイルの `eslint` ✅ エラー0 / `next build` ✅
- 未実施: ブラウザ実機 UI 確認

### B-7 実装記録 (2026-08-18, commit `7eae25a`)

- スキーマ: `MockExam`（模試マスタ）を新設＋`MockExamResult.mockExamId`（NULL 許容 FK）。マイグレーション `20260818010000_add_mock_exam_master`。**`examName` は残す**（自由入力の受け皿＋既存データ保持）
- ⚠️ **API パスの衝突を回避**: 模試「結果」が既に `/api/mock-exams` を占有していたため、マスタ側は **`/api/mock-exam-masters`**。ページ `/mock-exams` は空いていたのでそのまま使用
- 画面 `/mock-exams`（新設）: 一覧・追加・有効/無効・削除。**更新は admin のみ**、teacher は閲覧のみ。**使用件数**も表示
- 削除ガード: 模試結果から参照されているマスタは削除不可（409）→ 無効化を促す（教材マスタと同じ方針）
- 入力 UI (`MockExamsPanel.tsx`): 模試名をテキスト入力 → **プルダウン**に変更。「その他（手入力）」で自由入力も可（**表記ゆれ警告文つき**）
- サイドバーに「模試マスタ」を追加
- ~~移行スクリプト `prisma/seed-mock-exams.ts`~~ → **廃止（下記 追加対応を参照）**

#### B-7 追加対応（2026-08-18・オーナー指示「マスタの選択肢は開発側でいじるのではなく管理者アカウントが登録する導線として」）

- **`prisma/seed-mock-exams.ts` を削除**。開発側からの一括投入という導線自体をなくし、二重の入口を残さない
- `/mock-exams` に **「未登録の模試名」セクション**を追加。既存の模試結果で使われているがマスタに無い名前を**使用件数の多い順**に一覧表示し、管理者が 1 件ずつ「登録」できる
  - 一括登録ボタンは**あえて置かない**。表記の揺れた名前をまとめて取り込んでしまうと、スクリプトで流し込むのと同じ結果になるため
- 登録時、**完全一致する既存の模試結果を自動で紐付ける**（API 側 `updateMany`）。確認ダイアログに対象件数を表示
- **「表記ゆれの可能性」セクション**を追加。登録済み・未登録をまたいで正規化キーが一致する名前をグループ表示し、「同じ模試なら 1 つだけ登録」を促す
- 正規化ロジック `normalizeExamName()` はスクリプトから `src/lib/mockExamMaster.ts` へ移設
- 検証: `tsc --noEmit` ✅ / 変更ファイルの `eslint` ✅ エラー0 / `next build` ✅（92ページ）
- 仕様反映: `spec.md` §4.3 前（データ構造）/ **§5.17 を新設**
- 検証: `tsc --noEmit` ✅ / 新規ファイルの `eslint` ✅ エラー0 / `next build` ✅（89ページ＝`/mock-exams` 追加）
- 未実施: 移行スクリプトの実行（開発 DB 含む）、ブラウザ実機 UI 確認

### B-6 実装記録 (2026-08-18, commit `7eae25a`)

- スキーマ: `MaterialRoute` / `MaterialRouteItem` を新設。マイグレーション `20260818020000_add_material_routes`（追加のみ）
  - `route_id` は CASCADE、`material_id` は **RESTRICT**（ルートで使用中の教材を消せないように）
  - `(route_id, sort_order)` の unique は**あえて付けない**。並べ替え中の一時重複を許すため。更新は「全削除→配列順に 1..n で再作成」をトランザクションで実施
- API: `/api/material-routes`（GET は admin/teacher、POST は admin）/ `[id]`（PUT・DELETE、admin）/ `[id]/duplicate`（POST、admin）
- 画面: `/materials` を**タブ構成**に変更（「教材一覧」/「参考書ルート」）。`MaterialsTabs.tsx` + `MaterialRoutesManager.tsx` を新設
- ステップ編集: 科目に一致する**有効な教材**から選択 → ↑↓ で並べ替え → 段階ごとのメモ。**並び順＝学習段階**
- **複製**機能（＝「フォーマット」の本体）: 「〜 のコピー」を作って派生ルートを作れる
- スコープ外（確定事項どおり）: 生徒への割り当て / 学習目標・進捗との連携
- 仕様反映: `spec.md` §5.12 の直後（教材マスタの追記として）
- 検証: `tsc --noEmit` ✅ / 新規ファイルの `eslint` ✅ エラー0 / `next build` ✅（90ページ）
- 未実施: ブラウザ実機 UI 確認

### B-9 実装記録 (2026-08-18, commit `7eae25a`)

- スキーマ: `HourlyWage` / `Payslip` / `PayslipItem` を新設。マイグレーション `20260818030000_add_payroll`
  - **時給は `User` に紐づける**（管理者は `Teacher` を持たない場合があるため / B-9(a)）
  - `PayslipItem` に**適用時給を行ごとに保存**し、後から時給を変えても確定済み明細が動かないようにした
- 計算 `src/lib/payroll.ts`:
  - **時給ごとに「合計分 × 時給 ÷ 60」→ 円未満切り捨て**。月内で時給が変わっても正しく出る（B-9(b)）
  - **JST 基準**で日付切り出し・月境界判定（`clockIn`/`clockOut` は UTC 保存のため要変換）
  - 打刻漏れ・逆転打刻は **0 分＋警告**（補完しない / B-9(d)）
  - 適用できる時給が無い日があれば**明細を生成せずエラー**
- API: `/api/payroll/wages`（GET/POST/DELETE、admin）/ `/api/payroll/payslips`（GET は本人＋admin、POST=生成は admin）/ `[id]`（PUT=調整・確定・確定解除、DELETE、admin）
- 画面: `/payroll`（admin）/ `/payroll/me`（本人・**確定済みのみ**）。共通の `components/PayslipView.tsx` は `window.print()` 対応（B-9(e)）
- 権限（B-9(f)）: 生成・調整・確定は admin のみ。`GET` は admin 以外に**自分の明細だけ**返す。確定済みは金額変更・再生成・削除不可
- 遡及計算（B-9(g)）: 適用開始日に過去日付を指定でき、過去月の明細も生成可能
- `formatMinutes` 等の表示用関数は `src/lib/payrollFormat.ts` に分離（`payroll.ts` は prisma を import するためクライアントから読めない）
- 仕様反映: `spec.md` §4.4 前（データ構造）/ **§5.18 を新設**
- 検証: `tsc --noEmit` ✅ / `next build` ✅（92ページ）/ **`npm run lint` 全体で 14 errors・8 warnings ＝ 作業開始時と同数**（新規エラー 0。作業中に出た `react-hooks/purity` 1件はその場で解消）
- 未実施: ブラウザ実機 UI 確認、実データでの計算検証

---

C. 2026-08-24 受領の修正指示 4 件（C-1〜C-4）

| # | 指示 | スキーマ変更 | 状態 |
|---|---|---|---|
| C-1 | 出勤ごとに講師・管理者へ交通費 200 円（人ごとに変更可・編集画面から設定） | 有 | ✅ 実装完了・本番反映済み |
| C-2 | 給与計算の時給操作をポップアップ化＋一覧の即時反映 | 無 | ✅ 実装完了・本番反映済み |
| C-3 | 明細生成が機能しない問題の確認 | 無 | ✅ 原因特定・修正完了（C-2 と同一原因） |
| C-4 | アプリ化（Web の通知限界のため段階移行） | — | 🔶 着手（方針検討中） |

### C-1 交通費（2026-08-24）

- スキーマ: `users.transport_allowance_yen`（既定 200）/ `payslips.work_days` `payslips.transport_yen` / `payslip_items.transport_yen`。
  マイグレーション `20260824000000_add_transport_allowance`（ADD COLUMN のみ・非破壊）。**本番 Neon 適用済み**（`prisma migrate deploy` / オーナー指示「即時本番反映」に基づく）
- 計算 (`src/lib/payroll.ts`): 出勤日数（JST の日で重複排除）× 単価。1 日に複数回の出退勤があっても 1 回だけ。
  **退勤打刻漏れで 0 分の日も交通費は付ける**（出勤した事実はあるため）
- 支給合計 = 勤務分 + 交通費 + 手動調整。`PUT /api/payroll/payslips/[id]` の再計算も交通費込みに修正
- 編集導線: `/teachers/[id]/edit` に「交通費（出勤1日あたり・円）」欄 ／ `/payroll` の「時給・交通費」モーダル（**管理者はこちらが編集窓口**。管理者専用の編集画面が存在しないため）
- API: `PUT /api/payroll/allowance` を新設（admin のみ）。`POST`/`PUT /api/teachers/[id]` も `transportAllowanceYen` を受け取る
- ⚠️ **既存の下書き明細には交通費が入っていない**。対象月の明細を「再生成」すると反映される

### C-2 / C-3 給与計算 UI（2026-08-24）

- **根本原因（C-2 の即時反映・C-3 の「生成できない」は同一）**: `PayrollManager` が props の `staff` を `useState(initialStaff)` に写して保持しており、`router.refresh()` でサーバー側が再計算されても**画面が初回の値のまま**だった。
  明細自体は DB に生成されていた（本番に 3 件存在するのを確認）が、一覧が「未生成」のままなので機能していないように見えていた
- 修正: props を直接描画（ローカルコピーを廃止）＋ `useTransition` + `router.refresh()` で更新を確実に反映。更新中は「更新中…」を表示
- 時給の操作を**モーダル化**（一覧下のカードを廃止）。時給の追加・履歴の削除・交通費の変更を 1 つのモーダルに集約
- 手当・控除の「調整」も同じくモーダル化
- 一覧に「交通費/日」列、明細に「交通費（N日）」欄と日別交通費列を追加
- fetch を try/finally で囲み、通信エラーでボタンが固まらないようにした。エラー表示も赤枠で目立たせた
- 併せて **勤務 16 時間超の日を警告**（退勤打刻の押し忘れ検知）。本番データで 1 件検出: 田嶋伶菜 2026-08 の 2 日で 4,514 分（約 75 時間）→ 出退勤の修正が必要
- 併せて **セキュリティ修正**: `GET /api/teachers/[id]` がログイン済みなら誰でも（生徒も）講師の `user` を丸ごと返しており `password_hash` を含んでいた。admin 限定＋必要フィールドのみに変更

### C-4 アプリ化（2026-08-24〜）

- 目的: Web アプリでは通知（プッシュ）に限界があるため、順次ネイティブアプリへ移行する
- 方針は `docs/app-migration-plan.md` に記載

---

## 完了

1. 生徒側で大目標・週次目標を設定できるようにする (2026-05-08, commit `e8306b3`)
   - `BigGoal.createdById` / `LearningGoal.createdById` を追加するマイグレーション適用
   - 目標 API を student ロールに開放（自分作成のみ編集・削除可能）
   - `/my-goals` ページ + サイドバー「目標管理」追加
   - 週次目標は大目標に紐付き必須

2. 生徒詳細などの詳細画面で必須入力のものにマークをつけるように (2026-05-09, commit `d81fe22`)
   - 共通コンポーネント `<FieldLabel required>` を作成（赤い `*` を表示）
   - 17 フォームのうち 16 ファイル合計 47 箇所を置換（編集ページ + 埋め込みフォーム）
   - 判定基準: HTML 要素に `required` 属性が付いているもの

3. パスワード変更の導線を追加、忘れた時のパスワードリセットの導線も追加 (2026-05-09, commit `d97071e`)
   - 全ロール向け `/account/password` ページ + `PUT /api/account/password`（現パス検証 + 6文字以上）
   - サイドバー下部のログアウト上に「パスワード変更」リンク追加
   - 運営向け: 生徒/講師詳細ページの編集ボタン横に「パスワードリセット」（admin のみ表示） — 一律 `password123` に戻す
   - `POST /api/admin/users/[id]/reset-password`（admin限定）
   - ログイン画面に「パスワードを忘れた方は運営にお問い合わせください」案内追加

4. 生徒と講師を追加するとき、パスワードを講師や運営が手入力するのではなく、一律でpassword123にするよう統一 (2026-05-09, commit `a684c52`)
   - 新規登録ページ（生徒・講師）からパスワード入力欄を削除
   - API 側で常に `password123` をハッシュ化して保存（body の password は受け取らない）
   - 新規登録フォーム上部に「初期パスワードは password123 です。登録後、本人にログイン後変更してもらってください」案内を表示

5. 大目標・週次目標を追加するとき、開始日の初期値を今日に / 週次目標の期日を開始日 + 7 日に追従 (2026-05-09)
   - 生徒側 (`MyGoalsClient`): 大目標フォームは新規時に開始日 = 今日。週次目標フォームは開始日 = 今日、期日 = 今日 + 7 日。週次目標の開始日変更時に期日も追従更新
   - 教員側 (`GoalsPanel`): 同上 (週次目標は startOfWeek ではなく今日基準に変更)
   - `LearningGoals.tsx` は import 元なしのデッドコードのため対象外

6. 生徒側の大目標・週次目標が学習進捗で保存されたページ数を拾えていない問題の修正 (2026-05-09, commit `8b390ab`)
   - スキーマ: `ProgressRecord.bigGoalId` を追加 (nullable, BigGoal への参照, ON DELETE SET NULL)。マイグレーション `20260508191429_add_big_goal_id_to_progress` 適用済み
   - `POST /api/progress` で `bigGoalId` を受け付け、大目標達成判定 (直紐付き + 配下週次合計が targetPages 超過で `completed`) を実装
   - `DELETE /api/big-goals/[id]` で `progressRecord.bigGoalId` を null 化してから削除
   - `/api/student-goals` 新規: 対象生徒の未完了大目標と週次目標を返す
   - `/progress/new` フォーム: 「紐づく目標（任意）」統合セレクト + 教材名 datalist 補完
   - ダッシュボード: 大目標 done = 直紐付き + 配下週次合計、週次目標は期日切れを非表示、各週次に「進捗を登録」ボタン
   - `GoalsPanel.computeBigGoalStats`: 直紐付き進捗を `actualTotal` と週次累計に加味

7. 生徒側のダッシュボード「今日進めるページ」仕様確認 (2026-05-09, 実装変更なし)
   - 現状ロジックの説明をユーザーに共有 (`todayPlan.ts`): 「残ページ × 今日の科目分数 / 残り日数の科目分数合計」を切り上げ
   - ユーザー判断: 期待通りで問題なしのため修正なし

8. 自習室管理に、着席登録 QR コードを各校舎に追加 (2026-05-09, commit `3193cdc`)
   - `qrcode.react@^4.2.0` を追加
   - `study-room/CheckInQR.tsx` 新規: `window.location.origin` から `/study-room/check-in?campus=<code>` の URL を生成して QR 表示。クリックで拡大モーダル + 印刷ボタン
   - `study-room/page.tsx` の各校舎カード末尾に組み込み
   - URL は実行時のドメインを参照するので、ドメイン変更時も自動追従

9. ゼミ管理を連番運用に + マトリクス空欄クリックで予定登録 (2026-05-09, commit `71a2a1b`)
   - `POST /api/student-prints`: 連番チェックを実装。同一 (studentId, printUnitId) 内で「最小空き No」のみ登録可能。既存登録 No の上書き (予定日変更) はスキップ
   - `SeminarManager.tsx`: 旧「プリント予定登録」フォーム廃止。マトリクスの空欄セルクリックで「次の登録可能 No」の予定日入力モーダルを開く（クリックしたセル No に関わらず連番固定）。完了済みは編集不可、予定済みは既存通り編集可
   - 既存データに飛ばしがあっても、最小空き No から連番で埋まっていく形で後方互換

10. 講師（および全ロール）の自身プロフィール表示画面 (2026-05-09, commit `55f27a5`)
    - `/account/profile` を新規作成、閲覧専用。ロール別に対応する Teacher / Student の全項目 + User 基本情報を表示
    - サイドバー下部「パスワード変更」の上に「プロフィール」リンクを追加（全ロール）

11. ゼミ管理で生徒側操作が講師側で見えない問題の修正 (2026-05-09, commit `179eae1`)
    - 原因: Next.js のページ/ルーターキャッシュ。生徒が登録した予定が講師タブで反映されない
    - `seminar/page.tsx` に `export const dynamic = "force-dynamic"` を追加（毎リクエスト DB 直読）
    - `SeminarManager.tsx` の予定登録/予定日変更/完了/削除すべてで `router.refresh()` を呼ぶように変更

12. タスクの新規作成を簡略化（タイトルのみ即追加） (2026-05-09, commit `ab524d3`)
    - `tasks/page.tsx` の上部に `InlineTaskCreate` クライアントコンポーネントを設置: タイトル入力 + 「+ 追加」ボタンのみ
    - `subject: ""`, `type: "通常"`, `dueDate: 今日`, `studentId: null` で `POST /api/tasks` を実行
    - 既存「新規作成」リンクは「詳細作成」ボタンとしてセカンダリ表示で残し、必要時のフル入力経路を確保（既存 `/tasks/[id]/edit` 経由）
    - 詳細編集は一覧の各行から従来通り編集モーダル / 編集ページへ遷移

13. 一時的なユーザー新規登録画面を作成 (2026-05-09, commit `440fa44`)
    - `/signup/student`, `/signup/teacher` 公開ページ + `/api/signup/student`, `/api/signup/teacher` 公開 API
    - `(authenticated)` の外側に配置、ログイン不要
    - 入力項目は admin 用編集ページと同じ範囲、パスワードはサーバー側で `password123` 固定
    - 登録完了画面で初期パスワード通知、2 秒後に `/login` へ遷移
    - 導入完了後は `/signup/` と `/api/signup/` のディレクトリ削除で招待制に戻る

14. 講師が自身のルーティンタスクを `/tasks/routines` から設定できるように修正 (2026-05-09, commit `2726530`)
    - 原因: ルーティン管理ページが閲覧専用で、講師が自分のものを編集する導線がなかった（講師管理は admin 専用）
    - `/tasks/routines/page.tsx`: teacher は自身の `routineTasks` のみ取得して `RoutineTaskManager` を直接埋め込み（追加・編集・削除可）。admin は既存通り全講師のルーティンを閲覧
    - `/api/routine-tasks` POST: teacher は body の teacherId を無視して自分の teacher.id を強制
    - `/api/routine-tasks/[id]` PUT/DELETE: teacher は対象 routineTask の teacherId と自分の teacher.id 一致を検証

15. タスクと関連 RoutineTask から「科目」を完全削除 (2026-05-09, commit `6e0e396`)
    - Task: 一覧テーブルの科目カラム削除、フィルタ削除、編集ページの科目セレクト削除、API は body.subject を無視して空文字保存
    - RoutineTask: 一覧表示の `[科目]` 表示削除、`RoutineTaskManager` の科目セレクト削除、API は body.subject を無視して空文字保存
    - 関連: `TaskCompleteCheckbox` / `TeacherTaskList` の Props からも subject を除去
    - スキーマ Task.subject / RoutineTask.subject は String のまま（既存値を保持、空文字で新規作成）

16. ダッシュボードの「本日使用するゼミプリント」カードを単元×No 集計に変更 (2026-05-09, commit `3faa656`)
    - 既にカード自体は存在したが、表示が「生徒×単元×No」で生徒別に行が分かれていた
    - 単元 × No 単位でグルーピングし、必要枚数（生徒人数）と対象生徒名を表示する形に変更
    - フッターも「合計N枚 (M種類)」表記に
    - 表示対象は admin / teacher、未完了 (`completedDate IS NULL`) かつ `scheduledDate` が今日のレコード

17. イントロダクション全件入れ替え (2026-05-09, commit `2ed8613`)
    - 既存 Article 6 件 + ArticleRead 1 件を削除し、5 件の新規イントロを投入
      - 【導入ガイド】講師の方へ
      - 【日常運用】講師の方へ
      - 【導入ガイド】生徒の方へ
      - 【機能リファレンス】講師の方へ（演算ロジック含む詳細）
      - 【機能リファレンス】生徒の方へ（「今日進めるページ」計算式や連番ルール等を解説）
    - `prisma/seed-intros.ts`: dry-run / commit モード、トランザクションで全削除→新規作成、commit 時はバッチ JSON ログを保存（gitignore 済）
    - 本番 Neon に適用済み

18. 自習室の退室・席移動導線を追加 (2026-05-09, commit `cf17667`)
    - 新規 `POST /api/study-room/change-seat`: 入室中セッションの seatType を更新（同セッション継続）。容量チェックあり、生徒は自身のみ操作可
    - `study-room/check-in/InRoomActions.tsx` 新規: 入室中の場合に「もう一方の席種に移動」+「退室する」ボタン (どちらも confirm 付き)
    - `study-room/check-in/page.tsx`: 入室中の校舎が表示中校舎と一致したら `InRoomActions` を表示、別校舎入室中はそのまま注意書き
    - `components/StudentCheckOutButton.tsx` 新規 + ダッシュボードの生徒用「獲得ポイント」カード（入室中表示の下）に組み込み — confirm 付きで `POST /api/study-room/check-out`
    - 校舎間移動は退室 → 別校舎で再入室の経路で対応

19. 講師が生徒詳細から自分を担当講師に登録できるように (2026-05-09, commit `6912a8c`)
    - `components/MyAssignmentToggle.tsx` 新規: 講師ロール用のトグルボタン
      - 担当でない場合: 「自分を担当に追加」(POST `/api/teachers/[id]/assignments`)
      - 担当の場合: 「自分の担当を解除」(DELETE) — 解除時は confirm
    - `students/[id]/page.tsx`: 講師ログイン時に teacher.id を取得し、現状の担当状態を判定してトグルを「担当講師」セクションに表示
    - 既存 API (`/api/teachers/[id]/assignments`) は `teacher.userId === session.user.id` の本人検証が既にあるため改修不要

20. アラート仕様確認と「学習目標進捗遅延」の通知先を担当講師＋adminに絞る (2026-05-09)
    - 仕様確認結果（5 種類のアラート）:
      - 面談リマインダー: 出勤中の講師全員 (現状維持)
      - タスク期限超過: タスクの担当講師本人のみ (現状維持)
      - シフト未打刻 / 退勤忘れ: 該当講師本人 + admin 全員 (現状維持)
      - **学習目標進捗遅延**: 旧「admin + teacher 全員」→ 新「対象生徒の担当講師 (StudentAssignment) + admin」に変更
    - `/api/alerts/check-all/route.ts` Section 5: 取得 query に `student.assignments.teacher.userId` を含め、admin と担当講師の userId を Set でマージして送信先を決定

21. ルーティンタスクに曜日の概念を追加 (2026-06-04)
    - スキーマ: `RoutineTask.weekdays`（`String @default("[]")`、JSON 配列 `[0..6]`、0=日〜6=土）を追加。マイグレーション `20260604000000_add_weekdays_to_routine_task` を Neon に適用済み
    - 出勤打刻 `clock-in`: 打刻日を **JST(UTC+9)** に変換して曜日を算出し、`weekdays` に当日曜日を含むルーティンのみ当日タスク化。`weekdays` 空配列は「毎日」生成（後方互換）。`generatedTasks` も実生成数に変更
    - API `POST/PUT /api/routine-tasks(/[id])`: `weekdays` を受け付け、`normalizeWeekdays`（0〜6・整数・重複除去・昇順）で JSON 文字列に正規化して保存
    - UI `RoutineTaskManager`: 月〜日の曜日トグル（複数選択）を追加、未選択は「毎日」と注記。一覧に曜日（または「毎日」）バッジ表示
    - `/tasks/routines`（admin 閲覧）: 各ルーティン行に曜日バッジを表示。teacher 用 `initialRoutines` マッピングに `weekdays` を追加
    - 仕様反映: `spec.md` 5.6 の実装追記ブロックに曜日指定を追記
    - 既知の未対応（スコープ外）: 同日に「退勤→再出勤」した場合の当日タスク二重生成防止は今回対象外（既存挙動のまま）

22. 生徒セルフ自習室ページ（QRなし入退室＋履歴閲覧）＝新規依頼③・⑥ (2026-07-14, commit `094956f`)
    - 背景③: 生徒がQRリーダーで開くブラウザとログイン中ブラウザが別セッションになり毎回ログインが要る問題。ログイン済みの生徒がアプリ内で完結できる導線を追加（QR運用は併存）
    - `study-room/me/page.tsx`（生徒のみ・`force-dynamic`）: 入退室操作＋サマリー＋履歴＋ポイント内訳を1ページに集約
    - `study-room/me/StudentStudyRoomPanel.tsx`: 未入室=校舎選択→既存 `CheckInForm`、入室中=既存 `InRoomActions`（席移動/退室）を再利用。校舎ごとの残席はサーバーで算出
    - ⑥履歴: 自分の `studentId` 限定。累計ポイント／今月の滞在時間／来室回数のサマリー、入退室履歴（滞在時間・自動退室バッジ）、ポイント内訳。日時は全てJST表示
    - `Sidebar`: 生徒メニューに「自習室」(`/study-room/me`) を追加
    - スキーマ変更なし（既存 `StudyRoomSession` / `PointTransaction` 参照）。`spec.md` 5.11 に実装追記
    - 未対応（スコープ外）: 期間フィルタ・月次以外の集計

23. 教材マスタ＋管理CRUD＝新規依頼⑦（第1段階） (2026-07-14, commit `8db3ba2`)
    - スキーマ: `Material`（`materials`）＝subject/name/publisher?/totalPages?/level/active。マイグレーション `20260714000000_add_materials`（追加のみ・既存非破壊）
    - **要適用**: 本番Neonへ `npx prisma migrate deploy`（ハーネス権限で私が実行不可のため手動適用）
    - `/materials`（admin/teacher）: 追加・科目フィルタ・無効表示トグル・インライン編集（onBlur自動保存）・有効/無効トグル・削除（admin）
    - API: `GET/POST /api/materials`、`PUT/DELETE /api/materials/[id]`（生徒不可・削除admin限定）
    - Sidebar に「教材マスタ」追加。`spec.md` 5.12 に実装追記
    - 第2段階（進行中）:
      - 進捗入力 `/progress/new` のマスタ統合＝完了 (2026-07-15, commit `1de7d9b`)。有効教材を科目フィルタで候補datalistに統合、自由入力維持・非破壊
      - 学習目標フォームのマスタ統合＝完了 (2026-07-16, commit `75ef802`)。生徒用 `MyGoalsClient`（大目標/週次）・講師用 `LearningGoals` の教材名入力に科目フィルタ済みdatalist
      - 面談記録＝対応不要に決定 (2026-07-16, オーナー確認 b)。面談中に表示される目標/進捗の教材で十分＝既にマスタ化済み。`Meeting` への教材フィールド追加はしない
      - **⑦の主要スコープ完了**。任意の将来拡張: `totalPages` を使った残量/ペース算出、既存自由記述の名寄せ（必須でない）

24. AI基盤新設＋AI診断テスト（管理者）＝新規依頼①（第1段階） (2026-07-22, commit `795db17`)
    - オーナー方針: AI提供元＝**Vercel AI Gateway**、①②⑤を一括視野に入れつつ、まず**管理者テスト機能**として追加（生徒公開は後段）
    - 基盤: `ai` パッケージ（v7）導入。**OIDC認証**（`VERCEL_OIDC_TOKEN`）でプロバイダ個別キー不要。カード登録で月$5無料枠が解放（実測で疎通確認済み）
    - `/admin/ai-test`（**admin限定**・サイドバー「AI診断テスト」）: 生徒＋モデル選択→構造化診断を表示。**結果保存なし・生徒非公開**（使い捨て）
    - `POST /api/admin/ai-test`（admin限定）: 生徒プロフィール＋直近模試5件→`generateObject` で構造化出力（総評/志望校位置づけ[挑戦・実力相応・安全]/弱点科目/総合アドバイス）。志望校・模試とも未登録は422。⑤未整備のため**AI推論のみ**
    - モデル: 既定 `anthropic/claude-sonnet-4.6`（無料枠可）・`openai/gpt-4o-mini`（低コスト・無料枠可）。`claude-opus-4.8`/`claude-haiku-4.5` は**有料トップアップで解放**（無料枠は403）
    - 検証: `scripts/ai-gateway-smoke.mjs`（疎通）＋実データ形状モックで構造化出力PASS、`tsc --noEmit` PASS
    - `spec.md` 5.13 ＋ 6章（技術スタック）に実装追記
    - 未対応（本番①へ）: 生徒向けAI相談チャット公開、結果保存/履歴（`AspirationDiagnosis`）、⑤大学マスタ併用の半定量化、②出願戦略（予算・沖縄移動/宿泊費）統合

25. 管理者向けイントロダクションにサインアップURLを追加 (2026-07-22, commit `795db17`)
    - オーナー依頼: 新規ユーザーのサインアップURLを管理者向けイントロダクションに掲載
    - articles に **audience="admin"** を追加＝管理者のみ閲覧（非管理者は `{role,"both"}` フィルタに非該当で自動非表示）。`AUDIENCE_LABELS` に「管理者向け」、`ArticleEditor` の対象選択に「管理者向け」を追加
    - 記事「【管理者用】新規ユーザーのサインアップURL」を投入（`prisma/seed-admin-intro.ts`・冪等）。生徒 `/signup/student`・講師 `/signup/teacher`、初期PW `password123`、招待制復帰の手順を記載
    - 検証: 可視性（admin=表示/生徒・講師=非表示）実DBで確認、`tsc --noEmit` PASS

26. 大学データ⑤（クロール収集・追跡）＋出願戦略②（管理者テスト）＝受験支援クラスタ全実装 (2026-07-22, commit `5f557b6`)
    - オーナー方針: 「A（②実装）」＋「大学データもクローリングで集める形ですべて実装」
    - スキーマ: `University`/`UniversityAdmission`/`AdmissionRevision` 追加。マイグレーション `20260722000000_add_universities`（追加のみ）を**本番Neonへ適用済み**（`migrate deploy`）
    - ⑤クロール: `POST /api/admin/universities/crawl`（admin・maxDuration60）。URL fetch→HTMLテキスト化(`lib/universityCrawl.ts`)→Gateway `generateObject` で入試情報抽出→upsert。`contentHash` 差分検知で `AdmissionRevision` に変更履歴。検索 `GET /api/admin/universities`。UI `/admin/universities`（サイドバー「大学データ」）
    - ②戦略: `POST /api/admin/ai-test/strategy`（admin・結果非保存）。生徒＋模試＋予算＋⑤データ→本命/併願/滑り止め・日程衝突・**沖縄からの遠征費（往復航空¥40k・宿泊¥8k既定、まとめ遠征で最小化）**・リスク。`/admin/ai-test` に②タブ追加
    - 既存①診断ルートにも `maxDuration=60` 追加（Vercelタイムアウト対策）
    - 検証: 抽出品質フィクスチャPASS（琉球大学を正確抽出）、実サイトfetch OK、**認証付きE2E**（ログイン→クロール→検索→②戦略200/プラン5件・遠征2回・総額¥229k→①診断200）、`tsc --noEmit` PASS
    - 未対応（productionize）: ⑤の**自律定期監視Cron**（Hobby Cron2本上限で未接続→Pro化 or Cron統合）、SPA(JS描画)ページのヘッドレス取得、重要変更の講師アラート連携、生徒公開・結果保存

27. ①を会話式「志望校コンサル」へ進化 (2026-07-22, commit `fac4260`)
    - オーナー要望: 一発診断ではなく、スタート=レコメンド／以降=会話で希望・条件を聞きながら志望校を絞り込むコンサル形式に
    - 会話API `POST /api/admin/ai-test/consult`（admin・maxDuration60・結果非保存）: 生徒プロフィール＋模試＋⑤大学データをシステムプロンプトに与え `generateText` で会話応答。「1〜2問ずつ聞き出しながら提案」「断定回避」
    - UI: `/admin/ai-test` ①タブを「志望校コンサル」に変更。レコメンド構造化カードをオープナー表示＋その下にチャット欄（Enter送信）。レコメンド本文を会話履歴の種として付与
    - 検証: 認証付きE2E多ターン会話PASS（心理学×九州国公立→条件反映＋聞き出し、私立/学費追加→継続）、`tsc --noEmit` PASS
    - 未対応: 生徒公開、会話ログ保存、ストリーミング表示

28. ②出願戦略も会話式ブラッシュアップへ (2026-07-22, commit `0d98c12`)
    - オーナー要望: ②も「最初におすすめ提示→生徒がフィードバック→会話でより良い戦略に」
    - 会話API `POST /api/admin/ai-test/strategy/consult`（admin・maxDuration60・結果非保存）: 生徒＋模試＋⑤大学データ＋費用前提を system に与え `generateText` で応答。更新プラン＋変化した費用感を返す
    - UI: ②タブの戦略カード下にチャット欄を追加（初回戦略要約を会話の種として付与、Enter送信）
    - 検証: 認証付きE2E PASS（初回6校→「予算20万・私立1校」で更新プランに調整）、`tsc --noEmit` PASS
    - 既知: AI応答のMarkdown表はチャットでpre-wrap表示（生表示）。将来marked導入で整形可

29. ⑤大学データの定期追跡（自動再クロール・A案 GitHub Actions） (2026-07-22, commit `ba2a603`)
    - オーナー方針: 「A（GitHub Actions）で無料範囲に収まるよう頻度調整」
    - 共通化: `lib/universityCrawl.ts` に `crawlAndStore()`（fetch→抽出→差分upsert→履歴）。手動crawlルートも同関数を使うよう簡素化
    - 定期API `POST /api/cron/recrawl-universities`（`CRON_SECRET`保護・maxDuration60）: 最も古いsourceUrlを1件だけ再クロール→`done`まで外部ループ。抽出は安価な `gpt-4o-mini`。全admissionの`lastCrawledAt`更新で巡回の進行を保証（無限ループ防止）
    - 変更検知(新規/更新)時は**管理者へアラート**（`Alert` type=general、概要＋出所URL）
    - スケジューラ `.github/workflows/recrawl-universities.yml`: **週1回（月曜03:23 JST）**＋手動実行。done まで curl ループ
    - `CRON_SECRET` を Vercel(prod/preview/dev)へ登録済み。**GitHub Secretは要手動追加**（Settings→Secrets→Actions）
    - 検証: 認証(401×2)・巡回(done:false→再クロール)・完了(done:true) 実DBでE2E PASS、`tsc --noEmit` PASS
    - 頻度/コスト: 週1・gpt-4o-mini・1URL/呼び出しで、GitHub Actions無料枠・Gateway無料$5/月に収まる想定
    - 未対応: SPA(JS描画)のヘッドレス取得、担当講師への個別通知

30. 「担当＝佐藤駿」自動割当バグ修正（担当講師を任意化） (2026-08-03, commit `308fb19` + docs `cbb1e75`)
    - 症状: 生徒の進捗などの担当者が全部「佐藤駿」。原因は meetings/progress/tasks API の `teacher.findFirst()`（並び順なし＝最古の講師=佐藤駿）フォールバック。管理者が作成した記録が全て佐藤駿に割当られていた（進捗170件・Task1件。StudentAssignmentデータ自体は正常）
    - スキーマ: `ProgressRecord`/`Meeting`/`Task` の `teacherId` を任意(nullable)化。マイグレーション `20260803000000_teacher_optional_on_records`（NOT NULL解除のみ・既存非破壊）を本番Neon適用済み
    - コード: 3ルートの findFirst フォールバックを廃止し、講師でない作成者は担当なし(null)に。表示は全箇所 `teacher?.user.name ?? "—"` に null 安全化（progress/meetings/tasks/students詳細/report/goals/dashboard/MeetingRecords/TaskCompleteCheckbox）。アラート(check-all/check-meetings)も担当null時はスキップ/「担当なし」表記
    - 検証: admin作成の進捗が teacherId=null になること・/progress が描画されることをローカルE2E PASS、`tsc --noEmit` PASS
    - データ後始末: `prisma/cleanup-sato-teacher.ts` を**デプロイ後に実行済み(2026-08-04)** → 進捗170件＋Task1件を担当なし(null)化、佐藤駿ひもづき0件。本番 /progress・/students/[id]・/tasks・/meetings が200描画を確認
    - デプロイ: push認証(gh を nextgene1221-creator へ再ログイン)解消 → `0d98c12..308fb19` push → 本番反映済み（26.AI再クロールも同時デプロイ）

31. 面談まわり改修・LINE連携・週次面談シート (2026-06-24 / 2026-07-02, commit `e6e3ccc` + `5f05be2`)
    - ※ 2026-08-18 に git 履歴と突合。両コミットとも `origin/main` に含まれ **push 済み**。旧「未コミット／push待ち」表記は誤りだったため訂正。残る実機確認は進行中 A に残置。

- **フェーズ1: 面談記録時の予定設定モーダル（commit `e6e3ccc`・push 済み）**
  - 新規 `ClassDay`（授業日）モデル＋マイグレーション `20260615000000_add_class_days`
    - 自習(`study_schedule_days`)とは別概念。特定日付ベース（科目/担当講師/時間は任意）
  - API: `GET/POST /api/class-days`、`PUT/DELETE /api/class-days/[id]`
  - `MeetingPlanModal`（タブ: 学習進捗[読取] / 次週学習予定 / 授業日 / ゼミ予定）を面談記録フォームから起動
    - 次週学習予定 = 既存 `StudyScheduleEditor`（学習時間）を再利用
    - 授業日 = 新規 `ClassDayEditor`（「前回分を翌週にコピー」で初期値引き継ぎ）
    - ゼミ予定 = `SeminarManager` に `embedded` を追加して再利用
    - 次回面談予定は面談フォーム内に残置
- **フェーズ2: 週次面談シート（commit `e6e3ccc`・push 済み / ブラウザ実機確認は未）**
  - `MeetingSheet` モデル＋マイグレーション `20260617000000_add_meeting_sheets`（Neon 適用済み）
  - API: `GET/POST /api/meeting-sheets`、`GET/PUT/DELETE /api/meeting-sheets/[id]`
  - 生徒: サイドバー「面談シート」→ 一覧 `/meeting-sheets`（今週分を生成・未提出リマインド）＋記入 `/meeting-sheets/[id]`
  - 面談予定日の参照: `lib/nextMeeting.ts`（面談タスク優先→面談記録の次回予定）。3日前から未提出タグ
  - 面談記録保存(POST /api/meetings)時、次回予定があれば面談タスク(type=面談)を自動生成
  - 講師/管理者: `MeetingPlanModal` に「週次シート」タブ（最新シートを読み取り表示）
  - 検証: 型(tsc)・Lint・本番ビルド(next build) クリア。実DBスモークテスト（CRUD/JSON往復/提出/次回面談タスク優先/削除）全PASS（`prisma/smoke-meeting-sheet.ts`）
  - 残: ブラウザでの実機UI確認（→ 進行中 A に残置）
  - 面談記録に任意で紐づく提出物。ゼミ・学習進捗等と重複する項目は含めない
  - 確定事項（2026-06-17）:
    - 記入者=生徒。週区切りなし。生成は生徒の「今週分を生成」ボタン
    - 締切=面談実施まで。未提出タグは面談予定日の3日前から表示（参照元=直近面談の次回面談予定）
    - 提出後も生徒が修正可（ロックなし）
    - 講師/管理者は面談モーダルの「週次シート」タブで閲覧（読取）
    - 項目は spec.md 5.9 を正とする（教材/予定/実績の表は削除＝学習進捗と同義）

  ### ▼ 週次面談シートの項目定義 → **`spec.md` §5.9 へ転記済み**
  - オーナー記入欄に記入された項目定義は `spec.md` の「5.9 週次面談シート」に正式セクションとして転記済み（転記日 2026-06-17）。**項目の正は spec.md §5.9**。
  - 2026-08-18 に実装 (`src/lib/meetingSheet.ts`) と spec.md §5.9 を突き合わせ、**選択肢・項目とも差分なし**を確認。
  - 二重持ちを避けるため、ここにあった生テキストは削除した（playbook §0）。
- **フェーズ3: LINE連携（本番稼働開始 2026-07-02, commit `5f05be2`）**
  - **スコープ変更（2026-07-02）**: クライアントが用意可能なのが Messaging API の **Channel ID / Channel secret のみ**（LINE Loginチャネル不可）と確定 → **LINEログインは廃止**、通知＋友だち連携のみに縮小。ログインは従来のメール＋パスワードのまま。
  - 認証情報: Channel ID / secret から **ステートレス チャネルアクセストークンを都度発行**（`oauth2/v3/token`, client_credentials）。事前発行トークン不要。env: `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` / `LINE_FRIEND_URL`
  - スキーマ: `User.lineUserId / lineLinkCode / lineLinkExpires` 追加。マイグレーション `20260702000000_add_line_fields` を **Neon本番に適用済み**
  - 実装: `lib/line.ts`（トークン発行・push・reply・署名検証）/ `lib/lineNotify.ts`（朝夜ロジック）/ `api/line/webhook`（6桁コード連携）/ `api/line/link`（POST発行・DELETE解除）/ `api/line/notify/{morning,evening}` / `/account/profile` に連携UI
  - 朝通知(9:00 JST): 面談予定・授業（ある場合） = `api/line/notify/morning`（Cron）
  - 夜通知(22:00 JST): 学習予定あり＆進捗未記録ならリマインド／宛先は生徒のみ。**auto-checkout(22:00) に相乗り実行**（Hobbyプラン Cron 2本制限内）
  - 検証: `tsc --noEmit` / eslint / `next build` すべてクリア
  - **本番反映（2026-07-02 完了）**:
    1. ✅ 本番Vercelに `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` / `LINE_FRIEND_URL`(`https://lin.ee/ZhUDxwC`) を Production に設定
    2. ✅ `main` push → 本番デプロイ Ready（本番 `https://juku-system.vercel.app`）
    3. ✅ Webhook URL = `https://juku-system.vercel.app/api/line/webhook` をクライアントが登録済み。署名検証スモークテスト通過（正:200 / 誤:401）
  - **残（実利用での確認）**: 実アカウントで友だち追加＋6桁コード連携 → 朝夜通知の実送信確認

> 注: 「講師・生徒登録時のパスワード記入欄削除」は既に完了 4 (2026-05-09, commit `a684c52`) で対応済みです。
