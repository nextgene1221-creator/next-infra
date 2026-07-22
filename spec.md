# 高校生向け塾 基幹システム 仕様書

## 1. システム概要

高校生向け学習塾の運営を支援する基幹システム。
生徒・講師・学習進捗・タスク・シフトを一元管理し、アラート機能で重要な情報を通知する。

---

## 2. ユーザーロール

| ロール | 説明 |
|--------|------|
| 管理者 (admin) | 全機能にアクセス可能。塾の運営者・教室長 |
| 講師 (teacher) | 担当生徒の情報閲覧、学習進捗入力、自身のシフト確認 |
| 生徒 (student) | 自身の学習進捗・タスク確認 |

---

## 3. ページ構造

### 3.1 ログイン / 認証

| ページ | パス | 説明 |
|--------|------|------|
| ログイン | `/login` | メールアドレス + パスワードでログイン |
| パスワードリセット | `/reset-password` | パスワード再設定 |

### 3.2 ダッシュボード

| ページ | パス | 説明 |
|--------|------|------|
| ダッシュボード | `/dashboard` | ロール別のホーム画面。アラート一覧、直近の予定等を表示 |

### 3.3 生徒管理

| ページ | パス | 説明 |
|--------|------|------|
| 生徒一覧 | `/students` | 検索・フィルタ付き一覧 |
| 生徒詳細 | `/students/:id` | 基本情報、学習進捗、タスク、担当講師 |
| 生徒登録・編集 | `/students/:id/edit` | 生徒情報の登録・更新 |

### 3.4 講師管理

| ページ | パス | 説明 |
|--------|------|------|
| 講師一覧 | `/teachers` | 検索・フィルタ付き一覧 |
| 講師詳細 | `/teachers/:id` | 基本情報、担当生徒、シフト |
| 講師登録・編集 | `/teachers/:id/edit` | 講師情報の登録・更新 |

### 3.5 学習進捗管理

| ページ | パス | 説明 |
|--------|------|------|
| 進捗一覧 | `/progress` | 生徒別・科目別の進捗一覧 |
| 進捗入力 | `/progress/new` | 授業後の進捗記録入力 |
| 進捗詳細 | `/progress/:id` | 進捗記録の詳細表示 |

### 3.6 タスク管理

| ページ | パス | 説明 |
|--------|------|------|
| タスク一覧 | `/tasks` | 生徒別の宿題・課題一覧 |
| タスク作成・編集 | `/tasks/:id/edit` | タスクの作成・更新 |

### 3.7 アラート

| ページ | パス | 説明 |
|--------|------|------|
| アラート一覧 | `/alerts` | 全アラートの一覧・既読管理 |


### 3.8 シフト管理

| ページ | パス | 説明 |
|--------|------|------|
| シフトカレンダー | `/shifts` | 月間・週間カレンダー形式でシフト表示 |
| シフト登録・編集 | `/shifts/edit` | シフトの登録・更新 |
---

## 4. データ構造

### 4.1 users（ユーザー / ログイン情報）

| カラム | 型 | 説明 |
|--------|----|------|
| id | UUID | 主キー |
| email | string | メールアドレス（ログインID） |
| password_hash | string | ハッシュ化パスワード |
| role | enum | admin / teacher / student |
| name | string | 氏名 |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |

> **【実装追記 2026-07-02】LINE連携カラム** — マイグレーション `20260702000000_add_line_fields` を Neon 本番に適用済み。
> - `line_user_id` string?（連携済みLINE userId。unique・nullable）
> - `line_link_code` string?（連携用ワンタイム6桁コード）
> - `line_link_expires` datetime?（コード有効期限）

### 4.2 students（生徒）

| カラム | 型 | 説明 |
|--------|----|------|
| id | UUID | 主キー |
| user_id | UUID | users.id への外部キー |
| grade | int | 学年（1〜3） |
| school_name | string | 高校名 |
| parent_name | string | 保護者氏名 |
| parent_phone | string | 保護者電話番号 |
| parent_email | string | 保護者メールアドレス |
| enrollment_date | date | 入塾日 |
| status | enum | active / inactive / withdrawn |
| notes | text | 備考 |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |

### 4.3 teachers（講師）

| カラム | 型 | 説明 |
|--------|----|------|
| id | UUID | 主キー |
| user_id | UUID | users.id への外部キー |
| subjects | string[] | 担当可能科目 |
| employment_type | enum | full_time / part_time |
| phone | string | 電話番号 |
| status | enum | active / inactive |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |

### 4.4 student_teacher（生徒-講師 紐付け）

| カラム | 型 | 説明 |
|--------|----|------|
| id | UUID | 主キー |
| student_id | UUID | students.id への外部キー |
| teacher_id | UUID | teachers.id への外部キー |
| subject | string | 担当科目 |
| created_at | datetime | 作成日時 |

### 4.5 progress_records（学習進捗）

| カラム | 型 | 説明 |
|--------|----|------|
| id | UUID | 主キー |
| student_id | UUID | students.id への外部キー |
| teacher_id | UUID | teachers.id への外部キー（記録者） |
| subject | string | 科目 |
| date | date | 授業日 |
| topic | string | 学習内容・単元 |
| understanding_level | int | 理解度（1〜5） |
| comment | text | 講師コメント |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |

### 4.6 tasks（タスク / 宿題）

| カラム | 型 | 説明 |
|--------|----|------|
| id | UUID | 主キー |
| student_id | UUID | students.id への外部キー |
| teacher_id | UUID | teachers.id への外部キー（作成者） |
| subject | string | 科目 |
| title | string | タスク名 |
| description | text | 内容・詳細 |
| due_date | date | 期限 |
| status | enum | pending / in_progress / completed / overdue |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |

### 4.7 alerts（アラート）

| カラム | 型 | 説明 |
|--------|----|------|
| id | UUID | 主キー |
| user_id | UUID | 通知先ユーザー |
| type | enum | task_overdue / shift_reminder / progress_warning / general |
| title | string | アラートタイトル |
| message | text | アラート本文 |
| is_read | boolean | 既読フラグ |
| created_at | datetime | 作成日時 |

### 4.8 shifts（シフト）

| カラム | 型 | 説明 |
|--------|----|------|
| id | UUID | 主キー |
| teacher_id | UUID | teachers.id への外部キー |
| date | date | シフト日 |
| start_time | time | 開始時刻 |
| end_time | time | 終了時刻 |
| status | enum | scheduled / confirmed / cancelled |
| notes | text | 備考 |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |

> **【実装追記 2026-06-15】4.9 class_days（授業日）を追加**
> 自習（`study_schedule_days`）とは別概念の「授業日」を**特定の日付ベース**で管理する `ClassDay` モデルを追加。
>
> | カラム | 型 | 説明 |
> |--------|----|------|
> | id | UUID | 主キー |
> | student_id | UUID | students.id への外部キー（onDelete: Cascade） |
> | date | datetime | 授業日（特定の日付） |
> | subject | string | 科目（任意・既定空文字） |
> | teacher_id | UUID? | 担当講師（任意、teachers.id） |
> | start_time | string | 開始 HH:mm（任意） |
> | end_time | string | 終了 HH:mm（任意） |
> | note | string | メモ（任意） |
> | created_at / updated_at | datetime | 作成・更新日時 |
>
> 用途: 面談時に次週ぶんの授業日を設定。将来の LINE 朝通知（授業がある場合）でも参照予定。

---

## 5. 各ページ詳細仕様（追記用）

> 以下に各ページの詳細な仕様・修正点を記入してください。

### 5.1 ログイン


### 5.2 ダッシュボード
ダッシュボードは現時点仕様が固まらないので作らずにおくこと

### 5.3 生徒管理
生徒ごとに学習計画の管理が発生するのでそれと紐づけること。CRUDができるようにすること

### 5.4 講師管理
タスク管理に紐づけること。出退勤管理を追加すること。

> **【実装追記 2026-06-04】現状の実装内容**
> - **出退勤（勤怠）**: `Attendance` モデルで出勤(`clockIn`)・退勤(`clockOut`)を打刻管理。出勤時はその日のシフトから校舎(`campus`)を自動コピー（後から修正可）。
>   - 出勤打刻 `POST /api/attendance/clock-in`、退勤打刻 `POST /api/attendance/clock-out`。
> - **ルーティンタスク**: 講師ごとに `RoutineTask`（雛形）を登録でき、`/tasks/routines` で teacher は自分のものを CRUD、admin は全講師分を閲覧。出勤打刻時にその日のタスク(`Task`)へ自動展開される（詳細は 5.6）。

### 5.5 学習進捗管理
完了目標日から計算して、１日に何ページテキストを進めればいいか自動で計算すること。進捗が２週間以上遅れている場合アラートすること。

> **【実装追記 2026-06-15】面談記録時の「予定設定モーダル」（フェーズ1）**
> 生徒詳細(`students/[id]`)の面談記録フォームに「📋 ゼミ・授業日・次週学習予定を設定」ボタンを追加。クリックで `MeetingPlanModal` を開き、**学習進捗表を見ながら**以下をタブで操作できる：
> - **学習進捗**（読み取り：大目標/指標・最近の進捗）
> - **次週の学習予定** … 既存の「学習時間（曜日ごとの自習配分）」エディタ(`StudyScheduleEditor`)を再利用
> - **授業日** … 新規 `ClassDayEditor`。特定日付で追加／削除でき、「前回分を翌週にコピー」で前回（最新授業日を含む7日間）を +7 日に複製（初期値の引き継ぎ）
> - **ゼミ予定** … 既存 `SeminarManager` を `embedded` で再利用（単元管理・生徒選択を非表示）
>
> 「次回面談予定」は当初要望どおりモーダルではなく面談フォーム内の項目として残置。
> 初期値の引き継ぎ: 学習時間・ゼミ予定は永続データのため現行値がそのまま初期値、授業日は上記コピー機能で対応。
>
> 未対応（後続フェーズ）: 週次面談シート（項目定義待ち）／ LINE 連携・ログイン・朝夜通知。


### 5.6 タスク管理
タスクの種別をルーティンタスク、個人タスク、生徒タスク、面談タスクに分けること。
タスク担当者退勤時、完了していない生徒タスク・ルーティンタスクは出勤中の講師に担当を入れ替えること。
面談タスク開始時、他の講師に質疑対応声かけをするようにアラートすること。

> **【実装追記 2026-06-04】現状の実装内容（当初仕様との差異を含む）**
>
> - **タスク種別 (`Task.type` / `RoutineTask.type`)**: 当初仕様の4分類ではなく、実装では **`通常` / `要引き継ぎ` / `面談`** の3種で運用している。
>   - `科目 (subject)` は廃止済み（カラムは残置、新規は空文字で保存）。
> - **ルーティンタスク → 当日タスクの自動生成**: 出勤打刻 (`POST /api/attendance/clock-in`) 時、その講師の `RoutineTask` を当日の `Task`（`dueDate` = 当日23:59、`status` = `pending`）として生成する。
>   - **曜日指定（2026-06-04 追加）**: `RoutineTask.weekdays`（JSON 配列 `[0..6]`、0=日〜6=土）を持ち、**打刻日(JST)の曜日が含まれるルーティンのみ生成**する。`weekdays` が空配列 `[]` のものは「毎日」扱い（後方互換）。曜日判定は出勤打刻時刻を JST(UTC+9) に変換して算出する。UI（`RoutineTaskManager`）は曜日トグル（月〜日の複数選択）で設定し、一覧には曜日（または「毎日」）バッジを表示する。
> - **退勤時の引き継ぎ（当初仕様との差異）**: 当初仕様は「未完了の生徒タスク・ルーティンタスク」を対象としていたが、実装では **`type === "要引き継ぎ"` かつ未完了 (`pending`/`in_progress`) のタスクのみ**を対象に、出勤中の他講師へ自動再割当する（`POST /api/attendance/clock-out`）。
>   - 引き継ぎ先の選定は **タスク数(少) → 当日シフトの最早終了時刻(早) → 当日面談数(少) → 氏名** の優先順でソートし、先頭の講師に割当。受け取った講師には `general` アラートで通知する。
> - **面談アラート**: `POST /api/alerts/check-meetings` が、`meetingDateTime` を過ぎた未通知 (`meetingAlerted = false`) の面談タスクを検出し、**出勤中の他講師全員**へ「質疑応答の声かけ」アラートを生成、`meetingAlerted = true` を立てる。
> - **追加フィールド (`Task`)**: `meetingDateTime`（面談予定日時）/ `meetingAlerted`（面談アラート済みフラグ）/ `overdueAlerted`（期限超過アラート済みフラグ）。

### 5.7 アラート
講師別に検索できるように。

### 5.8 シフト管理
保留

### 5.9 週次面談シート（生徒が週次面談前に記入）

> **【定義 2026-06-17 / オーナー記入を `docs/todo.md` から転記】**
> 生徒が週次面談の実施までに記入してくる提出物。面談記録には任意で紐づく（週ごとに独立して提出）。ゼミ等の既存機能と重複する項目は含めない。
>
> 冒頭文（生徒向け案内）:
> 「このシートは、来週の勉強で迷わないための材料を集めるものです。正しい答えを書く必要はありません。事実と、そのときどう感じたかだけ書いてください。」
>
> **【1】基本情報**
> - 氏名 … 自動（ログイン生徒）
> - 面談日 … 自動／対象週から導出
>
> **【2】今週の学習ログ（行動）** ※Studyplus の記録をもとに記入
> - ~~今週取り組んだ主な科目・単元（表: 教材/予定/実績）~~ → **削除**（学習進捗と同義のため。シートには含めない）
> - 今週の総学習時間: 目標（数値・時間） / 実績（数値・時間）
> - 今週の勉強の手応え（単一選択）: かなりあった / 少しあった / あまりなかった / ほぼなかった
> - 今週の計画外のタスク（自由記述）
>
> **【3】予定と実績のズレ（判断）** ※先週の面談で立てた予定と比較
> - 予定と比べてどうでしたか（単一選択）: ほぼ予定通り / 少しズレた / 大きくズレた
> - 予定と違った理由（複数選択可・各サブ選択あり）:
>   - 学習時間（予定より多い/少ない） / 学習量[問題数・ページ]（多い/少ない） / 内容の難易度（重い/軽い） / 他タスク優先（課題・自分で追加・その他） / 体調 / 予定 / 特になし
> - ズレの方向として近いもの（単一選択）: 進みすぎた / 進まなかった / 進度は同じだが中身が違った / まだ整理できていない
> - 来週も同じ条件なら同じズレが起きそう（単一選択）: 起きそう / 起きなさそう / 分からない
> - 補足1行（自由記述）
>
> **【4】来週に向けて**
> - 来週も続けたいこと: ある（自由記述）/ ない
> - 来週、変えたいこと: ある（自由記述）/ ない
>
> **【5】メモ**（相談したいこと・分からなかったこと等／自由記述）
>
> 締め文: 「上記の内容をもとに面談し、迷わず進められる来週の計画を一緒に考えます。」
>
> **【実装方針 2026-06-17（確認済み）】**
> - 記入者: 生徒。**週区切りは設けない**（面談直前〜前日に記入される想定）。
> - 生成: 生徒が **「今週分を生成」** ボタンで1枚作成。
> - 締切: **面談実施まで**。未提出の注意タグは **面談予定日の3日前から**表示。
>   - 面談予定日の参照元: **直近の面談記録の「次回面談予定（nextMeetingDate）」**。未設定なら自動タグは出さない（生成・記入は可能）。
> - 提出後も**生徒が修正可**（ロックなし）。状態は `draft / submitted`。
> - 講師/管理者は **面談モーダル内の「週次シート」タブ**で当該生徒の最新シートを閲覧（読み取り）。
> - データ構造案: 新モデル `MeetingSheet`（studentId / status / submittedAt? / forMeetingDate?（生成時の次回面談予定スナップショット） / answers[構造化JSON] / meetingId?（任意）/ timestamps）。

### 5.10 LINE通知連携（Messaging APIのみ）

> **【実装追記 2026-07-02】** 当初計画は「LINEログイン＋通知」だったが、クライアント側で用意可能なのが **Messaging APIチャネルの Channel ID / Channel secret のみ**（LINE Loginチャネルは用意不可）と確定したため、**スコープを「通知＋友だち連携」のみに縮小**。ログインは従来のメール＋パスワードのまま。
>
> **認証情報**: Channel ID / Channel secret から `POST https://api.line.me/oauth2/v3/token`（`grant_type=client_credentials`）で **ステートレス チャネルアクセストークン（~15分）を都度発行**。事前発行トークン不要・期限切れ運用リスクなし。環境変数 `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET`（＋友だち追加URL `LINE_FRIEND_URL`）。共通処理は `src/lib/line.ts`。
>
> **アカウント連携（友だち追加＋6桁コード）**:
> - `/account/profile` の「LINE通知連携」から `POST /api/line/link` で6桁コード発行（`line_link_code` に保存・有効期限10分）。
> - 生徒が公式LINEを友だち追加し、コードをトークに送信 → `POST /api/line/webhook`（`X-Line-Signature` を channel secret で HMAC-SHA256 検証）がコード照合し `line_user_id` を保存、確認リプライ。
> - 解除は `DELETE /api/line/link`。友だち追加(follow)時は連携手順を自動返信。
>
> **通知（生徒のみ・連携済みのみ送信、`src/lib/lineNotify.ts`）**:
> - **朝（9:00 JST）**: 当日に **授業（ClassDay）または面談（Meeting.nextMeetingDate）** がある生徒へ予定を通知。`GET /api/line/notify/morning`（Cron・`CRON_SECRET` Bearer認証）。
> - **夜（22:00 JST）**: **今日の学習予定あり（StudyScheduleDay の当日曜日 slots が非空）＆進捗未記録（ProgressRecord に当日レコードなし）** の生徒へリマインド。記録済み・予定なしは送らない。
> - 判定は全て **JST基準**（`ProgressRecord.date` は UTC真夜中保存のため、JSTカレンダー日付から UTC境界を生成して照合）。
>
> **Cron構成（Hobbyプラン Cron 2本制限内）**: `vercel.json` は ①`/api/study-room/auto-checkout`（`0 13 * * *`）②`/api/line/notify/morning`（`0 0 * * *`）の2本。**夜通知は auto-checkout(22:00 JST) に相乗り実行**（同ルートから `sendEveningNotifications()` を呼ぶ）。手動/テスト用に `GET /api/line/notify/evening` も存置。

---

### 5.11 自習室（生徒セルフ入退室・履歴）

> **【実装追記 2026-07-14】** 生徒が **QRを介さず、ログイン中のアプリ内メニューから自習室の入退室・席移動を登録**できる導線と、**自分の入退室履歴・累計ポイントの閲覧**を追加（新規依頼③・⑥）。スキーマ変更なし（既存 `StudyRoomSession` / `PointTransaction` を参照）。
>
> **背景（③の経緯）**: 従来は入口の静的QR（`/study-room/check-in?campus=<code>`）を生徒がスキャンする運用。だが生徒がQRリーダーアプリで開くブラウザとログイン中のブラウザが別セッションになり、毎回ログインが要る問題があった。そのため **ログイン済みの生徒がアプリ内で完結**できるUIを追加。QR運用は従来どおり併存。
>
> **ページ**: `/study-room/me`（`requireAuth(["student"])`、`dynamic = "force-dynamic"`）。サイドバーに生徒用メニュー「自習室」を追加。
>
> **入退室操作（③）**: クライアント `StudentStudyRoomPanel`。
> - 未入室時: 校舎を選択 → 席種を選んで入室。既存 `CheckInForm`（`POST /api/study-room/check-in`）を再利用。各校舎のブース/テーブル残席はサーバーで算出（`groupBy` の在室数 vs `StudyRoomConfig` 定員）。
> - 入室中: 既存 `InRoomActions`（席移動 `POST /api/study-room/change-seat` ／退室 `POST /api/study-room/check-out`）を再利用。二重入室・満席チェックは既存API側で担保。
>
> **履歴・ポイント閲覧（⑥）**: 自分の `studentId` に限定。
> - サマリー: 累計ポイント（`PointTransaction.delta` 合計）／今月の合計滞在時間（JST基準で当月分を集計）／直近来室回数。
> - 入退室履歴（直近200件）: 日付・校舎・席種・滞在時間（`checkOutAt - checkInAt`）・入室中/自動退室バッジ。
> - ポイント内訳（直近20件）。
> - 日時は全て **JST表示**（DBはUTC保存、`Intl` の `timeZone: "Asia/Tokyo"` で整形）。
>
> **未対応（今回スコープ外）**: 期間フィルタ／月次以外の集計、置き場所の変更（現状は自習室配下 `/study-room/me` に集約）。

---

### 5.12 教材マスタ（新規依頼⑦・第1段階）

> **【実装追記 2026-07-14】** 現在バラバラに自由記述されている「教材」をマスタ化する。**第1段階として教材マスタ本体＋管理CRUDを実装**（各フォームの選択式化は第2段階）。
>
> **データ構造**: 新モデル `Material`（`materials` テーブル・マイグレーション `20260714000000_add_materials`、追加のみ）。
> - `subject`（科目）/ `name`（教材名）/ `publisher?`（出版社）/ `totalPages?`（総ページ）/ `level`（レベル・種別、任意）/ `active`（有効フラグ）。
> - 無効化（`active=false`）＝新規選択肢から除外するが、既存の自由記述記録は非破壊で保持。
>
> **管理画面**: `/materials`（admin/teacher。サイドバー「教材マスタ」）。
> - 追加: 科目（`SUBJECTS` から選択）・教材名・出版社・総ページ・レベル。作成は admin/teacher。
> - 一覧: 科目フィルタ／無効表示トグル。各項目はインライン編集（onBlurで自動保存 `PUT /api/materials/[id]`）。有効/無効トグル。削除は admin のみ（`DELETE`）。
> - API: `GET/POST /api/materials`、`PUT/DELETE /api/materials/[id]`（生徒は不可、削除は admin 限定）。
>
> **第2段階（進行中）**: 各フォームでマスタから選択できるように変更（オーナー要望）。自由入力は維持（非破壊・併存）。
> - **【2026-07-15 実装】** 進捗入力 `/progress/new`: 教材マスタ（有効なもの）を取得し、選択中の科目でフィルタして候補 `datalist` に統合（`GET /api/materials`、取得失敗時は従来の目標由来候補のみにフォールバック）。
> - **【2026-07-16 実装】** 学習目標フォーム: 生徒用 `MyGoalsClient`（大目標・週次目標）と講師用 `LearningGoals` の教材名入力に、科目フィルタ済みのマスタ候補 `datalist` を統合（自由入力維持）。
> - **面談記録は対応不要**（オーナー確認 2026-07-16: 面談中に表示される目標/進捗の教材で十分＝既にマスタ化済み。`Meeting` への教材フィールド追加はしない）。
> - **⑦の主要スコープ完了**。任意の将来拡張として `totalPages` を使った残量/ペース算出、既存自由記述の名寄せが残るが必須ではない。

---

### 5.13 AI診断テスト（新規依頼①・AI基盤 第1段階／管理者テスト）

> **【実装追記 2026-07-22】** 依頼①「志望校診断AI」の**AI基盤を新設**。まずは本番リスクなく疎通・構造化出力・生徒データ接続を検証するための**管理者専用テスト機能**として実装（オーナー方針：①②⑤を一括視野に入れつつ、いきなり生徒公開せず管理者テストから）。
>
> **AI基盤**: **Vercel AI Gateway**（`ai` パッケージ、OIDC認証）。プロバイダ個別のAPIキーは不要で、`VERCEL_OIDC_TOKEN`（`vercel env pull` で取得・ローカルは約24hで失効、本番は自動更新）で認証。詳細は「6. 技術スタック」参照。
>
> **画面**: `/admin/ai-test`（**admin 限定**・サイドバー「AI診断テスト」）。生徒を選択しモデルを選んで「診断する」→ 構造化された診断を表示。**結果は保存せず、生徒には表示しない**（使い捨て）。
>
> **API**: `POST /api/admin/ai-test`（admin限定）。入力＝`studentId`＋`model`。処理＝対象生徒のプロフィール（学年/文理/志望校/志望学部/受験科目/推薦検討/英検予定）＋直近模試最大5件（`MockExamResult`）を組み立て、`generateObject`（`ai`）で**構造化出力**を取得。志望校・模試いずれも未登録なら 422。
> - **出力スキーマ**: `summary`（総評）/ `schools[]`（大学ごとに `positioning`＝挑戦・実力相応・安全 ＋ 所見・根拠）/ `weakSubjects[]`（弱点科目・推奨アクション）/ `overallAdvice`。⑤の大学マスタ未整備のため**AI推論のみ**（大学の偏差値/判定テーブルは未併用）で、断定を避けた参考所見として生成する方針。
> - **モデル**: 既定 `anthropic/claude-sonnet-4.6`。切替可 `openai/gpt-4o-mini`（低コスト）。`anthropic/claude-opus-4.8`（最高品質）は**有料クレジットのトップアップ後に解放**（無料$5/月枠では 403）。
> - コスト帰属タグ `feature:admin-ai-test` / `feature:aspiration-diagnosis`、`user`＝実行管理者IDを付与。
>
> **未確定（本番①へ向けて）**: 生徒向けAI相談チャットとしての公開形態、結果の保存/履歴（`AspirationDiagnosis` モデル）、⑤大学マスタ併用による半定量化、②出願戦略（予算・沖縄からの移動/宿泊費）との統合。本テスト機能で基盤検証後に着手。

---

## 6. 技術スタック（追記用）

> 使用する技術スタックをここに記入してください。（例: Next.js, Supabase, Prisma 等）

> **【実装追記 2026-07-22】 AI基盤**
> - **Vercel AI Gateway** ＋ `ai` パッケージ（v7系）。`"provider/model"` 文字列指定で自動ルーティング。
> - **認証は OIDC**（`VERCEL_OIDC_TOKEN`）。プロバイダ個別APIキー不要。ローカルはトークンが約24hで失効するため `vercel env pull .env.local` で再取得、本番デプロイでは自動更新。
> - **課金**: 各Vercelチームに月$5の無料クレジット（**カード登録が前提**）。無料枠で使えるモデルは限定的（`anthropic/claude-sonnet-4.6` / `openai/gpt-4o-mini` は可、`claude-haiku-4.5` / `claude-opus-4.8` は有料トップアップで解放）。
> - 疎通確認用スクリプト: `juku-system/scripts/ai-gateway-smoke.mjs`。


---

## 7. その他メモ
勤怠管理を追加すること

