// app/api/mcp/route.js
//
// 우리 사이트 블로그 자동화용 MCP(Model Context Protocol) 서버.
// Vercel 공식 mcp-handler 패키지로 Streamable HTTP 프로토콜을 구현합니다.
// Claude(연결된 커넥터)가 이 툴들을 직접 호출해서 "오늘 블로그 글" 글감을
// 사람 개입 없이 스스로 판단할 수 있게 하는 것이 목적입니다.
//
// 노출 툴 15개:
//   - get_publish_log     : 발행 기록 조회 (메모 포함, 중복 방지 + 키워드 사용 추적용, STEP 1에서 가장 먼저 호출)
//   - get_keyword_data    : 도구별 찜한 키워드 + 캐시된 TOP 키워드 조회 (Supabase, hint로 좁혀서 봄)
//   - search_keyword_data : keyword_stats 전체를 hint 구분 없이 검색/열람, competition 필터로 황금키워드 탐색
//   - naver_keyword_volume: 특정 키워드의 실시간 네이버 검색량 조회 (네이버 API 직접 호출, 저장 안 함)
//   - save_keyword_data   : naver_keyword_volume 조회 결과를 TOP 키워드 캐시에 저장 (쓰기 작업)
//   - pick_keyword        : 나중에 쓸 키워드를 찜(bookmark)해두기, 계획 메모 포함 (쓰기 작업)
//   - search_keyword_picks: 찜해둔 키워드 검색/열람, 기본은 미사용만 (그룹 구분 없음)
//   - suggest_feature     : 새 도구가 아니라 "기존 도구에 기능 추가" 제안을 검토 메모와 함께 기록 (쓰기 작업)
//   - get_feature_ideas   : suggest_feature로 기록해둔 기능 추가 제안 목록 조회
//   - add_publish_log     : 글 작성 후 발행 기록에 자동으로 남기기, 찜 키워드 사용 메모 포함 (쓰기 작업)
//   - create_blog_post    : 블로그 글 본문을 실제로 사이트에 발행 (쓰기 작업, 기본 status=published)
//   - update_blog_post    : 발행된 글의 특정 필드 수정 — slug로 대상 지정, 전달된 필드만 업데이트 (쓰기 작업)
//   - get_tool_info       : 도구별 최신 기능 설명 조회 (STEP 1에서 get_publish_log와 함께 호출)
//   - update_tool_info    : 도구 기능 설명 갱신 (사용자가 대화 중 직접 정정해줬을 때만 호출, 쓰기 작업)
//
// keyword_picks 테이블에 사용 처리 컬럼이 필요합니다 (최초 1회, Supabase SQL 에디터에서 실행):
//
// alter table keyword_picks
//   add column if not exists used_at timestamptz,
//   add column if not exists used_in_title text,
//   add column if not exists used_in_slug text;
//
// suggest_feature/get_feature_ideas가 쓰는 feature_ideas 테이블도 최초 1회 생성 필요:
//
// create table if not exists feature_ideas (
//   id text primary key,
//   tool_id text not null,            -- 기능을 추가할 기존 도구 코드 (예: text-down)
//   feature_name text not null,       -- 추가할 기능 이름 (예: "맞춤법 검사")
//   keyword text,                     -- 근거가 된 키워드
//   pc integer, mobile integer, total integer, competition text,
//   notes text not null,              -- 구현 가능성 검토 결과 (비용/약관/대안 등)
//   status text not null default 'proposed',  -- proposed | building | done | rejected
//   created_at timestamptz not null default now()
// );
//
// "새 도구 만들기" vs "기존 도구에 기능 추가"는 의도적으로 분리했습니다 — 황금키워드가 발견됐다고
// 무조건 새 카테고리(DEFAULT_CATEGORIES)를 늘리는 게 아니라, 기존 도구와 결이 비슷하면
// suggest_feature로 "기능 추가" 후보로만 남겨둡니다. 정말 완전히 새로운 도구가 필요하다고
// 판단되면 그건 사람이 직접 사이트 도구 목록(DEFAULT_CATEGORIES)에 추가하고 TOOL_HINTS도
// 같이 갱신해야 합니다 (Claude가 임의로 새 카테고리를 만들지 않음).
//
// 황금키워드 운영 흐름 (검색량 높고 경쟁 낮은 키워드로 트래픽을 모으는 전략):
//   1. search_keyword_data(competition: "낮음")로 경쟁 낮은 후보를 검색량 순으로 훑어본다.
//      (admin 화면에서는 "🏆 황금키워드" 탭에서 같은 데이터를 사람이 직접 봄)
//   2. 글감으로만 쓸 거면 pick_keyword로 찜, "이미 있는 도구에 기능으로 추가하면 좋겠다" 싶으면
//      suggest_feature로 검토 메모와 함께 기록한다.
//   3. 글감을 정할 때마다 search_keyword_picks(기본 미사용만)·get_feature_ideas로 먼저 훑어,
//      오늘 쓸 만한 게 있는지 확인한다.
//      구조화된 컬럼으로 남기 때문에, admin "✅ 사용 키워드" 탭과 search_keyword_picks(include_used: true)에서
//      "그 키워드를 며칠에 어디에 썼는지"가 그대로 조회된다. (add_publish_log의 memo에도 같은 내용을 짧게
//      남겨두면 발행 기록 쪽에서도 한 번 더 확인할 수 있다.)
//
// get_keyword_data는 hint(도구 그룹)로 좁혀서 보고, search_keyword_data는 hint 구분 없이
// keyword_stats 전체를 본다 — 한 도구를 조사하다 다른 도구에도 쓸만한 키워드가 우연히
// 걸리는 경우가 많아서, 그런 "예상 못 한 연결"을 놓치지 않으려고 별도로 분리했습니다.
// (참고: admin 화면 KeywordPanel.js의 hint 표기 — voice-down은 "보이스", text-down은
// "텍스트" — 가 TOOL_HINTS의 "음성타이핑"/"글자수세기"와 다릅니다. get_keyword_data만 쓰면
// 이 불일치 때문에 데이터가 안 보일 수 있는데, search_keyword_data는 hint를 안 가리고
// 전체를 보기 때문에 이 불일치의 영향을 받지 않습니다.)
//
// save_keyword_data가 쓰는 keyword_stats 테이블은 이미 존재합니다
// (pages/api/tools/keyword-volume.js, keyword-top.js 등 admin API와 공유) —
// 별도 테이블 생성이 필요 없고, onConflict 'hint,keyword'로 upsert해 기존
// admin 수집 로직과 동일한 방식으로 동작합니다.
//
// tool_info 테이블 (Supabase에 최초 1회 생성 필요):
//
// create table tool_info (
//   tool_id text primary key,        -- 예: thumb-down, clock-down ...
//   name text,                       -- 도구명, 예: "카드뉴스 변환기"
//   description text not null,       -- 도구 기능 설명 (도구당 최신 1개, 덮어쓰기 방식)
//   path text,                       -- 경로, 예: /cardnews-down
//   updated_at timestamptz not null default now()
// );
//
// 이 테이블은 "도구가 정확히 무엇을 하는지"에 대한 살아있는 단일 정답을 보관합니다.
// Claude가 추측하거나 다른 글에서 유추한 내용으로는 절대 update_tool_info를 호출하지 않고,
// 사용자가 대화 중 직접 확인·정정해준 내용만 반영합니다.
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

/** 현재 시각을 KST(UTC+9) 기준 ISO 문자열로 반환 */
function nowKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')
}

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
  const parsed = list.map(item => {
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

  // 네이버 블로그 검색 API로 문서수 병렬 조회
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (clientId && clientSecret) {
    const docCounts = await Promise.all(
      parsed.map(async (item) => {
        try {
          const res = await fetch(
            `https://openapi.naver.com/v1/search/blog?query=${encodeURIComponent(item.keyword)}&display=1`,
            {
              headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
              signal: AbortSignal.timeout(5000),
            }
          )
          if (!res.ok) return null
          const d = await res.json()
          return d.total ?? null
        } catch {
          return null
        }
      })
    )
    return parsed.map((item, i) => ({ ...item, docCount: docCounts[i] }))
  }

  return parsed
}

// ── MCP 서버 정의 ─────────────────────────────────────────────────────
const baseHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      'get_publish_log',
      {
        title: '블로그 발행 기록 조회',
        description:
          '지금까지 발행한 블로그 글 기록(도구/각도/제목/슬러그/발행일/메모)을 가져온다. ' +
          '오늘의 글감을 정하기 전, STEP 1에서 가장 먼저 호출해서 중복을 피하는 데 쓴다. ' +
          '메모에는 보통 그 글에서 어떤 찜 키워드를 어떻게 썼는지 적혀 있어, 황금키워드를 ' +
          '언제·어느 글에 썼는지 추적하는 용도로도 쓸 수 있다.',
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
          const dateStr = l.published_at || (l.created_at ? l.created_at.slice(0, 10) : '')
          lines.push(`- 도구: ${l.tool} / 각도: ${l.angle} / 제목: ${l.title} / 슬러그: ${l.slug}${dateStr ? ' / 날짜: ' + dateStr : ''}${l.memo ? ' / 메모: ' + l.memo : ''}`)
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
          '실시간으로 조회한다. NAVER_CLIENT_ID/SECRET 환경변수가 설정되어 있으면 네이버 블로그 ' +
          '문서수(docCount)도 함께 반환된다. 캐시에 없는 새 후보 키워드를 즉석에서 비교할 때 사용한다. ' +
          '조회 결과 중 나중에도 쓸만한 키워드가 있으면 save_keyword_data로 캐시에 저장해두면, ' +
          '다음 글 작성 때 get_keyword_data로 다시 불러와 재활용할 수 있다.',
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

          // keyword_stats에 자동 저장 (hint = 조회한 키워드명)
          const nowIso = nowKST()
          for (const hint of keywords) {
            const rows = results.filter(r => r.keyword).map(r => ({
              hint,
              keyword: r.keyword,
              pc: r.monthlySearchPc || 0,
              mobile: r.monthlySearchMobile || 0,
              total: r.monthlySearchTotal || 0,
              competition: r.competition || '-',
              created_at: nowIso,
            }))
            if (rows.length > 0) {
              await supabase.from('keyword_stats').upsert(rows, { onConflict: 'hint,keyword' })
            }
          }

          return { content: [{ type: 'text', text: JSON.stringify({ query: keywords, saved: results.length, results }, null, 2) }] }
        } catch (err) {
          return { content: [{ type: 'text', text: `오류: ${err.message || '키워드 조회 중 오류가 발생했습니다.'}` }], isError: true }
        }
      }
    )

    server.registerTool(
      'search_keyword_data',
      {
        title: '전체 키워드 데이터 검색/열람 (도구·hint 구분 없음)',
        description:
          'get_keyword_data처럼 특정 도구(hint)로 좁혀서 보지 않고, keyword_stats 테이블 전체를 ' +
          '대상으로 검색·열람한다. 한 도구를 조사하다가 다른 도구에도 쓸만한 키워드가 우연히 걸리는 ' +
          '경우가 많기 때문에, 저장된 그룹(hint) 이름이 무엇이든 상관없이 전부 뒤져서 찾는다. query를 ' +
          '주면 키워드에 그 문자열이 포함된 것만, 비우면 검색량이 높은 순으로 전체를 반환한다. competition을 ' +
          '주면 그 경쟁도만 걸러서 본다 — 예를 들어 competition: "낮음"으로 호출하면 검색량은 정렬돼 있으니 ' +
          '위쪽이 곧 "검색량 높고 경쟁 낮은" 황금키워드 후보다. 결과의 [ ] 안 값은 그 키워드가 현재 어느 ' +
          'hint 그룹에 저장돼 있는지 보여준다 — 글 작성 중인 도구의 hint와 달라도 연결고리가 있으면 그대로 써도 된다.',
        inputSchema: {
          query: z.string().optional().describe('키워드에 포함될 부분 문자열. 비우면 전체 반환'),
          competition: z.string().optional().describe('경쟁도로 필터링 (예: "낮음"). 황금키워드 찾을 때 사용'),
          limit: z.number().int().min(1).max(300).optional().describe('최대 개수 (기본 100)'),
        },
      },
      async ({ query, competition, limit }) => {
        let q = supabase
          .from('keyword_stats')
          .select('hint, keyword, pc, mobile, total, competition')
          .order('total', { ascending: false })
          .limit(limit || 100)
        if (query) q = q.ilike('keyword', `%${query}%`)
        if (competition) q = q.eq('competition', competition)
        const { data, error } = await q
        if (error) return { content: [{ type: 'text', text: `오류: ${error.message}` }], isError: true }
        if (!data || !data.length) {
          return { content: [{ type: 'text', text: '검색 결과 없음' }] }
        }
        const lines = [`검색 결과 (${data.length}건, 검색량 순, hint 구분 없이 전체 대상):`]
        data.forEach(k =>
          lines.push(`- [${k.hint}] ${k.keyword} · 합계 ${fmt(k.total)} (PC ${fmt(k.pc)} / 모바일 ${fmt(k.mobile)})${k.competition ? ' · 경쟁도 ' + k.competition : ''}`)
        )
        return { content: [{ type: 'text', text: lines.join('\n') }] }
      }
    )

    server.registerTool(
      'pick_keyword',
      {
        title: '키워드 찜하기 (나중에 쓸 글감 bookmark)',
        description:
          '검색량 높고 경쟁 낮은 "황금키워드"처럼 지금 당장은 안 쓰더라도 나중에 글로 쓰고 싶은 ' +
          '키워드를 찜해둔다(keyword_picks에 upsert, 같은 group+keyword는 최신 값으로 덮어씀). memo에 ' +
          '"이 키워드면 이런 글을 써야겠다"는 계획을 짧게 적어두면, 나중에 search_keyword_picks로 ' +
          '다시 볼 때 바로 떠올릴 수 있다. group은 keyword_stats의 hint 값을 그대로 쓰거나, 마땅한 ' +
          'hint가 없으면 새 이름을 자유롭게 지어도 된다 — 정확한 분류보다 나중에 다시 찾을 수 있게 ' +
          '기록해두는 것이 목적이다.',
        inputSchema: {
          group: z.string().describe('이 키워드를 묶을 그룹/hint 이름. keyword_stats에 있던 hint를 그대로 쓰는 걸 권장'),
          keyword: z.string(),
          pc: z.number().optional(),
          mobile: z.number().optional(),
          total: z.number().optional(),
          competition: z.string().optional(),
          memo: z.string().optional().describe('어떤 글로 연결할지 계획 메모. 예: "text-down 맞춤법검사기 연계 글로 쓰면 좋음"'),
        },
        annotations: { destructiveHint: false, idempotentHint: true },
      },
      async ({ group, keyword, pc, mobile, total, competition, memo }) => {
        const row = {
          tool_id: group,
          hint: group,
          keyword,
          pc: pc || 0,
          mobile: mobile || 0,
          total: total != null ? total : (pc || 0) + (mobile || 0),
          competition: competition || null,
          memo: memo || null,
        }
        const { error } = await supabase
          .from('keyword_picks')
          .upsert(row, { onConflict: 'tool_id,keyword' })
        if (error) return { content: [{ type: 'text', text: `오류: ${error.message}` }], isError: true }
        return {
          content: [{
            type: 'text',
            text: `⭐ 찜 완료: [${group}] ${keyword}${memo ? ' — ' + memo : ''}`,
          }],
        }
      }
    )

    server.registerTool(
      'search_keyword_picks',
      {
        title: '찜한 키워드 전체 검색/열람 (그룹 구분 없음)',
        description:
          'pick_keyword로 찜해둔 키워드를 그룹(hint) 구분 없이 전체 열람·검색한다. 기본적으로 아직 ' +
          '글에 안 쓴(미사용) 키워드만 보여준다 — 글감을 정하기 전에 한 번씩 호출해서 "찜해둔 것 중 ' +
          '오늘 쓸 만한 게 있는지" 확인하면 좋다. 이미 쓴 것까지 같이 보고 싶으면 include_used를 true로 준다.',
        inputSchema: {
          query: z.string().optional().describe('키워드 또는 메모에 포함될 부분 문자열. 비우면 전체 반환'),
          include_used: z.boolean().optional().describe('true면 이미 사용 처리된 키워드도 함께 보여준다 (기본 false, 미사용만)'),
        },
      },
      async ({ query, include_used }) => {
        let q = supabase
          .from('keyword_picks')
          .select('tool_id, keyword, pc, mobile, total, competition, memo, used_at, used_in_title, used_in_slug')
          .order('total', { ascending: false })
        if (!include_used) q = q.is('used_at', null)
        const { data, error } = await q
        if (error) return { content: [{ type: 'text', text: `오류: ${error.message}` }], isError: true }
        let rows = data || []
        if (query) {
          const needle = query.toLowerCase()
          rows = rows.filter(r =>
            (r.keyword || '').toLowerCase().includes(needle) || (r.memo || '').toLowerCase().includes(needle)
          )
        }
        if (!rows.length) {
          return { content: [{ type: 'text', text: include_used ? '찜한 키워드 없음' : '미사용 찜 키워드 없음 (전부 글에 썼거나, 아직 찜한 게 없음)' }] }
        }
        const label = include_used ? '찜한 키워드 (사용 여부 포함)' : '⭐ 미사용 찜 키워드'
        const lines = [`${label} (${rows.length}개):`]
        rows.forEach(p => {
          const usedNote = p.used_at ? ` · ✅ 사용됨(${p.used_at.slice(0, 10)}, ${p.used_in_title || p.used_in_slug || '글 정보 없음'})` : ''
          lines.push(`- [${p.tool_id}] ${p.keyword} · 합계 ${fmt(p.total)} (PC ${fmt(p.pc)} / 모바일 ${fmt(p.mobile)})${p.competition ? ' · 경쟁도 ' + p.competition : ''}${p.memo ? ' · 메모: ' + p.memo : ''}${usedNote}`)
        })
        return { content: [{ type: 'text', text: lines.join('\n') }] }
      }
    )

    server.registerTool(
      'add_publish_log',
      {
        title: '블로그 발행 기록 추가',
        description:
          '새로 작성한 블로그 글 1편을 발행 기록에 남긴다. STEP 3에서 최종 아티팩트를 ' +
          '출력한 직후 호출해서, 같은 도구·각도를 다음에 또 쓰지 않도록 한다. 이 글에서 ' +
          'pick_keyword로 찜해뒀던 황금키워드를 실제로 썼다면, memo에 어떤 키워드를 어떻게 ' +
          '썼는지 짧게 남긴다(예: "찜 키워드 \'맞춤법검사기\' 사용"). target_keyword·search_pc·' +
          'search_mobile·search_total·competition을 함께 넘기면 발행 기록에 키워드 데이터도 ' +
          '같이 저장된다. created_at이 자동으로 ' +
          '날짜를 남기기 때문에, 이렇게 하면 "그 키워드를 며칠에 어느 글에 썼는지"가 ' +
          'get_publish_log 조회만으로 그대로 추적된다.',
        inputSchema: {
          tool: z.enum(TOOL_CODES),
          angle: z.string().describe('키워드 각도, 예: "다운로드 방법"'),
          title: z.string(),
          slug: z.string(),
          memo: z.string().optional().describe('이 글에서 사용한 찜 키워드나 특이사항 메모'),
          target_keyword: z.string().optional().describe('타겟 키워드, 예: "유튜브 썸네일 다운로드"'),
          search_pc: z.number().optional().describe('네이버 PC 월간 검색수'),
          search_mobile: z.number().optional().describe('네이버 모바일 월간 검색수'),
          search_total: z.number().optional().describe('PC+모바일 합계 검색수'),
          competition: z.string().optional().describe('경쟁도 (높음/중간/낮음)'),
        },
        annotations: { destructiveHint: false, idempotentHint: false },
      },
      async ({ tool, angle, title, slug, memo, target_keyword, search_pc, search_mobile, search_total, competition }) => {
        const row = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          tool, angle, title, slug,
          memo: memo || null,
          target_keyword: target_keyword || null,
          search_pc: search_pc != null ? Number(search_pc) : null,
          search_mobile: search_mobile != null ? Number(search_mobile) : null,
          search_total: search_total != null ? Number(search_total) : null,
          competition: competition || null,
          published_at: null,
          created_at: nowKST(),
        }
        const { data, error } = await supabase.from('content_log').insert([row]).select().single()
        if (error) return { content: [{ type: 'text', text: `오류: ${error.message}` }], isError: true }
        return { content: [{ type: 'text', text: `✅ 기록 추가됨: ${tool} / ${angle} / ${title}` }] }
      }
    )

    server.registerTool(
      'create_blog_post',
      {
        title: '블로그 글 실제 발행 (본문 포함)',
        description:
          '작성한 블로그 글 본문 전체를 실제로 사이트에 올린다. 기본 상태는 published라 호출 즉시 ' +
          '사이트에 공개된다 — 사람 검수 단계 없음. STEP 3에서 글을 완성한 뒤 호출하고, 보통 ' +
          'add_publish_log와 함께(같이) 호출한다. status를 draft로 주면 admin에 임시저장만 되고 ' +
          '공개되지 않는다.',
        inputSchema: {
          title: z.string().describe('글 제목, 20~55자'),
          slug: z.string().describe('URL 슬러그, 영문 소문자+하이픈'),
          summary: z.string().optional().describe('SEO 요약, 80~120자'),
          content: z.string().describe('본문 마크다운 전체 (표·SVG·FAQ·CTA 포함)'),
          category: z.enum(TOOL_CODES).describe('카테고리(=도구 코드)'),
          tags: z.array(z.string()).optional().describe('태그 5~8개 권장'),
          cover_image: z.string().optional().describe('커버 이미지 URL'),
          status: z.enum(['published', 'draft', 'scheduled']).optional()
            .describe('기본값 published(즉시 공개). draft면 admin에만 저장되고 비공개.'),
          scheduled_at: z.string().optional().describe('status가 scheduled일 때만 사용, ISO 날짜'),
        },
        annotations: { destructiveHint: false, idempotentHint: false },
      },
      async ({ title, slug, summary, content, category, tags, cover_image, status, scheduled_at }) => {
        const finalStatus = status || 'published'
        const nowIso = nowKST()
        const row = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          type: 'blog',
          title,
          slug,
          summary: summary || null,
          content,
          category,
          tags: Array.isArray(tags) ? tags : [],
          cover_image: cover_image || null,
          author: null,
          status: finalStatus,
          scheduled_at: finalStatus === 'scheduled' ? (scheduled_at || null) : null,
          published_at: finalStatus === 'published' ? nowIso : null,
          created_at: nowIso,
          updated_at: nowIso,
        }
        const { data, error } = await supabase.from('blog_posts').insert([row]).select().single()
        if (error) return { content: [{ type: 'text', text: `오류: ${error.message}` }], isError: true }
        const liveNote = finalStatus === 'published'
          ? `✅ 발행 완료 — https://cardnews-converter.vercel.app/blog/${slug} 에서 바로 확인 가능`
          : `✅ ${finalStatus === 'draft' ? '임시저장(draft)' : '예약(scheduled)'} 완료 — admin에서 확인 필요`
        return { content: [{ type: 'text', text: liveNote }] }
      }
    )

    server.registerTool(
      'update_blog_post',
      {
        title: '발행된 글 수정',
        description:
          '발행된 블로그 글의 특정 필드를 수정한다. slug로 대상 글을 찾고, 전달된 필드만 업데이트한다 — ' +
          '넘기지 않은 필드는 기존 값 그대로 유지된다. 수정 즉시 사이트에 반영되므로 호출 전 ' +
          '변경 내용을 사용자에게 한 번 확인받는 것을 권장한다. 커버 이미지 교체, 본문·제목·태그·요약 수정, ' +
          '상태 변경 등 모든 글 수정 작업에 사용한다.',
        inputSchema: {
          slug: z.string().describe('수정할 글의 URL 슬러그 (필수, 대상 글 식별자)'),
          title: z.string().optional().describe('새 제목'),
          summary: z.string().optional().describe('새 SEO 요약'),
          content: z.string().optional().describe('새 본문 마크다운 전체'),
          cover_image: z.string().optional().describe('새 커버 이미지 URL'),
          tags: z.array(z.string()).optional().describe('새 태그 배열'),
          status: z.enum(['published', 'draft']).optional().describe('글 상태 변경'),
        },
        annotations: { destructiveHint: false, idempotentHint: true },
      },
      async ({ slug, title, summary, content, cover_image, tags, status }) => {
        const patch = {}
        if (title !== undefined)       patch.title = title
        if (summary !== undefined)     patch.summary = summary
        if (content !== undefined)     patch.content = content
        if (cover_image !== undefined) patch.cover_image = cover_image
        if (tags !== undefined)        patch.tags = tags
        if (status !== undefined)      patch.status = status
        if (Object.keys(patch).length === 0) {
          return { content: [{ type: 'text', text: '오류: 수정할 필드가 없습니다. title/summary/content/cover_image/tags/status 중 하나 이상을 전달해주세요.' }], isError: true }
        }
        patch.updated_at = nowKST()

        const { data, error } = await supabase
          .from('blog_posts')
          .update(patch)
          .eq('slug', slug)
          .select('slug, title, status')
          .single()
        if (error) return { content: [{ type: 'text', text: `오류: ${error.message}` }], isError: true }
        if (!data) return { content: [{ type: 'text', text: `슬러그 '${slug}'에 해당하는 글을 찾을 수 없습니다.` }], isError: true }

        const changedFields = Object.keys(patch).filter(k => k !== 'updated_at').join(', ')
        return {
          content: [{
            type: 'text',
            text: `✅ 수정 완료\n제목: ${data.title}\nslug: ${data.slug}\n변경 필드: ${changedFields}\n라이브 URL: https://cardnews-converter.vercel.app/blog/${data.slug}`,
          }],
        }
      }
    )

    server.registerTool(
      'get_tool_info',
      {
        title: '도구 기능 설명 조회',
        description:
          '사이트에 등록된 도구들의 최신 기능 설명을 가져온다. tool_id를 비우면 전체를 반환한다. ' +
          'STEP 1 시작 시 get_publish_log와 같은 타이밍에 한 번 호출해서, 글 작성 전에 도구 설명을 ' +
          '최신 상태로 확인하는 데 쓴다.',
        inputSchema: {
          tool_id: z.enum(TOOL_CODES).optional().describe('특정 도구로만 조회하고 싶을 때, 비우면 전체'),
        },
      },
      async ({ tool_id }) => {
        let q = supabase.from('tool_info').select('*').order('tool_id')
        if (tool_id) q = q.eq('tool_id', tool_id)
        const { data, error } = await q
        if (error) return { content: [{ type: 'text', text: `오류: ${error.message}` }], isError: true }
        if (!data || !data.length) {
          return { content: [{ type: 'text', text: tool_id ? `${tool_id}: 등록된 설명 없음` : '등록된 도구 설명 없음 (아직 update_tool_info로 등록된 적 없음)' }] }
        }
        const lines = data.map(t =>
          `- [${t.tool_id}] ${t.name || ''}: ${t.description}${t.path ? ' (' + t.path + ')' : ''} · 갱신일 ${t.updated_at}`
        )
        return { content: [{ type: 'text', text: lines.join('\n') }] }
      }
    )

    server.registerTool(
      'update_tool_info',
      {
        title: '도구 기능 설명 갱신',
        description:
          '도구 기능 설명을 갱신한다 (도구당 최신 1개로 덮어씀). 사용자가 대화 중 직접 ' +
          '정정·확인해준 내용만 반영하고, 추측이나 다른 글에서 유추한 정보로는 절대 호출하지 않는다. ' +
          '호출 전 갱신할 내용을 한 줄로 요약해 사용자에게 보여준다.',
        inputSchema: {
          tool_id: z.enum(TOOL_CODES).describe('도구 코드'),
          description: z.string().describe('갱신할 전체 기능 설명'),
          name: z.string().optional().describe('도구명 (선택, 비우면 기존 값 유지)'),
          path: z.string().optional().describe('도구 경로, 예: /cardnews-down (선택, 비우면 기존 값 유지)'),
        },
        annotations: { destructiveHint: false, idempotentHint: true },
      },
      async ({ tool_id, description, name, path }) => {
        const { data: prevRow } = await supabase
          .from('tool_info').select('description').eq('tool_id', tool_id).maybeSingle()
        const previousDescription = prevRow?.description || null

        const row = {
          tool_id,
          description,
          updated_at: nowKST(),
        }
        if (name) row.name = name
        if (path) row.path = path

        const { data, error } = await supabase
          .from('tool_info')
          .upsert(row, { onConflict: 'tool_id' })
          .select().single()
        if (error) return { content: [{ type: 'text', text: `오류: ${error.message}` }], isError: true }

        const lines = [`✅ ${tool_id} 설명 갱신됨`]
        if (previousDescription) lines.push(`이전: ${previousDescription}`)
        lines.push(`이후: ${description}`)
        return { content: [{ type: 'text', text: lines.join('\n') }] }
      }
    )

    server.registerTool(
      'get_system_prompt',
      {
        title: 'Claude 시스템 프롬프트(지침) 조회',
        description:
          'admin에 저장된 Claude 프로젝트 지침 전문을 가져온다. ' +
          '대화를 시작할 때 가장 먼저 호출해서 지침을 로드하고, 그 내용대로 행동한다. ' +
          '지침은 admin → 🤖 Claude 지침 메뉴에서 수정할 수 있다.',
        inputSchema: {},
      },
      async () => {
        const { data, error } = await supabase
          .from('system_prompts')
          .select('content, updated_at')
          .eq('id', 'main')
          .single()
        if (error || !data) {
          return { content: [{ type: 'text', text: '❌ 시스템 프롬프트를 불러오지 못했습니다. admin에서 저장했는지 확인해주세요.' }], isError: true }
        }
        return {
          content: [{
            type: 'text',
            text: '# 시스템 프롬프트 로드 완료 (저장일시: ' + data.updated_at + ')\n\n' + data.content,
          }],
        }
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
