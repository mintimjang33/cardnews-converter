/**
 * /api/tools/keyword-volume
 * 네이버 검색광고 API — 연관 키워드 검색량 + 네이버 블로그 문서수 조회
 * Supabase에 저장 + 정렬 반환
 *
 * GET /api/tools/keyword-volume?keyword=썸네일
 *
 * 문서수(doc_count)는 아직 조회 안 된 키워드(null)만 새로 가져옵니다.
 * 환경변수: NAVER_CLIENT_ID / NAVER_CLIENT_SECRET
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
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64')
}

function encodeKeyword(kw) {
  return kw.split(' ').map(part => encodeURIComponent(part)).join('+')
}

function parseCount(val) {
  if (val === '< 10' || val === '<10') return 5
  return Number(val) || 0
}

// 네이버 블로그 문서수 조회 (개별)
async function fetchDocCount(keyword) {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/blog?query=${encodeURIComponent(keyword)}&display=1`,
      {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.total ?? null
  } catch {
    return null
  }
}

// 50개씩 배치 병렬 처리
async function fetchDocCountBatch(keywords) {
  const BATCH = 50
  const results = []
  for (let i = 0; i < keywords.length; i += BATCH) {
    const batch = keywords.slice(i, i + BATCH)
    const counts = await Promise.all(batch.map(kw => fetchDocCount(kw)))
    results.push(...counts)
  }
  return results
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { keyword, mode = 'all' } = req.query
  // mode: 'all'(기본) | 'keyword_only'(검색량만) | 'doc_only'(문서수만)
  if (!keyword) return res.status(400).json({ error: 'keyword 파라미터가 필요합니다' })

  // ── doc_only: 검색광고 API 없이 문서수만 채우기 ────────────────────
  if (mode === 'doc_only') {
    try {
      // doc_count가 null인 키워드만 DB에서 가져옴
      const { data: nullRows, error: fetchErr } = await supabase
        .from('keyword_stats')
        .select('keyword')
        .eq('hint', keyword)
        .is('doc_count', null)

      if (fetchErr) throw new Error(fetchErr.message)
      if (!nullRows || nullRows.length === 0) {
        return res.status(200).json({ keyword, mode, filled: 0, message: '모든 문서수 수집 완료' })
      }

      const nullKeywords = nullRows.map(r => r.keyword)
      const counts = await fetchDocCountBatch(nullKeywords)

      const updates = nullKeywords
        .map((kw, i) => ({ keyword: kw, doc_count: counts[i] }))
        .filter(u => u.doc_count != null)

      if (updates.length > 0) {
        for (const u of updates) {
          await supabase
            .from('keyword_stats')
            .update({ doc_count: u.doc_count })
            .eq('hint', keyword)
            .eq('keyword', u.keyword)
        }
      }

      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({
        keyword,
        mode,
        total_null: nullKeywords.length,
        filled: updates.length,
        still_null: nullKeywords.length - updates.length,
      })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // ── keyword_only / all: 검색광고 API 호출 ─────────────────────────
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
    // 1. 네이버 검색광고 API — 전체 키워드 검색량 조회
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
    }).sort((a, b) => b.total - a.total)

    // 2. 기존 doc_count 조회
    const keywordList = parsed.map(i => i.keyword)
    const { data: existing } = await supabase
      .from('keyword_stats')
      .select('keyword, doc_count')
      .eq('hint', keyword)
      .in('keyword', keywordList)

    const existingMap = {}
    ;(existing || []).forEach(row => { existingMap[row.keyword] = row.doc_count })

    let docCountMap = {}
    let fetchedCount = 0

    if (mode === 'all') {
      // all: doc_count null인 것만 새로 조회
      const needsDocCount = parsed.filter(item => existingMap[item.keyword] == null)
      fetchedCount = needsDocCount.length
      if (needsDocCount.length > 0) {
        const counts = await fetchDocCountBatch(needsDocCount.map(i => i.keyword))
        needsDocCount.forEach((item, i) => { docCountMap[item.keyword] = counts[i] })
      }
    }
    // keyword_only: doc_count 조회 없이 기존 값 유지

    // 3. upsert
    const withDocCount = parsed.map(item => ({
      ...item,
      doc_count: docCountMap[item.keyword] !== undefined
        ? docCountMap[item.keyword]
        : (existingMap[item.keyword] ?? null),
    }))

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
      mode,
      total_found: list.length,
      saved: withDocCount.length,
      doc_count_fetched: fetchedCount,
      doc_count_skipped: parsed.length - fetchedCount,
      results,
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
