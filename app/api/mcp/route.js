// app/api/mcp/route.js
//
// 우리 사이트 블로그 자동화용 MCP(Model Context Protocol) 서버.
// Vercel 공식 mcp-handler 패키지로 Streamable HTTP 프로토콜을 구현합니다.
// Claude(연결된 커넥터)가 이 툴들을 직접 호출해서 "오늘 블로그 글" 글감을
// 사람 개입 없이 스스로 판단할 수 있게 하는 것이 목적입니다.
//
// 노출 툴 4개:
//   - get_publish_log     : 발행 기록 조회 (중복 방지용, STEP 1에서 가장 먼저 호출)
//   - get_keyword_data    : 도구별 찜한 키워드 + 캐시된 TOP 키워드 조회 (Supabase)
//   - naver_keyword_volume: 특정 키워드의 실시간 네이버 검색량 조회 (네이버 API 직접 호출)
//   - add_publish_log     : 글 작성 후 발행 기록에 자동으로 남기기 (쓰기 작업)
//
// 필요한 환경변수 (Vercel 프로젝트 설정 > Environment Variables):
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   - 기존 admin API들과 동일하게 사용
//   NAVER_AD_API_KEY / NAVER_AD_SECRET_KEY / NAVER_AD_CUSTOMER_ID - 네이버 검색광고 API
//   MCP_SHARED_SECRET                          - 이 MCP 서버 보호용 공유 비밀키 (직접 정해서 등록)
//
// claude.ai 커넥터 등록 주소 (Settings > Connectors > Add custom connector):
//   https://cardnews-converter.vercel.app/api/mcp?key=여기에_MCP_SHARED_SECRET_값
//
// ⚠️ 이 파일은 원래 app/.well-known/oauth-authorization-server/route.js 에
// 잘못된 경로로 들어가 있었습니다 (해당 경로는 실제로는 OAuth 메타데이터 전용
// 표준 경로라 MCP 핸들러가 거기 있으면 안 됩니다). app/api/mcp/route.js 로
// 옮기고, 기존 app/.well-known/oauth-authorization-server/route.js 파일은
// 삭제하세요.

import { createMcpHandler } from 'mcp-handler'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TOOL_HINTS = {
  'thumb-down':    '썸네일',
  'sound-down':    '효과음',
  'clock-down':    '타이머',
  'voice-down':    '음성타이핑',
  'text-down':     '글자수세기',
  'cardnews-down': '카드뉴스',
}
const TOOL_CODES = Object.keys(TOOL_HINTS)

function fmt(n) { return (n || 0).toLocaleString('ko-KR') }

// ── 네이버 검색광고 키워드도구 (기존 로직 그대로 유지) ──────────────────
const NAVER_BASE_URL = 'https://api.naver.com'
const NAVER_URI = '/keywordstool'

function buildNaverHeaders() {
  const apiKey = process.env.NAVER_AD_API_KEY
  const secretKey = process.env.NAVER_AD_SECRET_KEY
  const customerId = process.env.NAVER_AD_CUSTOMER_ID
  if (!apiKey || !secretKey || !customerId) {
    throw new Error('네이버 검색광고 API 환경변수가 설정되지 않았습니다 (NAVER_AD_API_KEY / NAVER_AD_SECRET_KEY / NAVER_AD_CUSTOMER_ID)')
  }
  const timestamp = Date.now().toString()
  const message = `${timestamp}.GET.${NAVER_URI}`
  const signature = crypto.createHmac('sha256', secretKey).update(message).digest('base64')
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Timestamp': timestamp,
    'X-API-KEY': apiKey,
    'X-Customer': String(customerId),
    'X-Signature': signature,
  }
}

function normalizeKeywords(raw) {
  return String(raw || '').split(',').map(k => k.trim().replace(/\s+/g, '')).filter(Boolean).slice(0, 5)
}

async function fetchNaverKeywordData(keywords) {
  const headers = buildNaverHeaders()
  const hintKeywords = keywords.join(',')
  const url = `${NAVER_BASE_URL}${NAVER_URI}?hintKeywords=${encodeURIComponent(hintKeywords)}&showDetail=1`
  const response = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(8000) })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`네이버 API 오류 (${response.status}): ${text}`)
  }
  const data = await response.json()
  const list = Array.isArray(data?.keywordList) ? data.keywordList : []
  return list.map(item => {
    const pc = item.monthlyPcQcCnt === '< 10' ? 5 : Number(item.monthlyPcQcCnt) || 0
    const mobile = item.monthlyMobileQcCnt === '< 10' ? 5 : Number(item.monthlyMobileQcCnt) || 0
    return {
      keyword: item.relKeyword,
      monthlySearchPc: pc,
      monthlySearchMobile: mobile,
      monthlySearchTotal: pc + mobile,
      competition: item.compIdx,
    }
  }).sort((a, b) => b.monthlySearchTotal - a.monthlySearchTotal)
}

// ── MCP 서버 정의 ─────────────────────────────────────────────────────
const baseHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      'get_publish_log',
      {
        title: '블로그 발행 기록 조회',
        description:
          '지금까지 발행한 블로그 글 기록(도구/각도/제목/슬러그/발행일)을 가져온다. ' +
          '오늘의 글감을 정하기 전, STEP 1에서 가장 먼저 호출해서 중복을 피하는 데 쓴다.',
        inputSchema: {
          tool_id: z.enum(TOOL_CODES).optional().describe('특정 도구로만 필터링하고 싶을 때'),
          limit: z.number().int().min(1).max(500).optional().describe('최대 개수 (기본 200)'),
        },
      },
      async ({ tool_id, limit }) => {
        let q = supabase.from('content_log').select('*').order('created_at', { ascending: false })
        if (tool_id) q = q.eq('tool', tool_id)
        q = q.limit(limit || 200)
        const { data, error } = await q
        if (error) return { content: [{ type: 'text', text: `오류: ${error.message}` }], isError: true }
        if (!data || !data.length) {
          return { content: [{ type: 'text', text: '발행 기록: 없음 (처음 시작)' }] }
        }
        const lines = [`발행 기록 (${data.length}건, 최신순):`]
        data.forEach(l => {
          lines.push(`- 도구: ${l.tool} / 각도: ${l.angle} / 제목: ${l.title} / 슬러그: ${l.slug}${l.published_at ? ' / 발행일: ' + l.published_at : ''}`)
        })
        return { content: [{ type: 'text', text: lines.join('\n') }] }
      }
    )

    server.registerTool(
      'get_keyword_data',
      {
        title: '도구별 키워드 검색량 조회 (캐시)',
        description:
          '특정 도구(tool_id)의 찜한 키워드와, 미리 수집해둔 TOP 검색량 키워드를 가져온다. ' +
          'STEP 1-5 키워드 각도 확정에 사용한다. 더 새로운 키워드 하나를 즉석에서 조회하고 싶으면 ' +
          'naver_keyword_volume 툴을 대신 쓴다.',
        inputSchema: {
          tool_id: z.enum(TOOL_CODES).describe('도구 코드'),
          limit: z.number().int().min(1).max(100).optional().describe('TOP 키워드 최대 개수 (기본 30)'),
        },
      },
      async ({ tool_id, limit }) => {
        const hint = TOOL_HINTS[tool_id]
        const max = limit || 30
        const { data: topRows, error: topErr } = await supabase
          .from('keyword_stats').select('keyword, pc, mobile, total, competition')
          .eq('hint', hint).order('total', { ascending: false }).limit(max)
        if (topErr) return { content: [{ type: 'text', text: `오류: ${topErr.message}` }], isError: true }

        const { data: pickRows, error: pickErr } = await supabase
          .from('keyword_picks').select('keyword, pc, mobile, total, competition')
          .eq('tool_id', hint).order('total', { ascending: false })
        if (pickErr) return { content: [{ type: 'text', text: `오류: ${pickErr.message}` }], isError: true }

        const lines = []
        lines.push(`[도구] ${tool_id} (검색 그룹: ${hint})`)
        lines.push('')
        lines.push(`⭐ 찜한 키워드 (${pickRows.length}개):`)
        if (!pickRows.length) lines.push('- 없음')
        else pickRows.forEach(p => lines.push(`- ${p.keyword} · 합계 ${fmt(p.total)} (PC ${fmt(p.pc)} / 모바일 ${fmt(p.mobile)})${p.competition ? ' · 경쟁도 ' + p.competition : ''}`))
        lines.push('')
        lines.push(`📊 TOP 키워드 (검색량 순, 상위 ${topRows.length}개):`)
        if (!topRows.length) lines.push('- 데이터 없음 (admin > 키워드 관리에서 먼저 수집 필요)')
        else topRows.forEach((k, i) => lines.push(`${i + 1}. ${k.keyword} · 합계 ${fmt(k.total)} (PC ${fmt(k.pc)} / 모바일 ${fmt(k.mobile)})`))

        return { content: [{ type: 'text', text: lines.join('\n') }] }
      }
    )

    server.registerTool(
      'naver_keyword_volume',
      {
        title: '네이버 키워드 실시간 검색량 조회',
        description:
          '네이버 검색광고 키워드도구로 키워드별 월간 검색량(PC/모바일 합산)과 경쟁정도를 ' +
          '실시간으로 조회한다. 캐시에 없는 새 후보 키워드를 즉석에서 비교할 때 사용한다.',
        inputSchema: {
          hintKeywords: z.string().describe('쉼표로 구분된 한글 키워드 문자열, 최대 5개. 예: "유튜브썸네일,온라인타이머,포모도로타이머"'),
        },
      },
      async ({ hintKeywords }) => {
        const keywords = normalizeKeywords(hintKeywords)
        if (keywords.length === 0) {
          return { content: [{ type: 'text', text: '키워드가 비어있습니다. 쉼표로 구분된 키워드를 1개 이상 입력해주세요.' }], isError: true }
        }
        try {
          const results = await fetchNaverKeywordData(keywords)
          return { content: [{ type: 'text', text: JSON.stringify({ query: keywords, results }, null, 2) }] }
        } catch (err) {
          return { content: [{ type: 'text', text: `오류: ${err.message || '키워드 조회 중 오류가 발생했습니다.'}` }], isError: true }
        }
      }
    )

    server.registerTool(
      'add_publish_log',
      {
        title: '블로그 발행 기록 추가',
        description:
          '새로 작성한 블로그 글 1편을 발행 기록에 남긴다. STEP 3에서 최종 아티팩트를 ' +
          '출력한 직후 호출해서, 같은 도구·각도를 다음에 또 쓰지 않도록 한다.',
        inputSchema: {
          tool: z.enum(TOOL_CODES),
          angle: z.string().describe('키워드 각도, 예: "다운로드 방법"'),
          title: z.string(),
          slug: z.string(),
          memo: z.string().optional(),
        },
        annotations: { destructiveHint: false, idempotentHint: false },
      },
      async ({ tool, angle, title, slug, memo }) => {
        const row = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          tool, angle, title, slug,
          memo: memo || null,
          published_at: null,
          created_at: new Date().toISOString(),
        }
        const { data, error } = await supabase.from('content_log').insert([row]).select().single()
        if (error) return { content: [{ type: 'text', text: `오류: ${error.message}` }], isError: true }
        return { content: [{ type: 'text', text: `✅ 기록 추가됨: ${tool} / ${angle} / ${title}` }] }
      }
    )
  },
  {},
  { basePath: '/api', maxDuration: 30, verboseLogs: true }
)

// ── 간단한 공유 비밀키 보호 ───────────────────────────────────────────
// claude.ai 커넥터 URL에 ?key=... 로 같이 등록해서 사용한다.
// (전체 OAuth 플로우 대신, 개인/소규모 사용에 맞춘 가벼운 보호 장치)
async function authedHandler(request) {
  const url = new URL(request.url)
  const key = url.searchParams.get('key')
  if (!process.env.MCP_SHARED_SECRET || key !== process.env.MCP_SHARED_SECRET) {
    return new Response(JSON.stringify({ error: '인증 필요 (key 파라미터 확인)' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return baseHandler(request)
}

export { authedHandler as GET, authedHandler as POST }
