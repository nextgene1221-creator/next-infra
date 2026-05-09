// 公開サインアップ画面のレイアウト（認証不要、サイドバーなし）
export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-center text-2xl font-bold text-dark mb-2">Next infra</h1>
        <p className="text-center text-sm text-charcoal mb-8">新規登録</p>
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-md text-sm mb-6">
          このページは塾の運営側がシステム導入のため一時的に開放している登録窓口です。
          登録後、初期パスワードは <code className="bg-white/60 px-1 rounded font-mono">password123</code> です。
          ログイン後はサイドバーの「パスワード変更」から変更してください。
        </div>
        {children}
      </div>
    </div>
  );
}
