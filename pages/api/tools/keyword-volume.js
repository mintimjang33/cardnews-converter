/**
 * /api/tools/keyword-volume
 * 네이버 검색광고 API를 통해 키워드 월간 검색량 조회
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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { keywords } = req.query
  if (!keywords) return res.status(400).json({ error: 'keywords 파라미터가 필요합니다' })

  const apiKey     = process.env.NAVER_AD_API_KEY
  const secretKey  = process.env.NAVER_AD_SECRET_KEY
  const customerId = process.env.NAVER_AD_CUSTOMER_ID

  const debug = {
    apiKey_prefix:    apiKey     ? apiKey.slice(0, 4) + '****'    : 'MISSING',
    secretKey_prefix: secretKey  ? secretKey.slice(0, 4) + '****' : 'MISSING',
    customerId:       customerId || 'MISSING',
  }

  if (!apiKey || !secretKey || !customerId) {
    return res.status(500).json({ error: '환경변수 누락', debug })
  }

  const keywordList = keywords
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
    .slice(0, 5)

  const path = '/keywordstool'
  const method = 'GET'
  const timestamp = Date.now().toString()
  const signature = makeSignature(timestamp, method, path, secretKey)

  const queryString = `hintKeywords=${encodeURIComponent(keywordList.join(','))}&showDetail=1`
  const requestUrl = `${BASE_URL}${path}?${queryString}`

  debug.requestUrl   = requestUrl
  debug.hintKeywords = keywordList.join(',')
  debug.timestamp    = timestamp
  debug.signature    = signature

  try {
    const response = await fetch(requestUrl, {
      method,
      headers: {
        'X-Timestamp': timestamp,
        'X-API-KEY':   apiKey,
        'X-Customer':  customerId,   // 네이버 공식 담당자 확인: X-Customer (이 대소문자)
        'X-Signature': signature,
        'Content-Type': 'application/json',
      },
    })

    const rawText = await response.text()
    debug.responseStatus = response.status
    debug.responseBody   = rawText

    if (!response.ok) {
      return res.status(response.status).json({ error: '네이버 API 오류', debug })
    }

    const data = JSON.parse(rawText)

    const results = keywordList.map(kw => {
      const item = (data.keywordList || []).find(r => r.relKeyword === kw)
      if (!item) return { keyword: kw, pc: 0, mobile: 0, total: 0 }
      const pc     = item.monthlyPcQcCnt     === '< 10' ? 5 : Number(item.monthlyPcQcCnt)     || 0
      const mobile = item.monthlyMobileQcCnt === '< 10' ? 5 : Number(item.monthlyMobileQcCnt) || 0
      return { keyword: kw, pc, mobile, total: pc + mobile }
    })

    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.status(200).json({ results, debug })

  } catch (err) {
    debug.exception = err.message
    return res.status(500).json({ error: err.message, debug })
  }
}
