/**
 * /api/tools/keyword-volume
 * 네이버 검색광고 API — 연관 키워드 검색량 + 네이버 블로그 문서수 병렬 조회
 * Supabase에 저장 + 정렬 반환
 *
 * 사용법:
 *   GET /api/tools/keyword-volume?keyword=썸네일&limit=20
 *
 * 문서수 조회는 네이버 오픈API (블로그 검색) 를 사용합니다.
 * 환경변수에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 을 추가해야 합니다.
 * (네이버 개발자센터 https://developers.naver.com 에서 "검색" API 앱 등록 후 발급)
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

// 네이버 블로그 검색 API로 문서수 조회
async function fetchDocCount(keyword) {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const url = `https://openapi.naver.com/v1/search/blog?query=${encodeURIComponent(keyword)}&display=1`
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.total ?? null
  } catch {
    return null
  }
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

    // 상위 limit개 키워드에 대해 문서수 병렬 조회
    const topParsed = parsed
      .sort((a, b) => b.total - a.total)
      .slice(0, Number(limit))

    const docCounts = await Promise.all(
      topParsed.map(item => fetchDocCount(item.keyword))
    )

    const withDocCount = topParsed.map((item, i) => ({
      ...item,
      doc_count: docCounts[i],
    }))

    // Supabase 저장 (keyword_stats 테이블 — doc_count 컬럼 추가 필요)
    // alter table keyword_stats add column if not exists doc_count bigint;
    if (withDocCount.length > 0) {
      const { error: dbError } = await supabase
        .from('keyword_stats')
        .upsert(withDocCount, { onConflict: 'hint,keyword' })

      if (dbError) console.error('Supabase 저장 오류:', dbError.message)
    }

    const results = withDocCount.map(({ hint, ...rest }) => rest)

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({
      keyword,
      total_found: list.length,
      saved: withDocCount.length,
      results,
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
