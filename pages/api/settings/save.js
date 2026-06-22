import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = req.headers['x-admin-token']
  if (!process.env.ADMIN_SECRET_TOKEN || token !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(401).json({ error: '인증 실패' })
  }
  const { cooldown, adsOn, spellingOn, spellingLimit, terms, privacy, termsEn, privacyEn, adSlots } = req.body
  try {
    const rows = []
    if (cooldown !== undefined)  rows.push({ key: 'site:cooldown',    value: cooldown })
    if (adsOn !== undefined)        rows.push({ key: 'site:ads_on',       value: adsOn })
    if (spellingOn !== undefined)   rows.push({ key: 'site:spelling_on',  value: spellingOn })
    if (spellingLimit !== undefined)rows.push({ key: 'site:spelling_limit',value: spellingLimit })
    if (terms !== undefined)     rows.push({ key: 'site:terms',       value: terms })
    if (privacy !== undefined)   rows.push({ key: 'site:privacy',     value: privacy })
    if (termsEn !== undefined)   rows.push({ key: 'site:terms_en',    value: termsEn })
    if (privacyEn !== undefined) rows.push({ key: 'site:privacy_en',  value: privacyEn })
    if (adSlots !== undefined)   rows.push({ key: 'site:ad_slots',    value: adSlots })
    if (rows.length === 0) return res.status(400).json({ error: '저장할 데이터 없음' })
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' })
    if (error) throw error
    res.status(200).json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'DB 저장 실패' })
  }
}
