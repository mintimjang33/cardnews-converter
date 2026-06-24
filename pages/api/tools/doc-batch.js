/**
 * /api/tools/doc-batch
 * 전체 hint에 걸쳐 doc_count=null인 키워드를 우선순위에 따라 일괄 수집
 *
 * GET  → 현재 상태 조회 (오늘 사용량, hint별 미수집 현황)
 * POST → 한 배치 실행 (최대 chunk개, 일일 한도 내)
 *   body: { chunk?: number, priority?: 'search_volume'|'null_ratio'|'hint_order' }
 *
 * 일일 한도: NAVER_BLOG_DAILY_LIMIT (기본 25000)
 * 오늘 사용량은 Supabase doc_batch_log 테이블에 기록
 *
 * doc_batch_log 테이블 DDL (없으면 자동 생성 불가 — Supabase에서 수동 생성):
 * CREATE TABLE IF NOT EXISTS doc_batch_log (
 *   date     text PRIMARY KEY,
 *   used     integer DEFAULT 0,
 *   updated_at timestamptz DEFAULT now()
 * );
 */

import { createClient } from '@supabase/supabase-js'

/** 현재 시각을 KST(UTC+9) 기준 ISO 문자열로 반환 */
function nowKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DAILY_LIMIT = parseInt(process.env.NAVER_BLOG_DAILY_LIMIT || '25000', 10)
const DEFAULT_CHUNK = 50
const MAX_CHUNK = 200

function todayStr() {
  return nowKST().slice(0, 10)
}

// 오늘 사용량 조회
async function getTodayUsed() {
  try {
    const { data } = await supabase
      .from('doc_batch_log')
      .select('used')
      .eq('date', todayStr())
      .single()
    return data?.used || 0
  } catch { return 0 }
}

// 오늘 사용량 증가
async function addTodayUsed(count) {
  const today = todayStr()
  try {
    // upsert: 있으면 누적, 없으면 새로 생성
    const { data: existing } = await supabase
      .from('doc_batch_log')
      .select('used')
      .eq('date', today)
      .single()

    const newUsed = (existing?.used || 0) + count
    await supabase
      .from('doc_batch_log')
      .upsert({ date: today, used: newUsed, updated_at: nowKST() }, { onConflict: 'date' })
    return newUsed
  } catch (e) {
    console.error('doc_batch_log 업데이트 오류:', e.message)
    return count
  }
}

// 네이버 블로그 문서수 조회 (재시도 1회)
async function fetchDocCount(keyword, retryOnFail = true) {
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
        signal: AbortSignal.timeout(8000),
      }
    )
    if ((res.status === 429 || res.status >= 500) && retryOnFail) {
      await new Promise(r => setTimeout(r, 1500))
      return fetchDocCount(keyword, false)
    }
    if (!res.ok) return null
    const data = await res.json()
    return data.total ?? null
  } catch { return null }
}

// concurrency 제한 병렬 처리
async function fetchBatch(keywords, concurrency = 8) {
  const results = new Array(keywords.length).fill(null)
  let idx = 0
  async function worker() {
    while (idx < keywords.length) {
      const i = idx++
      results[i] = await fetchDocCount(keywords[i])
      await new Promise(r => setTimeout(r, 60)) // 60ms 간격
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, keywords.length) }, () => worker()))
  return results
}

// hint별 미수집 현황 + 우선순위 정렬
async function getNullSummary(priority = 'search_volume') {
  // hint별 null 키워드 수 및 총 검색량 합계
  const { data: rows, error } = await supabase
    .from('keyword_stats')
    .select('hint, keyword, total')
    .is('doc_count', null)
    .order('total', { ascending: false })

  if (error || !rows) return []

  // hint별로 그룹핑
  const map = {}
  for (const r of rows) {
    if (!map[r.hint]) map[r.hint] = { hint: r.hint, nullCount: 0, topTotal: 0 }
    map[r.hint].nullCount++
    if (map[r.hint].nullCount <= 10) map[r.hint].topTotal += (r.total || 0)
  }

  // 전체 hint별 키워드 수 (비율 계산용)
  const { data: allRows } = await supabase
    .from('keyword_stats')
    .select('hint')

  const totalMap = {}
  for (const r of (allRows || [])) {
    totalMap[r.hint] = (totalMap[r.hint] || 0) + 1
  }

  const summary = Object.values(map).map(h => ({
    ...h,
    totalCount: totalMap[h.hint] || h.nullCount,
    nullRatio: h.nullCount / (totalMap[h.hint] || 1),
  }))

  // 정렬
  if (priority === 'null_ratio') {
    summary.sort((a, b) => b.nullRatio - a.nullRatio)
  } else if (priority === 'hint_order') {
    // 그대로 (DB 순서)
  } else {
    // search_volume: 미수집 중 검색량 TOP 키워드가 많은 hint 우선
    summary.sort((a, b) => b.topTotal - a.topTotal)
  }

  return summary
}

export default async function handler(req, res) {
  const token = req.headers['x-admin-token']
  if (token !== process.env.ADMIN_SECRET_TOKEN) return res.status(401).json({ error: '인증 필요' })

  // ── GET: 현재 상태 조회 ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const todayUsed = await getTodayUsed()
      const remaining = Math.max(0, DAILY_LIMIT - todayUsed)

      // 전체 null 개수
      const { count: totalNull } = await supabase
        .from('keyword_stats')
        .select('*', { count: 'exact', head: true })
        .is('doc_count', null)

      const summary = await getNullSummary('search_volume')

      return res.status(200).json({
        daily_limit: DAILY_LIMIT,
        today_used: todayUsed,
        remaining,
        total_null: totalNull || 0,
        hints: summary,
      })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  // ── POST: 배치 실행 ──────────────────────────────────────────────
  if (req.method === 'POST') {
    const { chunk = DEFAULT_CHUNK, priority = 'search_volume' } = req.body || {}
    const chunkSize = Math.min(parseInt(chunk, 10) || DEFAULT_CHUNK, MAX_CHUNK)

    try {
      const todayUsed = await getTodayUsed()
      const remaining = DAILY_LIMIT - todayUsed

      if (remaining <= 0) {
        return res.status(200).json({
          done: true,
          reason: 'daily_limit',
          today_used: todayUsed,
          daily_limit: DAILY_LIMIT,
          remaining: 0,
          filled: 0,
          total_null: null,
        })
      }

      // 실제 처리할 개수 = min(chunk, remaining)
      const actualChunk = Math.min(chunkSize, remaining)

      // 우선순위 기준으로 null 키워드 추출
      const { data: nullRows, error } = await supabase
        .from('keyword_stats')
        .select('hint, keyword, total')
        .is('doc_count', null)
        .order('total', { ascending: false })  // 검색량 높은 것 먼저
        .limit(actualChunk)

      if (error) throw new Error(error.message)
      if (!nullRows || nullRows.length === 0) {
        return res.status(200).json({
          done: true,
          reason: 'all_filled',
          today_used: todayUsed,
          remaining,
          filled: 0,
          total_null: 0,
        })
      }

      // 문서수 수집
      const keywords = nullRows.map(r => r.keyword)
      const counts   = await fetchBatch(keywords, 8)

      // 성공한 것만 DB 업데이트
      const updates = nullRows
        .map((r, i) => ({ hint: r.hint, keyword: r.keyword, doc_count: counts[i] }))
        .filter(u => u.doc_count != null)

      if (updates.length > 0) {
        await supabase
          .from('keyword_stats')
          .upsert(updates, { onConflict: 'hint,keyword', ignoreDuplicates: false })
      }

      // 사용량 기록 (성공 여부와 관계없이 시도한 수만큼 차감)
      const newUsed = await addTodayUsed(nullRows.length)

      // 남은 null 개수
      const { count: totalNull } = await supabase
        .from('keyword_stats')
        .select('*', { count: 'exact', head: true })
        .is('doc_count', null)

      const stillNull = totalNull || 0
      const newRemaining = Math.max(0, DAILY_LIMIT - newUsed)

      return res.status(200).json({
        done: stillNull === 0 || newRemaining <= 0,
        reason: stillNull === 0 ? 'all_filled' : newRemaining <= 0 ? 'daily_limit' : 'continue',
        today_used: newUsed,
        daily_limit: DAILY_LIMIT,
        remaining: newRemaining,
        processed: nullRows.length,
        filled: updates.length,
        failed: nullRows.length - updates.length,
        still_null: stillNull,
      })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).end()
}
