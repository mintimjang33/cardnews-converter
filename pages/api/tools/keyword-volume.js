/**
 * /api/tools/keyword-volume
 * 네이버 검색광고 API — 연관 키워드 전체를 Supabase에 저장 + 정렬 반환
 *
 * 사용법:
 *   GET /api/tools/keyword-volume?keyword=썸네일&limit=20
 */

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://api.searchad.naver.com'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function makeSignature(timestamp, method, path, secretKey) {
  const message = `${timestamp}.${method}.${path}`
  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64')
}

function encodeKeyword(kw) {
  return kw.split(' ').map(part => encodeURIComponent(part)).join('+')
}

function parseCount(val) {
  if (val === '< 10' || val === '<10') return 5
  return Number(val) || 0
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { keyword, limit = '30' } = req.query
  if (!keyword) return res.status(400).json({ error: 'keyword 파라미터가 필요합니다' })

  const apiKey     = process.env.NAVER_AD_API_KEY
  const secretKey  = process.env.NAVER_AD_SECRET_KEY
  const customerId = process.env.NAVER_AD_CUSTOMER_ID

  if (!apiKey || !secretKey || !customerId) {
    return res.status(500).json({ error: '환경변수 누락' })
  }

  const path = '/keywordstool'
  const method = 'GET'
  const timestamp = Date.now().toString()
  const signature = makeSignature(timestamp, method, path, secretKey)

  const encoded = encodeKeyword(keyword)
  const requestUrl = `${BASE_URL}${path}?hintKeywords=${encoded}&showDetail=1`

  try {
    const response = await fetch(requestUrl, {
      method,
      headers: {
        'X-Timestamp': timestamp,
        'X-API-KEY':   apiKey,
        'X-Customer':  customerId,
        'X-Signature': signature,
        'Content-Type': 'application/json',
      },
    })

    const rawText = await response.text()
    if (!response.ok) return res.status(response.status).json({ error: `네이버 API 오류: ${rawText}` })

    const data = JSON.parse(rawText)
    const list = data.keywordList || []

    // 파싱
    const parsed = list.map(item => {
      const pc     = parseCount(item.monthlyPcQcCnt)
      const mobile = parseCount(item.monthlyMobileQcCnt)
      return {
        hint:        keyword,
        keyword:     item.relKeyword,
        pc,
        mobile,
        total:       pc + mobile,
        competition: item.compIdx || '-',
      }
    })

    // Supabase 저장 (같은 hint+keyword 조합은 upsert로 덮어쓰기)
    if (parsed.length > 0) {
      const { error: dbError } = await supabase
        .from('keyword_stats')
        .upsert(parsed, { onConflict: 'hint,keyword' })

      if (dbError) console.error('Supabase 저장 오류:', dbError.message)
    }

    // total 기준 내림차순 정렬 후 limit개 반환
    const results = parsed
      .sort((a, b) => b.total - a.total)
      .slice(0, Number(limit))
      .map(({ hint, ...rest }) => rest) // hint 필드는 응답에서 제외

    res.setHeader('Cache-Control', 'no-store') // 저장 후엔 캐시 안 함
    return res.status(200).json({
      keyword,
      total_found: list.length,
      saved: parsed.length,
      results,
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
