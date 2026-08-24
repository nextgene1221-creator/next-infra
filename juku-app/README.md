# juku-app — ネイティブアプリシェル（Capacitor）

`juku-system`（本番 https://juku-system.vercel.app）を iOS / Android アプリとして配信するための
Capacitor プロジェクト。**画面は本番サイトをそのまま表示する**ので、Web 側を直せばアプリにも即反映される。
アプリ側で持つのはネイティブ機能だけ（プッシュ通知、QR スキャン、生体認証など）。

- appId: `jp.nextinfra.juku`
- 表示先: `capacitor.config.json` の `server.url`

## 現在の状態（2026-08-24）

| | 状態 |
|---|---|
| Capacitor プロジェクト | ✅ 作成済み |
| Android プロジェクト (`android/`) | ✅ 生成済み（`npx cap add android`） |
| iOS プロジェクト (`ios/`) | ⛔ **macOS が必要**。Windows では生成できない |
| プッシュ通知（FCM） | 🔶 コードは入っている。Firebase プロジェクトと `google-services.json` が未設定 |
| ストア配信 | ⛔ Apple Developer / Google Play Console のアカウントが未取得 |

Web 側の受け皿はすでに実装済み:
- `POST /api/push/subscribe`（`platform: "android" | "ios"` + `fcmToken`）
- `src/components/NativePushBridge.tsx` … アプリ内で開いたときだけ FCM トークンを登録する
- `src/lib/notify.ts` … FCM 送信（`FIREBASE_SERVICE_ACCOUNT` が入ると有効になる）

## セットアップに必要な、オーナー側の作業

1. **Firebase プロジェクトを作る**（無料）
   - Android アプリを追加（パッケージ名 `jp.nextinfra.juku`）→ `google-services.json` を
     `android/app/google-services.json` に置く
   - iOS アプリを追加 → `GoogleService-Info.plist` を `ios/App/App/` に置く
   - プロジェクト設定 → サービスアカウント → 新しい秘密鍵を生成 → JSON を丸ごと
     Vercel の環境変数 `FIREBASE_SERVICE_ACCOUNT` に入れる
2. **Google Play Console**（$25 買い切り）
3. **Apple Developer Program**（$99/年）＋ APNs 認証キー（.p8）を Firebase に登録

## ビルド手順

### Android（Windows で可）

Android Studio（＋ Android SDK）が必要。

```
cd juku-app
npx cap sync android
npx cap open android      # Android Studio が開く → Build > Generate Signed Bundle
```

### iOS（macOS が必要）

```
cd juku-app
npx cap add ios
npx cap sync ios
npx cap open ios          # Xcode が開く
```

Windows しかない場合は、GitHub Actions の macOS ランナーか Codemagic 等のクラウドビルドを使う。

## 注意: App Store の審査

Web サイトを包んだだけのアプリは Guideline 4.2（Minimum Functionality）で落ちる。
プッシュ通知に加えて、次のネイティブ機能を実装してから申請すること:

- QR スキャン（既存の入退室 QR をカメラで読む）
- 生体認証（Face ID / 指紋）でのログイン維持
- オフライン時の表示（`www/index.html` のフォールバック）
