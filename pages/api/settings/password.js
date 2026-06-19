import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

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
  const { newPassword } = req.body
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다' })
  const hash = createHash('sha256').update(newPassword).digest('hex')
  try {
    await supabase.from('settings').upsert([{ key: 'admin:password_hash', value: hash }], { onConflict: 'key' })
    res.status(200).json({ ok: true })
  } catch {
    res.status(500).json({ error: '변경 실패' })
  }
}
