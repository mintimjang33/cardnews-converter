import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try { return createClient(url, key) } catch { return null }
}

// 오늘 날짜 키 (KST)
function todayKey() {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

// 비용 계산 (GPT-4o-mini 기준, USD)
function calcCost(inputTokens, outputTokens) {
  return (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.60
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const supabase = getSupabase()

  // 1. 기능 활성화 여부 확인
  if (supabase) {
    const { data: rows } = await supabase.from('settings').select('key, value')
      .in('key', ['site:spelling_on', 'site:spelling_limit'])
    const map = {}
    for (const r of rows || []) map[r.key] = r.value
    if (map['site:spelling_on'] === false) {
      return res.status(403).json({ error: '맞춤법 검사 기능이 비활성화 상태입니다.' })
    }

    // 2. 일일 한도 확인
    const limitKRW = map['site:spelling_limit'] ?? 10000
    const today = todayKey()
    const { data: usage } = await supabase.from('spelling_usage')
      .select('cost_usd').eq('date', today).single()
    const usedUSD = usage?.cost_usd ?? 0
    const usedKRW = usedUSD * 1400
    if (usedKRW >= limitKRW) {
      return res.status(429).json({ error: `오늘 한도(${limitKRW.toLocaleString()}원)에 도달했습니다. 내일 다시 이용해주세요.` })
    }
  }

  const { text } = req.body
  if (!text || typeof text !== 'string') return res.status(400).json({ error: '텍스트가 없습니다.' })
  if (text.length > 300) return res.status(400).json({ error: '300자를 초과할 수 없습니다.' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' })

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        messages: [
          {
            role: 'system',
            content: `당신은 한국어 맞춤법·띄어쓰기 교정 전문가입니다.
사용자가 입력한 텍스트를 교정하고 반드시 아래 JSON 형식으로만 응답하세요. 다른 말은 절대 하지 마세요.
{
  "corrected": "교정된 전체 텍스트",
  "changes": [
    { "original": "틀린 표현", "fixed": "바른 표현", "reason": "이유" }
  ]
}
변경사항이 없으면 changes는 빈 배열로 반환하세요.`
          },
          { role: 'user', content: text }
        ]
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'OpenAI 오류')

    const inputTokens = data.usage?.prompt_tokens ?? 0
    const outputTokens = data.usage?.completion_tokens ?? 0
    const costUSD = calcCost(inputTokens, outputTokens)

    // 비용 누적 저장
    if (supabase) {
      const today = todayKey()
      await supabase.from('spelling_usage').upsert(
        { date: today, cost_usd: costUSD, call_count: 1 },
        { onConflict: 'date', ignoreDuplicates: false }
      )
      // 누적 업데이트
      await supabase.rpc('increment_spelling_usage', { p_date: today, p_cost: costUSD })
        .catch(() => {
          // RPC 없으면 직접 업데이트
          supabase.from('spelling_usage')
            .select('cost_usd, call_count').eq('date', today).single()
            .then(({ data: cur }) => {
              supabase.from('spelling_usage').upsert({
                date: today,
                cost_usd: (cur?.cost_usd ?? 0) + costUSD,
                call_count: (cur?.call_count ?? 0) + 1,
              }, { onConflict: 'date' })
            })
        })
    }

    const raw = data.choices?.[0]?.message?.content ?? ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    res.status(200).json({ ...result, costKRW: Math.round(costUSD * 1400) })
  } catch (err) {
    res.status(500).json({ error: '교정 중 오류가 발생했습니다: ' + err.message })
  }
}
