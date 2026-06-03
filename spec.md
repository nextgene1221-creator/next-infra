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

---

## 6. 技術スタック（追記用）

> 使用する技術スタックをここに記入してください。（例: Next.js, Supabase, Prisma 等）


---

## 7. その他メモ
勤怠管理を追加すること

