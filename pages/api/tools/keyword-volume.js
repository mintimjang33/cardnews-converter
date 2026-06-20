/**
 * /api/tools/keyword-volume
 * 네이버 검색광고 API를 통해 키워드 월간 검색량 조회
 *
 * 환경변수 (Vercel에 이미 설정됨):
 *   NAVER_AD_API_KEY       — API 액세스 라이선스 키
 *   NAVER_AD_SECRET_KEY    — 시크릿 키 (HMAC-SHA256 서명용)
 *   NAVER_AD_CUSTOMER_ID   — 고객 ID
 *
 * 사용법:
 *   GET /api/tools/keyword-volume?keywords=유튜브 썸네일,썸네일 저장
 *
 * 응답 예시:
 *   {
 *     "results": [
 *       { "keyword": "유튜브 썸네일", "pc": 12400, "mobile": 38200, "total": 50600 },
 *       { "keyword": "썸네일 저장",   "pc": 2100,  "mobile": 8700,  "total": 10800 }
 *     ]
 *   }
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

  if (!apiKey || !secretKey || !customerId) {
    return res.status(500).json({ error: '네이버 광고 API 환경변수가 설정되지 않았습니다' })
  }

  // 쉼표로 구분된 키워드 배열, 최대 5개 (API 제한)
  const keywordList = keywords
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
    .slice(0, 5)

  const path = '/keywordstool'
  const method = 'GET'
  const timestamp = Date.now().toString()
  const signature = makeSignature(timestamp, method, path, secretKey)

  const params = new URLSearchParams({
    hintKeywords: keywordList.join(','),
    showDetail: '1',
  })

  try {
    const response = await fetch(`${BASE_URL}${path}?${params}`, {
      method,
      headers: {
        'X-Timestamp': timestamp,
        'X-API-KEY':   apiKey,
        'X-CUSTOMER':  customerId,
        'X-Signature': signature,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(response.status).json({ error: `네이버 API 오류: ${errText}` })
    }

    const data = await response.json()

    // 요청한 키워드만 필터링 후 필요한 필드 추출
    const results = keywordList.map(kw => {
      const item = (data.keywordList || []).find(r => r.relKeyword === kw)
      if (!item) return { keyword: kw, pc: 0, mobile: 0, total: 0 }
      const pc     = item.monthlyPcQcCnt     === '< 10' ? 5 : Number(item.monthlyPcQcCnt)     || 0
      const mobile = item.monthlyMobileQcCnt === '< 10' ? 5 : Number(item.monthlyMobileQcCnt) || 0
      return { keyword: kw, pc, mobile, total: pc + mobile }
    })

    res.setHeader('Cache-Control', 'public, max-age=86400') // 하루 캐시
    return res.status(200).json({ results })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
