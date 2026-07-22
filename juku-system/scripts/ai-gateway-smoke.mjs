// AI Gateway 疎通スモークテスト（使い捨て・生徒データ不使用）
// 実行: node scripts/ai-gateway-smoke.mjs
import { readFileSync } from 'node:fs'
import { generateText, gateway } from 'ai'

// .env.local を手動ロード（standalone スクリプトのため）
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
} catch (e) {
  console.error('!! .env.local 読み込み失敗:', e.message)
}

console.log('OIDC token present:', !!process.env.VERCEL_OIDC_TOKEN, '(len', (process.env.VERCEL_OIDC_TOKEN || '').length, ')')

async function main() {
  // 1) 利用可能モデル一覧（正しい現行slugを取得するため）
  try {
    const models = await gateway.getAvailableModels()
    const ids = (models.models || models).map((m) => m.id || m).filter(Boolean)
    console.log('\n=== 利用可能モデル数:', ids.length, '===')
    console.log('Claude系:', ids.filter((i) => i.includes('claude')).slice(0, 12))
    console.log('OpenAI系:', ids.filter((i) => i.startsWith('openai/')).slice(0, 8))
  } catch (e) {
    console.error('!! getAvailableModels 失敗:', e.statusCode || '', e.message)
  }

  // 2) 最小生成（PIIなし・接続確認のみ）
  const candidates = ['anthropic/claude-sonnet-4.6', 'anthropic/claude-haiku-4.5', 'openai/gpt-5.4']
  for (const model of candidates) {
    try {
      const { text, usage } = await generateText({
        model,
        prompt: 'Reply with exactly the two characters: OK',
      })
      console.log(`\n✅ 疎通OK [${model}] → "${text.trim()}" (tokens in/out:`, usage?.inputTokens ?? '?', '/', usage?.outputTokens ?? '?', ')')
      return
    } catch (e) {
      console.error(`\n❌ [${model}] status=${e.statusCode || '?'} : ${e.message?.split('\n')[0]}`)
    }
  }
  console.error('\n=> どのモデルでも疎通せず。上のエラーで原因判定します。')
  process.exitCode = 1
}

main()
