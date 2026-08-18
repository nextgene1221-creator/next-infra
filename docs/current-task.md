# 直近の作業状態（current-task）

> `docs/playbook.md` §7 セッション再開手順で 2 番目に読むファイル。
> 「いま何をしているか」と「このセッションの特例ルール」を 1 画面で復元するためのもの。中期のロードマップは playbook §5、オーナー指示の一覧は `docs/todo.md`。

最終更新: 2026-08-18

---

## ⚠️ セッション特例ルール（解除されるまで有効）

- ~~今回の修正指示群は push しない~~ → **2026-08-18 にオーナー指示で解除。commit `7eae25a` を push 済み**。以降は playbook §1 の標準ルール（各項完了後にコミット→push）に戻る。
- **修正指示を受けたら、実装前に「理解と対応方針」をまとめたファイルを作成し、オーナーの確認を取ってから実装に入る。**（オーナー指示 2026-08-18 / playbook §1 に恒久ルールとして記載）
  - 本セッションの該当ファイル: `docs/understanding-2026-08-18.md`
- 標準ルール（各項完了後に push）は `docs/todo.md` 冒頭および playbook §1 に記載。特例が解除されたらそちらに戻る。

---

## いま進めていること

**プレイブック基盤の新設**（本セッションの主タスク / オーナー指示）

- [x] `docs/playbook.md` 新設（他プロジェクト Bloxy の運用書を本プロジェクト向けに再構成）
- [x] `docs/current-task.md` 新設（本ファイル）
- [x] `docs/questions-for-owner.md` 新設
- [x] ルート `CLAUDE.md` 新設（playbook を毎セッション参照させる）
- [x] `juku-system/CLAUDE.md` に参照行を追記
- [x] 参照パスの実在チェック（全 16 パス OK。ドキュメントのみの変更のため tsc/lint/build は対象外）

決定事項（オーナー回答 2026-08-18）:
- 周辺ファイルは playbook + questions-for-owner + current-task の 3 本に絞る（todo.md / backlog.md / spec.md / CHANGELOG_AI.md は既存を流用、二重持ちしない）
- 評価委員会は塾向けに 6 視点へ再定義（塾長・運営 / 講師 / 生徒・保護者 / エンジニア / セキュリティ・個人情報 / Red Team）
- `/loop` 自走運用と自己停止条件は playbook に含める
- CLAUDE.md はルート新規作成＋既存 `juku-system/CLAUDE.md` にも追記

---

## 環境の状態（2026-08-18 時点）

| 項目 | 状態 |
|---|---|
| GitHub (`gh`) | ✅ アクティブアカウントを `mijicana` → `nextgene1221-creator` に切替済み |
| git 認証 | ✅ Credential Manager → `gh auth setup-git` で gh 経由に変更。`git push --dry-run` 成功、リポジトリ権限 `admin: true` |
| git ブランチ | `main` は `origin/main` と同期済み。未 push コミットなし |
| 作業ツリー | 未追跡ファイル 4 件のみ（Q6 参照） |
| Vercel CLI | ✅ **`nextgene1221-7001` / nextgene1221@gmail.com** でログイン済み。team `team_ZufjHN9Rlu81uTUFzFFIp77j` = リンク先と一致、`juku-system` 参照可（本番 https://juku-system.vercel.app）→ Q1 解決 |
| コミット著者 | `satoshun <s.makara0820@gmail.com>` のまま維持（Q4 回答=一貫性重視で確定） |

---

## 修正指示 B-1〜B-10（2026-08-18 受領）— **全 10 項目 完了・push 済み** (commit `7eae25a`)

| # | 内容 | 状態 |
|---|---|---|
| B-1 | 出願思考（生徒項目） | ✅ 完了 |
| B-2 | 志望校立地（生徒項目） | ✅ 完了 |
| B-3 | 出願戦略AIの構造変更＋①の伸ばしたい科目削除 | ✅ 完了 |
| B-4 | ゼミ管理の完了取り消し | ✅ 完了 |
| B-5 | 当日プリント一覧＋完了登録 | ✅ 完了 |
| B-6 | 参考書ルート（テンプレート） | ✅ 完了 |
| B-7 | 模試マスタ | ✅ 完了 |
| B-8 | 生徒一覧の面談日順ソート | ✅ 完了 |
| B-9 | 給与計算 | ✅ 完了 |
| B-10 | QR 外部ブラウザ＋ログイン後復帰 | ✅ 完了 |

検証（playbook §8）: `tsc --noEmit` ✅ / `next build` ✅（92ページ）/ `npm run lint` は **14 errors・8 warnings ＝ 作業開始時と同数**（新規エラー 0）。

### 残作業

1. **ブラウザ実機確認**（全項目未実施）。ローカルは `cd juku-system && npm run dev` → http://localhost:3000 、`test-admin@dev.local` / `test1234`
   - ⚠️ ローカルの `DATABASE_URL` は**本番 Neon と同じ**（Q7）。操作は本番データに反映されるので注意
2. **模試マスタの移行スクリプト**（未実行）: `npx tsx prisma/seed-mock-exams.ts`
   - 既存 `examName` をマスタへ投入し、完全一致のみ自動紐付け。表記ゆれ候補は提示のみ
3. **本番デプロイの確認**: push により Vercel が自動デプロイ。`https://juku-system.vercel.app` で疎通を見る
---
## Q1〜Q6 の処理結果（2026-08-18）

| Q | 状態 | 結果 |
|---|---|---|
| Q1 Vercel アカウント | ✅ 解決 | `nextgene1221-7001` / nextgene1221@gmail.com でログイン成功。team がリンク先と一致、`juku-system` 参照可 |
| Q2 週次面談シート→spec.md | ✅ 完了済みだった | spec.md §5.9 に 2026-06-17 時点で転記済み。実装 `lib/meetingSheet.ts` と**差分なし**を確認。todo.md 側の生テキストは削除しポインタ化 |
| Q3 push 方針 | ✅ 確定 | push しない |
| Q4 コミット著者 | ✅ 確定 | 変更しない（一貫性重視） |
| Q5 進行中 A の実態 | ✅ 整理完了 | A は push 済みだった。完了 31 へ移動＋完了 24〜30 の `commit 未` を実ハッシュに訂正 |
| Q6 未追跡ファイル | 🔶 一部完了 | `.gitignore` に `CHANGELOG_AI.md` / `sample-deletion-snapshot-*.json` を追加。JSON は**テストデータで実個人情報なし**を確認。docs 2 件のコミットは push 方針のため保留 |

---

## 次にやること

**実装側にブロッカーはありません。** すべてオーナー判断待ちです。

1. 内容を確認して問題なければ **push の指示**（本セッションは push しない特例で運用中）
2. **本番 Neon へのマイグレーション適用 4 本**の可否（playbook §3 のオーナー判断送り）
3. **ブラウザ実機確認**（オーナー側でのローカルテスト）

実機確認で不具合が出た場合はそのまま修正に入ります。
