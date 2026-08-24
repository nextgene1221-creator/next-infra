# アプリ化 移行計画（C-4 / 2026-08-24 起案）

> オーナー指示: 「アプリ化を開始したい。Web アプリでは通知に限界があるため。順次移行を開始」
> 本ファイルは方針の検討・決定・進捗を置く場所。決定が必要な項目は `docs/questions-for-owner.md` Q8 に立てる。

---

## 0. まず前提の確認（現状の通知はどうなっているか）

コードを読んで確認した事実:

| 通知 | 実装 | 宛先 | トリガ |
|---|---|---|---|
| 朝通知（今日の授業・面談） | `lib/lineNotify.ts` `sendMorningNotifications()` | **生徒**（LINE 連携済みのみ） | Vercel Cron `0 0 * * *` UTC = **9:00 JST** |
| 夜通知 | `lib/lineNotify.ts` `sendEveningNotifications()` | **生徒**（同上） | `/api/study-room/auto-checkout` の cron `0 13 * * *` UTC = **22:00 JST** から呼ばれる |
| 面談アラート | `components/MeetingAlertPoller.tsx` | 画面を開いている人 | **ブラウザのポーリング**（アプリを閉じていると届かない） |
| その他（シフト・プリント・タスク） | 通知なし。画面を見に行く運用 | — | — |

**つまり「通知の限界」の中身は次の 3 つ**:

1. **講師・管理者への通知手段が事実上ない**。面談アラートは画面を開いている間だけ。
2. **生徒向けは LINE のみ**。LINE を見ない生徒には届かない。また LINE 公式アカウントの
   無料枠（月 200 通）を超える送信量になっているはずで、**課金状況の確認が必要**（生徒 60 名 × 朝夜 ≒ 月 3,600 通）。
3. **ブラウザを閉じている間に届く仕組みが無い**。これがオーナーの言う「Web アプリの限界」。

→ アプリ化の主目的は **「アプリを閉じていても、講師・管理者・生徒に届く通知」** と整理する。

---

## 1. 選択肢の比較

| | A. PWA + Web Push | B. Capacitor（Web をネイティブで包む） | C. React Native / Expo で作り直し | D. アプリ化せず LINE を強化 |
|---|---|---|---|---|
| 通知（Android/PC） | ◎ | ◎ | ◎ | ○（LINE 依存） |
| 通知（iPhone） | △ **ホーム画面に追加した人だけ**（iOS 16.4+） | ◎ APNs でネイティブ通知 | ◎ | ○ |
| ストア配信 | ✕ | ◎ | ◎ | ✕ |
| 既存画面の作り直し | 不要 | **不要**（同じ Web を表示） | **全画面必要** | 不要 |
| 実装コスト | 小 | 中 | 特大 | 小 |
| 外部費用 | **¥0** | Apple Developer **$99/年** ＋ Google Play **$25 買い切り**（FCM は無料） | 同左 ＋ EAS 等 | LINE 有料プラン（要確認） |
| 段階移行のしやすさ | — | ◎ 画面単位でネイティブ化できる | ✕ 一括 | — |

**推奨: A を先に入れてから B。C は採らない。**
**→ オーナー回答 (2026-08-24): 「すぐ Capacitor でストアアプリ化」「配布対象は講師・管理者＋生徒・保護者」「VAPID の本番 env 追加は実行可」。
これを受け、A（Phase 0-1）は Capacitor でも必要な土台なので先に完成させ、続けて Phase 2 に入る。**

- A（PWA + Web Push）は **費用 0 で、B に進んでも一切無駄にならない**。
  通知の「何を・誰に・いつ送るか」を作る部分は A も B も共通で、そこが本体だから。
- B（Capacitor）は既存の Next.js 画面をそのまま表示するので、**画面の作り直しが要らない**。
  ストア審査（App Store Guideline 4.2「ただのWebサイトのガワ」は落ちる）対策として、
  プッシュ通知に加えて **QR スキャン・生体認証ログイン** をネイティブ実装する。
- C は全画面の再実装が必要で、今の開発リソースに見合わない。

---

## 2. フェーズ計画

### Phase 0 — PWA の土台（費用 ¥0 / 依存なし）

- `public/manifest.webmanifest`、アプリアイコン（192/512）、`theme_color`
- Service Worker 登録（オフライン時のフォールバック画面、静的アセットのキャッシュ）
- 「ホーム画面に追加」の案内導線（iOS は Safari の共有メニューからしか追加できないため説明が要る）

**効果**: ホーム画面から全画面で起動する。iPhone で Web Push を受け取るための**前提条件**でもある。

### Phase 1 — 通知ハブ ＋ Web Push（費用 ¥0）

- `push_subscriptions` テーブル（user_id / endpoint / keys / device / created_at）
- VAPID 鍵を生成し、`web-push` パッケージで送信（**Vercel の環境変数追加が必要 → オーナー判断**）
- **通知ハブ `lib/notify.ts` を新設**: 「誰に・何を送るか」を 1 か所にまとめ、
  LINE と Web Push の両方に同じイベントを流す。既存の `lineNotify.ts` はこのハブから呼ぶ形に寄せる。
- 通知イベントの第一弾（講師・管理者向けが手薄なので、そこから）:
  - 面談リマインド（当日朝／30 分前）
  - 退勤打刻の押し忘れ（当日 23:00 に未退勤なら本人へ）
  - 当日プリントの未完了（夕方）
  - 生徒側は既存の朝／夜通知を LINE と Push の両方へ

**効果**: Android・PC は即座にアプリを閉じていても通知が届く。iPhone もホーム画面追加済みなら届く。

### Phase 2 — Capacitor でストアアプリ化（**外部費用が発生 → オーナー判断**）

- Capacitor プロジェクトを `juku-app/` として追加。本番 URL を表示するシェル
- `@capacitor/push-notifications` で FCM（Android）／APNs（iOS）
- ストア審査対策のネイティブ機能: QR スキャン（既存の入退室 QR）、生体認証ログイン、オフライン閲覧
- TestFlight / 内部テストで講師に配布 → 問題なければ一般公開

### Phase 3 — 使用頻度の高い画面から順にネイティブ化

出退勤打刻 → 当日プリント → 面談シート の順。Web 版は残したまま並走させる。

---

## 3. オーナー判断が必要なもの（→ `docs/questions-for-owner.md` Q8）

1. **ストア費用を出すか**: Apple Developer $99/年 ＋ Google Play $25 買い切り。出さないなら Phase 1 までで止める
2. **配布対象**: 講師・管理者だけか、生徒・保護者も入れるか。
   生徒・保護者を入れる場合、**未成年の個人情報をストア配布アプリに載せる**ことになり、
   プライバシーポリシーの掲示・Apple の「子ども向けApp」区分の判断が必要（playbook §2 セキュリティ視点）
3. **LINE 通知の課金状況**: 現在の送信量が無料枠（月 200 通）を超えていないか。
   超えているなら請求が発生しているはずなので、実績の確認が必要
4. **Vercel 環境変数の追加可否**（VAPID 公開鍵・秘密鍵）: playbook §3 の「本番環境の設定変更」に該当

---

## 4. 進捗

| Phase | 状態 | メモ |
|---|---|---|
| Phase 0 PWA 土台 | ✅ 完了 | manifest / アイコン / Service Worker / ホーム画面追加の案内 |
| Phase 1 通知ハブ + Web Push | ✅ 完了・本番反映済み | `lib/notify.ts` / `push_devices` / `/account/notifications` / 講師・管理者向け通知 3 種 |
| Phase 2 Capacitor | 🔶 進行中 | プロジェクトと Android 側は作成済み。**Firebase / ストアアカウント / macOS が未** |
| Phase 3 画面のネイティブ化 | 未着手 | — |

### Phase 0 / 1 でできたこと（2026-08-24）

- `public/manifest.webmanifest`・`icon-192/512.png`・`apple-touch-icon.png`・`sw.js`
  → ホーム画面に追加してアプリのように起動できる。iPhone で Web Push を受けるための前提も満たした
- `push_devices` / `notification_logs` テーブル（本番 Neon 適用済み）
- **通知ハブ `src/lib/notify.ts`** … web / fcm / line を 1 つの関数から出し分ける。
  `dedupeKey` の unique 制約で二重送信を防ぐ
- `/account/notifications` … 端末ごとの ON/OFF、テスト送信、登録端末一覧、最近の通知
- **講師・管理者向け通知 3 種**（既存 cron に相乗り。Hobby の Cron 2 本制限のため）
  - 9:00 今日の予定（シフト・面談）
  - 22:00 退勤打刻の押し忘れ
  - 22:00 今日のプリント未完了（管理者へ件数のみ。ロック画面に生徒名を出さない）
- Vercel に `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` を登録（Production / Preview / Development）

### Phase 2 の残りと、オーナー側でしかできない作業

| # | 作業 | 誰が | 費用 |
|---|---|---|---|
| 1 | **Firebase プロジェクト作成** → `google-services.json` 配置 ＋ サービスアカウント JSON を `FIREBASE_SERVICE_ACCOUNT` に登録 | オーナー（Google アカウントが要る） | 無料 |
| 2 | **Google Play Console 登録** | オーナー（本人確認・支払い） | **$25 買い切り** |
| 3 | **Apple Developer Program 登録** ＋ APNs 認証キー (.p8) 発行 | オーナー（Apple ID・支払い） | **$99/年** |
| 4 | **iOS プロジェクトの生成とビルド** | **macOS が必要**（この PC は Windows のため不可）。Mac が無ければ GitHub Actions の macOS ランナー / Codemagic 等のクラウドビルド | ビルド環境による |
| 5 | Android のビルド | Android Studio + SDK のインストールが必要（この PC には未インストール） | 無料 |
| 6 | 審査対策のネイティブ機能（QR スキャン・生体認証） | 開発側 | 無料 |
| 7 | **プライバシーポリシーの用意**（生徒・保護者を配布対象に含めるため必須。未成年の情報を扱う旨・Apple の「子ども向け App」区分の判断） | オーナー＋開発 | 無料 |

**1〜3 が揃うまでアプリはストアに出せない**。それまでは Web + PWA + Web Push で運用できる状態になっている。
