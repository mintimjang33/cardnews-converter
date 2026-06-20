// pages/api/mcp/keyword.js
//
// 네이버 검색광고 "키워드 도구" API를 호출해서
// 키워드별 PC/모바일 월간검색수 · 경쟁정도를 가져오는 MCP 서버.
//
// 필요한 환경변수 (Vercel 프로젝트 설정 > Environment Variables 에 등록):
//   NAVER_AD_API_KEY      - 네이버 검색광고 API 사용관리에서 발급받은 Access License
//   NAVER_AD_SECRET_KEY   - 위에서 같이 발급되는 Secret Key
//   NAVER_AD_CUSTOMER_ID  - 검색광고 계정의 고객 ID(숫자)
//
// 호출 예시:
//   GET /api/mcp/keyword?hintKeywords=유튜브썸네일,온라인타이머
//
// MCP 클라이언트(Claude)는 이 엔드포인트를 "도구"로 등록해서 사용합니다.
// 자세한 설정 방법은 같이 드린 SETUP_GUIDE.md를 참고하세요.

import crypto from 'crypto'

const BASE_URL = 'https://api.naver.com'
const URI = '/keywordstool'
const METHOD = 'GET'

function buildHeaders() {
  const apiKey = process.env.NAVER_AD_API_KEY
  const secretKey = process.env.NAVER_AD_SECRET_KEY
  const customerId = process.env.NAVER_AD_CUSTOMER_ID

  if (!apiKey || !secretKey || !customerId) {
    throw new Error('네이버 검색광고 API 환경변수가 설정되지 않았습니다 (NAVER_AD_API_KEY / NAVER_AD_SECRET_KEY / NAVER_AD_CUSTOMER_ID)')
  }

  const timestamp = Date.now().toString()
  const message = `${timestamp}.${METHOD}.${URI}`
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64')

  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Timestamp': timestamp,
    'X-API-KEY': apiKey,
    'X-Customer': String(customerId),
    'X-Signature': signature,
  }
}

// 네이버 키워드도구는 한 번에 최대 5개 키워드(공백 제거, 쉼표 구분)까지 받습니다.
function normalizeKeywords(raw) {
  return String(raw || '')
    .split(',')
    .map((k) => k.trim().replace(/\s+/g, ''))
    .filter(Boolean)
    .slice(0, 5)
}

async function fetchKeywordData(keywords) {
  const headers = buildHeaders()
  const hintKeywords = keywords.join(',')
  const url = `${BASE_URL}${URI}?hintKeywords=${encodeURIComponent(hintKeywords)}&showDetail=1`

  const response = await fetch(url, { method: METHOD, headers, signal: AbortSignal.timeout(8000) })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`네이버 API 오류 (${response.status}): ${text}`)
  }

  const data = await response.json()
  const list = Array.isArray(data?.keywordList) ? data.keywordList : []

  // 사람이 보기 좋고, Claude가 바로 글감 판단에 쓰기 좋은 형태로 가공
  return list.map((item) => {
    const pc = item.monthlyPcQcCnt === '< 10' ? 5 : Number(item.monthlyPcQcCnt) || 0
    const mobile = item.monthlyMobileQcCnt === '< 10' ? 5 : Number(item.monthlyMobileQcCnt) || 0
    return {
      keyword: item.relKeyword,
      monthlySearchPc: pc,
      monthlySearchMobile: mobile,
      monthlySearchTotal: pc + mobile,
      competition: item.compIdx, // 낮음/중간/높음
      monthlyAvgClickPc: Number(item.monthlyAvePcClkCnt) || 0,
      monthlyAvgClickMobile: Number(item.monthlyAveMobileClkCnt) || 0,
      monthlyAvgAdCount: Number(item.plAvgDepth) || 0,
    }
  })
}

export default async function handler(req, res) {
  // 간단한 MCP 스타일 핸드셰이크: 도구 목록 조회
  if (req.method === 'GET' && req.query.list_tools === '1') {
    return res.status(200).json({
      tools: [
        {
          name: 'naver_keyword_volume',
          description: '네이버 검색광고 키워드도구로 키워드별 월간 검색량(PC/모바일)과 경쟁정도를 조회합니다.',
          parameters: {
            hintKeywords: '쉼표로 구분된 키워드 문자열, 최대 5개 (예: "유튜브썸네일,온라인타이머")',
          },
        },
      ],
    })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 요청만 지원합니다.' })
  }

  const keywords = normalizeKeywords(req.query.hintKeywords)
  if (keywords.length === 0) {
    return res.status(400).json({ error: 'hintKeywords 쿼리 파라미터가 필요합니다. 예: ?hintKeywords=유튜브썸네일,온라인타이머' })
  }

  try {
    const results = await fetchKeywordData(keywords)
    // 검색량 합계 기준 내림차순 정렬 — Claude가 바로 1순위 각도를 고를 수 있게
    results.sort((a, b) => b.monthlySearchTotal - a.monthlySearchTotal)
    return res.status(200).json({ query: keywords, results })
  } catch (err) {
    return res.status(500).json({ error: err.message || '키워드 조회 중 오류가 발생했습니다.' })
  }
}
