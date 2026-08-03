# 修正・機能追加 TODO

このファイルは修正指示を上から順に記載するためのリストです。
完了したものは完了に移動させ、各項の番号を振りなおすように。
各項着手前に不明点などを確認すること。また各項完了後に中間報告をしpushすること

---

## 進行中

A. 面談まわり改修・LINE連携・週次面談シート（commit: 未コミット／push はユーザー指示待ち）

- **フェーズ1: 面談記録時の予定設定モーダル（実装完了・push待ち）**
  - 新規 `ClassDay`（授業日）モデル＋マイグレーション `20260615000000_add_class_days`
    - 自習(`study_schedule_days`)とは別概念。特定日付ベース（科目/担当講師/時間は任意）
  - API: `GET/POST /api/class-days`、`PUT/DELETE /api/class-days/[id]`
  - `MeetingPlanModal`（タブ: 学習進捗[読取] / 次週学習予定 / 授業日 / ゼミ予定）を面談記録フォームから起動
    - 次週学習予定 = 既存 `StudyScheduleEditor`（学習時間）を再利用
    - 授業日 = 新規 `ClassDayEditor`（「前回分を翌週にコピー」で初期値引き継ぎ）
    - ゼミ予定 = `SeminarManager` に `embedded` を追加して再利用
    - 次回面談予定は面談フォーム内に残置
- **フェーズ2: 週次面談シート（実装完了・push待ち / ブラウザ動作は要確認）**
  - `MeetingSheet` モデル＋マイグレーション `20260617000000_add_meeting_sheets`（Neon 適用済み）
  - API: `GET/POST /api/meeting-sheets`、`GET/PUT/DELETE /api/meeting-sheets/[id]`
  - 生徒: サイドバー「面談シート」→ 一覧 `/meeting-sheets`（今週分を生成・未提出リマインド）＋記入 `/meeting-sheets/[id]`
  - 面談予定日の参照: `lib/nextMeeting.ts`（面談タスク優先→面談記録の次回予定）。3日前から未提出タグ
  - 面談記録保存(POST /api/meetings)時、次回予定があれば面談タスク(type=面談)を自動生成
  - 講師/管理者: `MeetingPlanModal` に「週次シート」タブ（最新シートを読み取り表示）
  - 検証: 型(tsc)・Lint・本番ビルド(next build) クリア。実DBスモークテスト（CRUD/JSON往復/提出/次回面談タスク優先/削除）全PASS（`prisma/smoke-meeting-sheet.ts`）
  - 残: ブラウザでの実機UI確認 / push はユーザー指示待ち
  - 面談記録に任意で紐づく提出物。ゼミ・学習進捗等と重複する項目は含めない
  - 確定事項（2026-06-17）:
    - 記入者=生徒。週区切りなし。生成は生徒の「今週分を生成」ボタン
    - 締切=面談実施まで。未提出タグは面談予定日の3日前から表示（参照元=直近面談の次回面談予定）
    - 提出後も生徒が修正可（ロックなし）
    - 講師/管理者は面談モーダルの「週次シート」タブで閲覧（読取）
    - 項目は spec.md 5.9 を正とする（教材/予定/実績の表は削除＝学習進捗と同義）

  ### ▼ オーナー記入欄（週次面談シートの項目定義）
  ※ ここに項目を記入してください。記入後、内容を `spec.md` に正式セクションとして転記します（方針: 回答後 A=spec.md へ書き足す）。

  週次面談シート     
"このシートは、来週の勉強で迷わないための材料を集めるものです。
正しい答えを書く必要はありません。事実と、そのときどう感じたかだけ書いてください。"     
【1】基本情報     
氏名   面談日  
     
【2】今週の学習ログ(行動)     
Studyplusの記録をもとに、今週やったことを書き出してください。     
◆ 今週取り組んだ主な科目・単元     
教材名・範囲が具体的に伝わるように。※教材・予定は面談で書きます     
教材  予定  実績 
     
     
     
     
     
     
     
     
Newmonic     
◆ 今週の総学習時間  目標：　　　　　　　　時間  実績：　　　　　　　　時間 
◆ 今週の勉強の手応え     
□ かなりあった　□ 少しあった　 □ あまりなかった　□ ほぼなかった     
◆ 今週の計画外のタスク     
     
     
     
     
     
【3】予定と実績のズレ(判断)     
先週の面談で立てた予定と、実際にやったことを比べてください。     
◆ 予定と比べてどうでしたか？     
□ ほぼ予定通り □ 少しズレた □ 大きくズレた     
◆ 予定と違った理由     
（当てはまるものを全て選んで下さい。）     
□ 学習時間 ※実際に使えた時間　　（予定より多い / 予定より少ない）     
□ 学習量 ※問題数やページ　　（予定より多い / 予定より少ない）     
□ 内容の難易度　　（想定より重い / 想定より軽い）     
□ 他のタスクを優先した　　（課題./ 自分で追加したタスク / その他）     
□ 体調 □ 予定 □ 特になし   
     
◆ ズレの方向として近いものは？     
☐ 予定より進みすぎた　☐ 予定より進まなかった　     
☐ 進度は同じだが中身が違った ☐ まだ整理できていない     
◆ 来週も同じ条件なら、同じズレが起きそうですか？     
☐ 起きそう　☐ 起きなさそう　☐ 分からない     
◆ 補足があれば1行で     
（　　　　　　　　　　　　　　　　　　　　　　　　　　　　）     
     
【4】来週に向けて     
◆ 来週も続けたいこと     
□ ある（　　　　　　　　　　　　　　　　　　　　　　　　　） □ ない     
◆ 来週、変えたいこと     
□ ある（　　　　　　　　　　　　　　　　　　　　　　　　　） □ ない     
     
【5】メモ（相談したいこと・分からなかったことetc...）     
     
     
     
     
     
     
     
上記の内容をもとに面談し、迷わず進められる来週の計画を一緒に考えます。
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

24. AI基盤新設＋AI診断テスト（管理者）＝新規依頼①（第1段階） (2026-07-22, commit `未`)
    - オーナー方針: AI提供元＝**Vercel AI Gateway**、①②⑤を一括視野に入れつつ、まず**管理者テスト機能**として追加（生徒公開は後段）
    - 基盤: `ai` パッケージ（v7）導入。**OIDC認証**（`VERCEL_OIDC_TOKEN`）でプロバイダ個別キー不要。カード登録で月$5無料枠が解放（実測で疎通確認済み）
    - `/admin/ai-test`（**admin限定**・サイドバー「AI診断テスト」）: 生徒＋モデル選択→構造化診断を表示。**結果保存なし・生徒非公開**（使い捨て）
    - `POST /api/admin/ai-test`（admin限定）: 生徒プロフィール＋直近模試5件→`generateObject` で構造化出力（総評/志望校位置づけ[挑戦・実力相応・安全]/弱点科目/総合アドバイス）。志望校・模試とも未登録は422。⑤未整備のため**AI推論のみ**
    - モデル: 既定 `anthropic/claude-sonnet-4.6`（無料枠可）・`openai/gpt-4o-mini`（低コスト・無料枠可）。`claude-opus-4.8`/`claude-haiku-4.5` は**有料トップアップで解放**（無料枠は403）
    - 検証: `scripts/ai-gateway-smoke.mjs`（疎通）＋実データ形状モックで構造化出力PASS、`tsc --noEmit` PASS
    - `spec.md` 5.13 ＋ 6章（技術スタック）に実装追記
    - 未対応（本番①へ）: 生徒向けAI相談チャット公開、結果保存/履歴（`AspirationDiagnosis`）、⑤大学マスタ併用の半定量化、②出願戦略（予算・沖縄移動/宿泊費）統合

25. 管理者向けイントロダクションにサインアップURLを追加 (2026-07-22, commit `未`)
    - オーナー依頼: 新規ユーザーのサインアップURLを管理者向けイントロダクションに掲載
    - articles に **audience="admin"** を追加＝管理者のみ閲覧（非管理者は `{role,"both"}` フィルタに非該当で自動非表示）。`AUDIENCE_LABELS` に「管理者向け」、`ArticleEditor` の対象選択に「管理者向け」を追加
    - 記事「【管理者用】新規ユーザーのサインアップURL」を投入（`prisma/seed-admin-intro.ts`・冪等）。生徒 `/signup/student`・講師 `/signup/teacher`、初期PW `password123`、招待制復帰の手順を記載
    - 検証: 可視性（admin=表示/生徒・講師=非表示）実DBで確認、`tsc --noEmit` PASS

26. 大学データ⑤（クロール収集・追跡）＋出願戦略②（管理者テスト）＝受験支援クラスタ全実装 (2026-07-22, commit `未`)
    - オーナー方針: 「A（②実装）」＋「大学データもクローリングで集める形ですべて実装」
    - スキーマ: `University`/`UniversityAdmission`/`AdmissionRevision` 追加。マイグレーション `20260722000000_add_universities`（追加のみ）を**本番Neonへ適用済み**（`migrate deploy`）
    - ⑤クロール: `POST /api/admin/universities/crawl`（admin・maxDuration60）。URL fetch→HTMLテキスト化(`lib/universityCrawl.ts`)→Gateway `generateObject` で入試情報抽出→upsert。`contentHash` 差分検知で `AdmissionRevision` に変更履歴。検索 `GET /api/admin/universities`。UI `/admin/universities`（サイドバー「大学データ」）
    - ②戦略: `POST /api/admin/ai-test/strategy`（admin・結果非保存）。生徒＋模試＋予算＋⑤データ→本命/併願/滑り止め・日程衝突・**沖縄からの遠征費（往復航空¥40k・宿泊¥8k既定、まとめ遠征で最小化）**・リスク。`/admin/ai-test` に②タブ追加
    - 既存①診断ルートにも `maxDuration=60` 追加（Vercelタイムアウト対策）
    - 検証: 抽出品質フィクスチャPASS（琉球大学を正確抽出）、実サイトfetch OK、**認証付きE2E**（ログイン→クロール→検索→②戦略200/プラン5件・遠征2回・総額¥229k→①診断200）、`tsc --noEmit` PASS
    - 未対応（productionize）: ⑤の**自律定期監視Cron**（Hobby Cron2本上限で未接続→Pro化 or Cron統合）、SPA(JS描画)ページのヘッドレス取得、重要変更の講師アラート連携、生徒公開・結果保存

27. ①を会話式「志望校コンサル」へ進化 (2026-07-22, commit `未`)
    - オーナー要望: 一発診断ではなく、スタート=レコメンド／以降=会話で希望・条件を聞きながら志望校を絞り込むコンサル形式に
    - 会話API `POST /api/admin/ai-test/consult`（admin・maxDuration60・結果非保存）: 生徒プロフィール＋模試＋⑤大学データをシステムプロンプトに与え `generateText` で会話応答。「1〜2問ずつ聞き出しながら提案」「断定回避」
    - UI: `/admin/ai-test` ①タブを「志望校コンサル」に変更。レコメンド構造化カードをオープナー表示＋その下にチャット欄（Enter送信）。レコメンド本文を会話履歴の種として付与
    - 検証: 認証付きE2E多ターン会話PASS（心理学×九州国公立→条件反映＋聞き出し、私立/学費追加→継続）、`tsc --noEmit` PASS
    - 未対応: 生徒公開、会話ログ保存、ストリーミング表示

28. ②出願戦略も会話式ブラッシュアップへ (2026-07-22, commit `未`)
    - オーナー要望: ②も「最初におすすめ提示→生徒がフィードバック→会話でより良い戦略に」
    - 会話API `POST /api/admin/ai-test/strategy/consult`（admin・maxDuration60・結果非保存）: 生徒＋模試＋⑤大学データ＋費用前提を system に与え `generateText` で応答。更新プラン＋変化した費用感を返す
    - UI: ②タブの戦略カード下にチャット欄を追加（初回戦略要約を会話の種として付与、Enter送信）
    - 検証: 認証付きE2E PASS（初回6校→「予算20万・私立1校」で更新プランに調整）、`tsc --noEmit` PASS
    - 既知: AI応答のMarkdown表はチャットでpre-wrap表示（生表示）。将来marked導入で整形可

29. ⑤大学データの定期追跡（自動再クロール・A案 GitHub Actions） (2026-07-22, commit `未`)
    - オーナー方針: 「A（GitHub Actions）で無料範囲に収まるよう頻度調整」
    - 共通化: `lib/universityCrawl.ts` に `crawlAndStore()`（fetch→抽出→差分upsert→履歴）。手動crawlルートも同関数を使うよう簡素化
    - 定期API `POST /api/cron/recrawl-universities`（`CRON_SECRET`保護・maxDuration60）: 最も古いsourceUrlを1件だけ再クロール→`done`まで外部ループ。抽出は安価な `gpt-4o-mini`。全admissionの`lastCrawledAt`更新で巡回の進行を保証（無限ループ防止）
    - 変更検知(新規/更新)時は**管理者へアラート**（`Alert` type=general、概要＋出所URL）
    - スケジューラ `.github/workflows/recrawl-universities.yml`: **週1回（月曜03:23 JST）**＋手動実行。done まで curl ループ
    - `CRON_SECRET` を Vercel(prod/preview/dev)へ登録済み。**GitHub Secretは要手動追加**（Settings→Secrets→Actions）
    - 検証: 認証(401×2)・巡回(done:false→再クロール)・完了(done:true) 実DBでE2E PASS、`tsc --noEmit` PASS
    - 頻度/コスト: 週1・gpt-4o-mini・1URL/呼び出しで、GitHub Actions無料枠・Gateway無料$5/月に収まる想定
    - 未対応: SPA(JS描画)のヘッドレス取得、担当講師への個別通知

30. 「担当＝佐藤駿」自動割当バグ修正（担当講師を任意化） (2026-08-03, commit `未`)
    - 症状: 生徒の進捗などの担当者が全部「佐藤駿」。原因は meetings/progress/tasks API の `teacher.findFirst()`（並び順なし＝最古の講師=佐藤駿）フォールバック。管理者が作成した記録が全て佐藤駿に割当られていた（進捗170件・Task1件。StudentAssignmentデータ自体は正常）
    - スキーマ: `ProgressRecord`/`Meeting`/`Task` の `teacherId` を任意(nullable)化。マイグレーション `20260803000000_teacher_optional_on_records`（NOT NULL解除のみ・既存非破壊）を本番Neon適用済み
    - コード: 3ルートの findFirst フォールバックを廃止し、講師でない作成者は担当なし(null)に。表示は全箇所 `teacher?.user.name ?? "—"` に null 安全化（progress/meetings/tasks/students詳細/report/goals/dashboard/MeetingRecords/TaskCompleteCheckbox）。アラート(check-all/check-meetings)も担当null時はスキップ/「担当なし」表記
    - 検証: admin作成の進捗が teacherId=null になること・/progress が描画されることをローカルE2E PASS、`tsc --noEmit` PASS
    - データ後始末: `prisma/cleanup-sato-teacher.ts` を**デプロイ後に実行済み(2026-08-04)** → 進捗170件＋Task1件を担当なし(null)化、佐藤駿ひもづき0件。本番 /progress・/students/[id]・/tasks・/meetings が200描画を確認
    - デプロイ: push認証(gh を nextgene1221-creator へ再ログイン)解消 → `0d98c12..308fb19` push → 本番反映済み（26.AI再クロールも同時デプロイ）
