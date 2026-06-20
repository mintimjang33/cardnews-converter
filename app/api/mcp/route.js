// app/api/mcp/route.js
//
// 네이버 검색광고 "키워드 도구"를 호출하는 진짜 MCP(Model Context Protocol) 서버.
// Vercel 공식 mcp-handler 패키지로 Streamable HTTP 프로토콜을 구현합니다.
//
// 필요한 환경변수 (Vercel 프로젝트 설정 > Environment Variables 에 이미 등록되어 있어야 함):
//   NAVER_AD_API_KEY      - 네이버 검색광고 API Access License
//   NAVER_AD_SECRET_KEY   - 네이버 검색광고 API Secret Key
//   NAVER_AD_CUSTOMER_ID  - 네이버 검색광고 계정 Customer ID
//
// claude.ai 커넥터에는 아래 주소를 등록합니다:
//   https://cardnews-converter.vercel.app/api/mcp
//
// (기존 pages/api/mcp/keyword.js 는 더 이상 필요 없습니다 — 삭제하거나 그대로 둬도
//  claude.ai 커넥터와는 무관하게 동작하지 않으니 충돌은 없습니다. 정리하고 싶으시면
//  pages/api/mcp/keyword.js 파일을 지우셔도 됩니다.)

import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import crypto from 'crypto'

const BASE_URL = 'https://api.naver.com'
const URI = '/keywordstool'
const METHOD = 'GET'

function buildHeaders() {
  const apiKey = process.env.NAVER_AD_API_KEY
  const secretKey = process.env.NAVER_AD_SECRET_KEY
  const customerId = process.env.NAVER_AD_CUSTOMER_ID

  if (!apiKey || !secretKey || !customerId) {
    throw new Error(
      '네이버 검색광고 API 환경변수가 설정되지 않았습니다 (NAVER_AD_API_KEY / NAVER_AD_SECRET_KEY / NAVER_AD_CUSTOMER_ID)'
    )
  }

  const timestamp = Date.now().toString()
  const message = `${timestamp}.${METHOD}.${URI}`
  const signature = crypto.createHmac('sha256', secretKey).update(message).digest('base64')

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

  return list
    .map((item) => {
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
    .sort((a, b) => b.monthlySearchTotal - a.monthlySearchTotal)
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'naver_keyword_volume',
      {
        title: '네이버 키워드 검색량 조회',
        description:
          '네이버 검색광고 키워드도구로 키워드별 월간 검색량(PC/모바일 합산)과 경쟁정도를 조회합니다. ' +
          '블로그 글감의 키워드 각도를 정할 때, 후보 키워드들을 검색량 순으로 비교하는 데 사용합니다.',
        inputSchema: {
          hintKeywords: z
            .string()
            .describe('쉼표로 구분된 한글 키워드 문자열, 최대 5개. 예: "유튜브썸네일,온라인타이머,포모도로타이머"'),
        },
      },
      async ({ hintKeywords }) => {
        const keywords = normalizeKeywords(hintKeywords)
        if (keywords.length === 0) {
          return {
            content: [{ type: 'text', text: '키워드가 비어있습니다. 쉼표로 구분된 키워드를 1개 이상 입력해주세요.' }],
            isError: true,
          }
        }

        try {
          const results = await fetchKeywordData(keywords)
          return {
            content: [{ type: 'text', text: JSON.stringify({ query: keywords, results }, null, 2) }],
          }
        } catch (err) {
          return {
            content: [{ type: 'text', text: `오류: ${err.message || '키워드 조회 중 오류가 발생했습니다.'}` }],
            isError: true,
          }
        }
      }
    )
  },
  {},
  {
    basePath: '/api',
    maxDuration: 30,
    verboseLogs: true,
  }
)

export { handler as GET, handler as POST }
