/**
 * /api/tools/keyword-volume
 * 네이버 검색광고 API를 통해 키워드 월간 검색량 조회
 *
 * 주의: 네이버 API는 hintKeywords에 공백 불가
 * → 키워드를 하나씩 순차 요청 후 합산
 */

import crypto from 'crypto'

const BASE_URL = 'https://api.searchad.naver.com'

function makeSignature(timestamp, method, path, secretKey) {
  const message = `${timestamp}.${method}.${path}`
  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64')
}

async function fetchOneKeyword(keyword, apiKey, secretKey, customerId) {
  const path = '/keywordstool'
  const method = 'GET'
  const timestamp = Date.now().toString()
  const signature = makeSignature(timestamp, method, path, secretKey)

  // 공백 제거한 키워드로 요청 (네이버 API 제약)
  const safeKeyword = keyword.replace(/\s/g, '')
  const requestUrl = `${BASE_URL}${path}?hintKeywords=${encodeURIComponent(safeKeyword)}&showDetail=1`

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
  if (!response.ok) throw new Error(`${response.status}: ${rawText}`)

  const data = JSON.parse(rawText)
  // 응답에서 원본 키워드(공백 포함)와 가장 유사한 항목 찾기
  const list = data.keywordList || []

  // 공백 제거 버전으로 매칭
  const item = list.find(r => r.relKeyword.replace(/\s/g, '') === safeKeyword)
    || list[0] // 없으면 첫 번째 연관 키워드 사용

  if (!item) return { keyword, pc: 0, mobile: 0, total: 0 }

  const pc     = item.monthlyPcQcCnt     === '< 10' ? 5 : Number(item.monthlyPcQcCnt)     || 0
  const mobile = item.monthlyMobileQcCnt === '< 10' ? 5 : Number(item.monthlyMobileQcCnt) || 0
  return { keyword, matched: item.relKeyword, pc, mobile, total: pc + mobile }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { keywords } = req.query
  if (!keywords) return res.status(400).json({ error: 'keywords 파라미터가 필요합니다' })

  const apiKey     = process.env.NAVER_AD_API_KEY
  const secretKey  = process.env.NAVER_AD_SECRET_KEY
  const customerId = process.env.NAVER_AD_CUSTOMER_ID

  if (!apiKey || !secretKey || !customerId) {
    return res.status(500).json({ error: '환경변수 누락' })
  }

  const keywordList = keywords
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
    .slice(0, 5)

  try {
    // 키워드 하나씩 순차 요청 (공백 불가 제약 우회)
    const results = []
    for (const kw of keywordList) {
      try {
        const result = await fetchOneKeyword(kw, apiKey, secretKey, customerId)
        results.push(result)
      } catch (e) {
        results.push({ keyword: kw, pc: 0, mobile: 0, total: 0, error: e.message })
      }
      // API 레이트 리밋 방지 (100ms 간격)
      await new Promise(r => setTimeout(r, 100))
    }

    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.status(200).json({ results })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
