import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_CATEGORIES } from '../../lib/blogCategories'
import { parseMarkdown as parseMd } from '../../lib/parseMarkdown.js'

/** 현재 시각을 KST(UTC+9) 기준 ISO 문자열로 반환 */
function nowKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')
}
/** KST 기준 현재 날짜 정보 반환 (타임존 혼동 없이 ISO 문자열로 파싱) */
function nowKSTDateParts() {
  // Date.now() + 9h → UTC Z 형식의 ISO 문자열 → slice로 KST 날짜 직접 추출
  const iso = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString()
  // iso = 'YYYY-MM-DDTHH:MM:SS.mssZ' 형태, 여기서 날짜 부분이 KST 날짜
  const year  = parseInt(iso.slice(0, 4), 10)
  const month = parseInt(iso.slice(5, 7), 10) - 1  // 0-indexed
  const date  = parseInt(iso.slice(8, 10), 10)
  return { year, month, date }
}
/** KST 기준 현재 Date 객체 반환 (하위 호환용 — getTime()만 사용할 것) */
function nowKSTDate() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
}

/** 날짜 문자열/ISO를 KST 기준 'YYYY-MM-DD' 반환 */
function toKSTDateStr(dateVal) {
  if (!dateVal) return ''
  const d = new Date(dateVal)
  // d.getTime()은 항상 UTC ms → +9h → KST 시각을 UTC Z 형식으로 표현 → slice
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

  let r = text.trim().toLowerCase()
  if (/[가-힣]/.test(r)) {
    const eng = r.match(/[a-z0-9]+/g)
    return (eng && eng.join('').length >= 2) ? eng.join('-') : 'post-' + Date.now().toString(36)
  }
  return r.replace(/[^a-z0-9-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') || 'post-' + Date.now().toString(36)
}

// ── SEO 체크리스트 데이터 (BlogAdmin TOOL_PANELS 그대로)
const TOOL_PANELS = {
  adsense: {
    label:'💰 애드센스', color:'#d97706', border:'#fbbf24', bg:'#1a1400', activeBg:'#2a1e00',
    link:'https://www.google.com/adsense', linkLabel:'애드센스 대시보드 →',
    sections:[
      { title:'🚀 최초 셋팅 (한 번만)', color:'#fbbf24', bg:'#2a1e00', border:'#78500a',
        items:[
          { done:false, text:'사이트 URL 등록 및 소유권 확인', desc:'애드센스 가입 후 사이트 주소 등록, <head>에 메타태그 삽입' },
          { done:false, text:'ads.txt 파일 루트에 업로드', desc:'google.com, pub-XXXXXXX, DIRECT, f08c47fec0942fa0 형식' },
          { done:false, text:'자동 광고 ON 또는 광고 단위 수동 생성', desc:'자동 광고는 구글이 최적 위치 자동 배치' },
          { done:false, text:'광고 코드 <head> 또는 본문에 삽입', desc:'_app.js의 <Head>에 Script 컴포넌트로 로드' },
        ]},
      { title:'📋 주기적으로 확인', color:'#f59e0b', bg:'#1a1200', border:'#5a3a00',
        items:[
          { done:false, text:'[주간] 수익 및 RPM 확인', desc:'대시보드 → 보고서에서 날짜별 수익 추이 체크' },
          { done:false, text:'[수시] 정책 위반 경고 확인', desc:'알림 탭에 빨간 경고 뜨면 즉시 조치' },
          { done:false, text:'[월간] 잘 클릭되는 광고 위치 파악', desc:'본문 상단·목차 아래·본문 중간이 CTR 높음' },
          { done:false, text:'[월간] 모바일 광고 노출 확인', desc:'반응형 광고 단위 사용 여부 체크' },
        ]}
    ]
  },
  searchconsole: {
    label:'🔍 서치콘솔', color:'#16a34a', border:'#86efac', bg:'#0a1a0a', activeBg:'#0f2a0f',
    link:'https://search.google.com/search-console', linkLabel:'Search Console →',
    sections:[
      { title:'🚀 최초 셋팅', color:'#4ade80', bg:'#0f2a0f', border:'#166534',
        items:[
          { done:false, text:'속성 추가 및 소유권 인증', desc:'URL 접두사 방식 권장' },
          { done:false, text:'sitemap.xml 제출', desc:'설정 → Sitemaps → sitemap.xml 제출' },
          { done:false, text:'robots.txt 확인', desc:'크롤링 차단 규칙 없는지 확인' },
          { done:false, text:'Google Analytics 연결', desc:'설정 → 연결 → Analytics 연동' },
        ]},
      { title:'📋 주기적으로 확인', color:'#22c55e', bg:'#0a1a0a', border:'#14532d',
        items:[
          { done:false, text:'[월간] 색인 생성 현황 확인', desc:'색인이 생성되지 않은 페이지 원인 파악' },
          { done:false, text:'[월간] 검색 성과 (클릭수·노출수·CTR)', desc:'어떤 키워드로 유입되는지 확인' },
          { done:false, text:'[글 발행 시] URL 즉시 검사 요청', desc:'URL 검사 → 색인 생성 요청' },
          { done:false, text:'[분기] 모바일 사용성 오류 확인', desc:'경험 → 모바일 사용성 — 터치 요소 간격·뷰포트 설정 등 오류 수정' },
          { done:false, text:'[분기] Core Web Vitals 점수 확인', desc:'LCP·INP·CLS 점수 확인 및 개선' },
          { done:false, text:'🤖 [매일 자동] 사이트맵 URL 자동 색인 요청', desc:'GitHub Actions로 매일 오전 9시(KST) 자동 실행 — Indexing API로 전체 URL 색인 요청' },
        ]}
    ]
  },
  analytics: {
    label:'📊 애널리틱스', color:'#2563eb', border:'#93c5fd', bg:'#0a0f1a', activeBg:'#0d1525',
    link:'https://analytics.google.com', linkLabel:'Google Analytics →',
    sections:[
      { title:'🚀 최초 셋팅', color:'#60a5fa', bg:'#0d1525', border:'#1e3a8a',
        items:[
          { done:false, text:'GA4 속성 생성 및 데이터 스트림 추가', desc:'관리 → 속성 만들기 → 웹 스트림 추가 → G-XXXXXXXX 발급' },
          { done:false, text:'측정 ID를 사이트 <head>에 삽입', desc:'_app.js에 Script 컴포넌트로 gtag.js 로드' },
          { done:false, text:'Search Console 연결', desc:'GA4 관리 → 속성 → Search Console 링크' },
          { done:false, text:'내부 트래픽(내 IP) 필터 설정', desc:'관리 → 데이터 필터 → 내부 트래픽 정의' },
          { done:false, text:'목표/전환 이벤트 설정', desc:'뉴스레터 구독, 문의하기 클릭 등 중요 액션을 전환으로 표시' },
          { done:false, text:'주간/월간 리포트 이메일 자동 발송 설정', desc:'GA4 → 리포트 → 공유 → 이메일 예약 전송 설정' },
        ]},
      { title:'📋 주기적으로 확인', color:'#3b82f6', bg:'#0a0f1a', border:'#1e3a8a',
        items:[
          { done:false, text:'[수시] 실시간 사용자 수 확인', desc:'새 글 발행 직후 트래픽 반응 체크' },
          { done:false, text:'[주간] 유입 채널별 트래픽 분석', desc:'획득 → 트래픽 획득' },
          { done:false, text:'[주간] 인기 페이지 TOP 10 확인', desc:'참여 → 페이지 및 화면' },
          { done:false, text:'[월간] 이탈률·평균 참여 시간 확인', desc:'참여 시간 짧으면 도입부 개선' },
          { done:false, text:'[월간] 기기별·지역별 접속 현황', desc:'모바일 비율이 높으면 모바일 UX를 우선 최적화' },
          { done:false, text:'🤖 [자동] 주간/월간 리포트 이메일 수신 중', desc:'GA4 이메일 예약 전송으로 자동 발송 중' },
        ]}
    ]
  },
  ogtag: {
    label:'🔗 OG태그', color:'#7c3aed', border:'#ddd6fe', bg:'#0f0a1a', activeBg:'#150f25',
    link:'https://developers.facebook.com/tools/debug/', linkLabel:'OG 태그 검사기 →',
    sections:[
      { title:'🚀 최초 셋팅', color:'#a78bfa', bg:'#150f25', border:'#4c1d95',
        items:[
          { done:false, text:'og:title 추가', desc:'<meta property="og:title" content="사이트 제목" />' },
          { done:false, text:'og:description 추가 (80~160자)', desc:'<meta property="og:description" content="사이트 설명..." />' },
          { done:false, text:'og:image 추가 (1200x630px 권장)', desc:'SNS 공유 시 표시되는 썸네일' },
          { done:false, text:'og:url / og:type / og:site_name 추가', desc:'og:type은 website' },
          { done:false, text:'Twitter Card 태그 추가', desc:'<meta name="twitter:card" content="summary_large_image" />' },
          { done:false, text:'블로그 글 페이지에도 동적 OG 태그 적용', desc:'각 글의 제목/요약/커버이미지가 OG로 출력되는지 확인' },
        ]},
      { title:'📋 주기적으로 확인', color:'#8b5cf6', bg:'#0f0a1a', border:'#3b1d8a',
        items:[
          { done:false, text:'Facebook 공유 디버거로 OG 태그 확인', desc:'캐시 새로고침도 여기서 가능' },
          { done:false, text:'카카오톡 공유 미리보기 확인', desc:'카카오톡에서 링크 공유 시 썸네일·제목 테스트' },
          { done:false, text:'og:image 사이즈 및 깨짐 확인', desc:'1200x630px 유지, 8MB 이하, HTTPS 필수' },
        ]}
    ]
  },
  seo: {
    label:'🚀 SEO', color:'#0891b2', border:'#a5f3fc', bg:'#001a1f', activeBg:'#002530',
    link:'https://search.google.com/search-console', linkLabel:'서치콘솔 →',
    sections:[
      { title:'🏗️ 기술적 SEO', color:'#22d3ee', bg:'#002530', border:'#0e7490',
        items:[
          { done:false, text:'sitemap.xml 자동 생성 및 제출', desc:'새 글 발행 시 sitemap 자동 갱신 확인' },
          { done:false, text:'robots.txt 정상 설정 확인', desc:'/admin은 Disallow, /blog는 Allow' },
          { done:false, text:'canonical URL 태그 삽입', desc:'중복 페이지 문제 방지' },
          { done:false, text:'HTTPS 적용 확인', desc:'HTTP 접속 시 자동으로 HTTPS 리다이렉트 되는지 확인' },
          { done:false, text:'모바일 반응형 확인', desc:'구글은 모바일 우선 색인' },
          { done:false, text:'Core Web Vitals 점수 확인', desc:'서치콘솔 → 경험 → Core Web Vitals — LCP·INP·CLS 점수 확인 및 개선' },
        ]},
      { title:'✍️ 글 작성 시 매번 체크', color:'#06b6d4', bg:'#001a1f', border:'#155e75',
        items:[
          { done:false, text:'핵심 키워드를 제목(H1)에 포함', desc:'검색자가 실제로 치는 단어를 제목 앞쪽에 배치' },
          { done:false, text:'메타 description 작성 (80~160자)', desc:'키워드 포함 + 클릭 유도 문구' },
          { done:false, text:'URL 슬러그를 짧고 명확하게', desc:'영문 소문자+하이픈, 한글 금지' },
          { done:false, text:'H2·H3 소제목으로 콘텐츠 구조화', desc:'목차 역할 + 구글이 구조 파악' },
          { done:false, text:'이미지 alt 텍스트 입력', desc:'모든 이미지에 alt="설명" 추가 — 이미지 검색 유입 + 접근성 향상' },
          { done:false, text:'내부 링크 2~3개 이상 삽입', desc:'관련 글로 연결 — 체류 시간 증가 + 구글 크롤러가 사이트 구조 파악 가능' },
          { done:false, text:'발행 후 서치콘솔 URL 색인 요청', desc:'URL 검사 → 색인 생성 요청' },
        ]}
    ]
  },
  searchreg: {
    label:'🌐 검색엔진 등록', color:'#059669', border:'#6ee7b7', bg:'#001a0a', activeBg:'#002510',
    link:'https://searchadvisor.naver.com', linkLabel:'네이버 서치어드바이저 →',
    sections:[
      { title:'필수 등록', color:'#34d399', bg:'#002510', border:'#065f46',
        items:[
          { done:false, text:'구글 서치콘솔 등록', desc:'소유권 인증 + sitemap 제출 + GA4 연결' },
          { done:false, text:'네이버 서치어드바이저 등록', desc:'소유권 인증 + sitemap 제출' },
          { done:false, text:'빙 웹마스터 도구 등록', desc:'구글 서치콘솔에서 가져오기 가능' },
        ]},
      { title:'선택 등록', color:'#10b981', bg:'#001a0a', border:'#064e3b',
        items:[
          { done:false, text:'다음(카카오) 검색 등록', desc:'사이트 등록 신청' },
          { done:false, text:'줌(ZUM) 등록', desc:'구글·다음 등록 시 자동 수집' },
          { done:false, text:'얀덱스 웹마스터 등록', desc:'소유권 인증 · sitemap 제출' },
        ]},
      { title:'🔧 등록 후 해야 할 것', color:'#10b981', bg:'#001a0a', border:'#064e3b',
        items:[
          { done:false, text:'각 검색엔진에 sitemap.xml 제출', desc:'구글·네이버·빙·얀덱스 모두 제출' },
          { done:false, text:'소유권 인증 메타태그 삽입', desc:'구글·네이버 인증 메타태그 <head>에 추가' },
          { done:false, text:'ads.txt 파일 확인', desc:'/ads.txt 브라우저에서 직접 접근해서 확인' },
        ]}
    ]
  },
}

// ── 루틴 체크리스트 데이터
const ROUTINES = {
  publish: {
    label:'📝 글 발행할 때마다', color:'#7c3aed', bg:'#0f0a1a', border:'#4c1d95',
    items:[
      { text:'서치콘솔 URL 색인 요청', link:'https://search.google.com/search-console', desc:'URL 검사 → 색인 생성 요청' },
      { text:'IndexNow 핑 전송 확인', link:null, desc:'글 발행 시 자동 전송됨 — 발행 후 토스트 메시지에서 확인' },
      { text:'GA4 실시간 트래픽 확인', link:'https://analytics.google.com', desc:'발행 후 GA4 실시간 탭 확인' },
      { text:'OG태그 디버거 확인', link:'https://developers.facebook.com/tools/debug/', desc:'페이스북 공유 미리보기 테스트' },
    ]
  },
  weekly: {
    label:'📅 매주 토요일 확인', color:'#0891b2', bg:'#001a1f', border:'#0e7490',
    items:[
      { text:'애드센스 수익/RPM 확인', link:'https://www.google.com/adsense', desc:'보고서 → 날짜별 수익 추이' },
      { text:'애드센스 정책 위반 경고 확인', link:'https://www.google.com/adsense', desc:'알림 탭 빨간 경고 확인' },
      { text:'서치콘솔 검색 성과 확인', link:'https://search.google.com/search-console', desc:'클릭수·노출수·CTR 키워드 분석' },
      { text:'GA4 인기 페이지 TOP 10', link:'https://analytics.google.com', desc:'참여 → 페이지 및 화면' },
      { text:'GA4 유입 채널별 분석', link:'https://analytics.google.com', desc:'획득 → 트래픽 획득' },
    ]
  },
  monthly: {
    label:'🗓️ 매월 마지막 토요일', color:'#d97706', bg:'#1a1200', border:'#78500a',
    items:[
      { text:'애드센스 광고 위치 CTR 분석', link:'https://www.google.com/adsense', desc:'어떤 위치 광고가 잘 클릭되는지 파악' },
      { text:'애드센스 모바일 광고 노출 확인', link:'https://www.google.com/adsense', desc:'반응형 광고 단위 정상 작동 여부' },
      { text:'서치콘솔 색인 현황 확인', link:'https://search.google.com/search-console', desc:'색인 안 된 페이지 원인 파악' },
      { text:'서치콘솔 모바일 사용성 오류', link:'https://search.google.com/search-console', desc:'경험 → 모바일 사용성' },
      { text:'Core Web Vitals 점수 확인', link:'https://search.google.com/search-console', desc:'LCP·INP·CLS 점수 개선' },
      { text:'GA4 이탈률·참여 시간 확인', link:'https://analytics.google.com', desc:'참여 시간 짧은 글 도입부 개선' },
      { text:'GA4 기기별·지역별 접속 현황', link:'https://analytics.google.com', desc:'모바일 비율 높으면 UX 우선 최적화' },
      { text:'CTR 낮은 글 제목/메타설명 개선', link:'https://search.google.com/search-console', desc:'성과 → CTR 낮은 페이지 찾아 수정' },
      { text:'오래된 글 콘텐츠 업데이트', link:null, desc:'6개월~1년 된 글 최신 정보로 갱신 후 재색인 요청' },
    ]
  }
}

const DEFAULT_CATS = DEFAULT_CATEGORIES

const S = {
  page: { minHeight:'100vh', background:'#0c0c0c', fontFamily:"'Outfit', sans-serif", color:'#f0f0f0', paddingBottom:60 },
  wrap: { maxWidth:1100, margin:'0 auto', padding:'0 20px' },
  card: { background:'#161616', border:'1px solid #2a2a2a', borderRadius:14, padding:24, marginBottom:20 },
  input: { background:'#1f1f1f', border:'1px solid #333', borderRadius:8, padding:'10px 14px', color:'#f0f0f0', fontFamily:"'Outfit', sans-serif", fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' },
  textarea: { background:'#1f1f1f', border:'1px solid #333', borderRadius:8, padding:'10px 14px', color:'#ccc', fontFamily:'monospace', fontSize:13, outline:'none', width:'100%', boxSizing:'border-box', resize:'vertical', lineHeight:1.7 },
  btn: (color='#e63946') => ({ background:color, color:'#fff', border:'none', borderRadius:9, padding:'10px 20px', fontFamily:"'Outfit', sans-serif", fontSize:14, fontWeight:700, cursor:'pointer' }),
  label: { color:'#888', fontSize:12, marginBottom:5, display:'block', fontWeight:600 },
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width:50, height:28, borderRadius:14, background:value?'#e63946':'#333', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ width:22, height:22, borderRadius:11, background:'#fff', position:'absolute', top:3, left:value?25:3, transition:'left 0.2s' }} />
    </div>
  )
}

export default function BlogAdminPanel({ adminToken, initialView }) {
  const [view, setView] = useState(initialView === 'write' ? 'write' : 'list') // list | write
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [preview, setPreview] = useState(false)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState('')
  const [categories, setCategories] = useState([])

  // SEO 체크리스트
  const [activeToolPanel, setActiveToolPanel] = useState(null)
  const [checklistChecks, setChecklistChecks] = useState({})

  // 루틴 달력
  const [showRoutine, setShowRoutine] = useState(false)
  const [routineChecks, setRoutineChecks] = useState({})
  const [collapsedRoutines, setCollapsedRoutines] = useState({})

  const emptyForm = { title:'', slug:'', summary:'', content:'', category:'thumb-down', tags:'', thumbnail:'', scheduledAt:'', publishedAt:'' }
  const [form, setForm] = useState(emptyForm)

  const token = () => adminToken

  useEffect(() => { loadPosts(); loadCategories(); loadChecklist() }, [])

  const loadChecklist = async () => {
    try {
      const res = await fetch('/api/admin/checklist', { headers: { 'x-admin-token': adminToken } })
      if (!res.ok) return
      const data = await res.json()
      if (data.checklist) setChecklistChecks(data.checklist)
      if (data.routine) setRoutineChecks(data.routine)
    } catch {}
  }

  const saveChecklist = async (checklist, routine) => {
    try {
      await fetch('/api/admin/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ checklist, routine }),
      })
    } catch {}
  }

  const loadPosts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/blog/posts?limit=500', { headers:{'x-admin-token': token()} })
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/blog/categories')
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch {}
  }

  const allCategories = [...DEFAULT_CATS, ...categories.map(c => c.label).filter(l => !DEFAULT_CATS.includes(l))]

  const handleNew = () => {
    setEditId(null); setForm(emptyForm); setPreview(false); setView('write')
  }

  const handleEdit = (post) => {
    setEditId(post.id)
    setForm({
      title: post.title || '',
      slug: post.slug || '',
      summary: post.summary || '',
      content: post.content || '',
      category: post.category || 'thumb-down',
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
      thumbnail: post.cover_image || '',
      scheduledAt: post.scheduled_at ? post.scheduled_at.slice(0,16) : '',
      publishedAt: post.published_at || '',
    })
    setPreview(false); setView('write')
  }

  const handleDelete = async (post) => {
    if (!confirm(`"${post.title}" 을(를) 삭제할까요?`)) return
    await fetch(`/api/blog/posts?id=${post.id}`, { method:'DELETE', headers:{'x-admin-token':token()} })
    loadPosts()
  }

  const handleSave = async (status) => {
    if (!form.title.trim()) { setMsg('❌ 제목을 입력해주세요'); setTimeout(()=>setMsg(''),3000); return }
    if (!form.content.trim()) { setMsg('❌ 내용을 입력해주세요'); setTimeout(()=>setMsg(''),3000); return }
    if (status === 'scheduled') {
      if (!form.scheduledAt) { setMsg('❌ 예약 날짜/시간을 입력해주세요'); setTimeout(()=>setMsg(''),3000); return }
      if (new Date(form.scheduledAt) <= nowKSTDate()) { setMsg('❌ 예약 시간은 현재 이후여야 합니다'); setTimeout(()=>setMsg(''),3000); return }
    }
    setLoading(true)
    try {
      const slug = form.slug.trim() || slugify(form.title)
      const tags = form.tags ? form.tags.split(',').map(t=>t.trim()).filter(Boolean) : []
      const body = {
        title: form.title.trim(), slug, summary: form.summary.trim(),
        content: form.content, category: form.category, tags,
        cover_image: form.thumbnail.trim(),
        status,
        scheduled_at: status === 'scheduled' ? new Date(form.scheduledAt).toISOString() : null,
        // 발행 시각: 이미 한 번 발행된 적 있으면 그 시각 유지, 처음 발행되는 거면 지금 시각
        published_at: status === 'published' ? (form.publishedAt || nowKST()) : (form.publishedAt || null),
      }
      const method = editId ? 'PUT' : 'POST'
      if (editId) body.id = editId
      const res = await fetch('/api/blog/posts', { method, headers:{'Content-Type':'application/json','x-admin-token':token()}, body:JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setMsg(status==='published'?'🚀 발행 완료!':status==='scheduled'?'⏰ 예약발행 설정!':'💾 임시저장 완료')
      setTimeout(()=>setMsg(''),3000)
      setView('list'); setEditId(null); setForm(emptyForm); loadPosts()
    } catch { setMsg('❌ 저장 실패'); setTimeout(()=>setMsg(''),3000) }
    setLoading(false)
  }

  // ── SEO 체크리스트
  const toggleCheck = (key) => {
    const next = { ...checklistChecks, [key]: !checklistChecks[key] }
    setChecklistChecks(next)
    saveChecklist(next, routineChecks)
  }

  // ── 루틴 달력
  const getWeekKey = () => { const { year: y, month: mo, date: d } = nowKSTDateParts(); const s=new Date(y,0,1); const n=new Date(y,mo,d); return `${y}-W${Math.ceil(((n-s)/86400000+s.getDay()+1)/7)}` }
  const getMonthKey = () => { const { year: y, month: mo } = nowKSTDateParts(); return `${y}-M${mo+1}` }

  const toggleRoutine = (periodKey, ii) => {
    const k = `${periodKey}__${ii}`
    const next = { ...routineChecks, [k]: !routineChecks[k] }
    setRoutineChecks(next)
    saveChecklist(checklistChecks, next)
  }

  // ── 달력 계산 (KST 기준: ISO 문자열에서 직접 추출 → 브라우저 타임존 무관)
  const { year, month, date: today } = nowKSTDateParts()
  const firstDay = new Date(year,month,1).getDay()
  const daysInMonth = new Date(year,month+1,0).getDate()
  const monthStr = `${year}-${String(month+1).padStart(2,'0')}`
  const dailyCount = {}
  posts.forEach(p => {
    if (p.status === 'published' && (p.published_at || p.created_at)) {
      const ds = toKSTDateStr(p.published_at || p.created_at)
      if (ds.startsWith(monthStr)) dailyCount[parseInt(ds.slice(8,10))] = (dailyCount[parseInt(ds.slice(8,10))]||0)+1
    }
  })
  const saturdays = []
  for (let d=1;d<=daysInMonth;d++) if (new Date(year,month,d).getDay()===6) saturdays.push(d)
  const lastSat = saturdays[saturdays.length-1]

  const filteredPosts = filterType === 'all' ? posts : posts.filter(p => (p.category||'thumb-down') === filterType)

  return (
    <div>
      <style>{`
        .md-preview { line-height:1.8; color:#374151; font-size:15px; word-break:keep-all; }
        .md-preview h1 { font-size:22px; font-weight:800; margin:20px 0 10px; color:#111; }
        .md-preview h2 { font-size:18px; font-weight:700; margin:16px 0 8px; color:#1f2937; border-bottom:2px solid #e5e7eb; padding-bottom:6px; }
        .md-preview h3 { font-size:15px; font-weight:700; margin:14px 0 6px; color:#374151; }
        .md-preview p { margin:10px 0; }
        .md-preview ul, .md-preview ol { padding-left:22px; margin:10px 0; }
        .md-preview li { margin:5px 0; line-height:1.7; }
        .md-preview strong { font-weight:700; color:#111; }
        .md-preview code { background:#f3f4f6; padding:2px 6px; border-radius:4px; font-size:12px; font-family:monospace; color:#e11d48; }
        .md-preview pre { background:#1f2937; color:#f9fafb; padding:14px 18px; border-radius:8px; overflow-x:auto; margin:14px 0; }
        .md-preview pre code { background:none; color:inherit; padding:0; }
        .md-preview blockquote { border-left:4px solid #f97316; padding:8px 14px; background:#fff7ed; margin:14px 0; border-radius:0 6px 6px 0; color:#92400e; font-style:italic; }
        .md-preview a { color:#f97316; text-decoration:underline; }
        .md-preview hr { border:none; border-top:2px solid #f3f4f6; margin:20px 0; }
        .md-preview img { max-width:100%; border-radius:8px; margin:8px 0; display:block; }
        .md-preview svg { max-width:100%; display:block; margin:16px 0; }
        .md-preview table { width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; border:2px solid #e63946; border-radius:8px; overflow:hidden; }
        .md-preview thead th { background:#e63946; color:#fff; padding:10px 14px; text-align:left; border:1px solid #c92a3a; font-weight:700; }
        .md-preview tbody td { padding:10px 14px; border:1px solid #e5e7eb; background:#fff; color:#374151; }
        .md-preview tbody tr:nth-child(even) td { background:#fef2f2; }
        @media (max-width:600px) {
          .md-preview table { font-size:13px; display:block; overflow-x:auto; }
        }
      `}</style>

      {/* 헤더 */}
      <div style={{ background:'#161616', borderBottom:'1px solid #2a2a2a', padding:'16px 0', marginBottom: 0 }}>
        <div style={{ ...S.wrap, maxWidth: 'none', padding: '0 28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {view==='write' && (
              <>
                <button onClick={()=>{setView('list');setEditId(null);setForm(emptyForm)}} style={{ background:'none', border:'none', cursor:'pointer', color:'#888', fontSize:14, fontFamily:"'Outfit', sans-serif" }}>← 목록</button>
                <span style={{ color:'#333' }}>|</span>
              </>
            )}
            <span style={{ fontWeight:800, fontSize:16 }}>📝 게시판 관리</span>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {view==='list' && (
              <button onClick={handleNew} style={{ ...S.btn(), padding:'8px 18px', fontSize:13 }}>+ 새 글</button>
            )}
            {view==='write' && (
              <>
                <button onClick={()=>setPreview(v=>!v)} style={{ ...S.btn('#333'), padding:'8px 14px', fontSize:13 }}>
                  {preview ? '✏️ 편집' : '👁 미리보기'}
                </button>
                <button onClick={()=>handleSave('draft')} disabled={loading} style={{ ...S.btn('#555'), padding:'8px 14px', fontSize:13 }}>💾 임시저장</button>
                <div style={{ display:'flex', alignItems:'center', gap:6, background:'#0d1b2a', border:'1.5px solid #1e3a5f', borderRadius:8, padding:'4px 10px' }}>
                  <input type="datetime-local" value={form.scheduledAt} onChange={e=>setForm(v=>({...v,scheduledAt:e.target.value}))}
                    min={new Date(Date.now()+60000).toISOString().slice(0,16)}
                    style={{ border:'none', background:'transparent', fontSize:12, color:'#60a5fa', fontFamily:"'Outfit', sans-serif", outline:'none', cursor:'pointer' }} />
                  <button onClick={()=>handleSave('scheduled')} disabled={loading} style={{ ...S.btn('#3b82f6'), padding:'5px 10px', fontSize:12, whiteSpace:'nowrap' }}>⏰ 예약</button>
                </div>
                <button onClick={()=>handleSave('published')} disabled={loading} style={{ ...S.btn(), padding:'8px 20px', fontSize:14 }}>
                  {loading ? '저장 중...' : '🚀 발행'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...S.wrap, maxWidth: 'none', padding: '28px 0 0' }}>
        {msg && <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:16, fontSize:14, background:msg.startsWith('🚀')||msg.startsWith('💾')||msg.startsWith('⏰')?'#0a2a0a':'#2a0a0a', color:msg.startsWith('🚀')||msg.startsWith('💾')||msg.startsWith('⏰')?'#4ade80':'#f87171' }}>{msg}</div>}

        {/* ── 글쓰기 뷰 */}
        {view === 'write' && (
          <div style={{ display:'grid', gridTemplateColumns:preview?'1fr 1.1fr':'1fr', gap:24 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>{editId ? '✏️ 글 수정' : '📝 새 글 작성'}</h2>

              <input value={form.title} onChange={e=>setForm(v=>({...v,title:e.target.value,slug:v.slug||slugify(e.target.value)}))}
                placeholder="제목을 입력하세요" style={{ ...S.input, fontSize:18, fontWeight:700, padding:'12px 14px' }} />

              <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10 }}>
                <div>
                  <label style={S.label}>URL 슬러그</label>
                  <input value={form.slug} onChange={e=>setForm(v=>({...v,slug:e.target.value}))} placeholder="url-slug" style={S.input} />
                </div>
                <div>
                  <label style={S.label}>카테고리</label>
                  <select value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))} style={{ ...S.input, background:'#1f1f1f' }}>
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>태그 (쉼표 구분)</label>
                  <input value={form.tags} onChange={e=>setForm(v=>({...v,tags:e.target.value}))} placeholder="태그1, 태그2" style={S.input} />
                </div>
              </div>

              <div>
                <label style={S.label}>요약 (SEO description, 160자 이내)</label>
                <textarea value={form.summary} onChange={e=>setForm(v=>({...v,summary:e.target.value}))} rows={2} maxLength={200}
                  placeholder="검색엔진에 표시될 요약 문구" style={{ ...S.textarea, fontFamily:"'Outfit', sans-serif" }} />
              </div>

              <div>
                <label style={S.label}>발행일 (비워두면 발행 버튼 누른 시각으로 자동 기록)</label>
                <input type="date" value={form.publishedAt ? form.publishedAt.slice(0,10) : ''}
                  onChange={e=>setForm(v=>({...v,publishedAt: e.target.value ? new Date(e.target.value).toISOString() : ''}))}
                  style={S.input} />
              </div>

              <div>
                <label style={S.label}>커버 이미지 URL</label>
                <input value={form.thumbnail} onChange={e=>setForm(v=>({...v,thumbnail:e.target.value}))} placeholder="https://..." style={S.input} />
              </div>

              <div>
                <label style={S.label}>본문 (마크다운)</label>
                <textarea value={form.content} onChange={e=>{setForm(v=>({...v,content:e.target.value}))}}
                  rows={22} placeholder={'# 제목\n\n본문을 마크다운으로 작성하세요.\n\n## 소제목\n\n- 항목 1\n- 항목 2\n\n**굵게** *기울임* `코드`'}
                  style={S.textarea} />
              </div>
            </div>

            {/* 미리보기 */}
            {preview && (
              <div style={{ background:'#f9fafb', borderRadius:12, border:'1px solid #e5e7eb', padding:24, overflowY:'auto', maxHeight:'90vh', position:'sticky', top:80 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>미리보기</div>
                {form.thumbnail && <img src={form.thumbnail} alt="" style={{ width:'100%', height:160, objectFit:'cover', borderRadius:10, marginBottom:16, display:'block' }} />}
                <h1 style={{ fontSize:22, fontWeight:800, color:'#111827', marginBottom:12 }}>{form.title||'(제목 없음)'}</h1>
                {form.summary && <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#92400e', lineHeight:1.7 }}>{form.summary}</div>}
                <div className="md-preview" dangerouslySetInnerHTML={{ __html: parseMd(form.content) }} />
              </div>
            )}
          </div>
        )}

        {/* ── 목록 뷰 */}
        {view === 'list' && (
          <>
            {/* SEO 체크리스트 패널 */}
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', padding:'10px 14px', background:'#161616', borderRadius:activeToolPanel?'10px 10px 0 0':'10px', border:'1px solid #2a2a2a', borderBottom:activeToolPanel?'none':'1px solid #2a2a2a' }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#555', marginRight:4, whiteSpace:'nowrap' }}>🔧 관리 도구</span>
                {Object.entries(TOOL_PANELS).map(([key, t]) => {
                  const isActive = activeToolPanel === key
                  return (
                    <button key={key} onClick={()=>setActiveToolPanel(isActive?null:key)}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, border:`1.5px solid ${t.border}33`, background:isActive?t.activeBg:t.bg, color:t.color, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Outfit', sans-serif", whiteSpace:'nowrap', transition:'all .15s' }}>
                      {t.label} {isActive?'▲':'▼'}
                    </button>
                  )
                })}
              </div>

              {activeToolPanel && (() => {
                const panel = TOOL_PANELS[activeToolPanel]
                return (
                  <div style={{ background:'#161616', border:'1px solid #2a2a2a', borderTop:`3px solid ${panel.border}`, borderRadius:'0 0 12px 12px', padding:'20px 22px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
                      <div>
                        <span style={{ fontSize:16, fontWeight:800, color:panel.color }}>{panel.label} 필수 체크리스트</span>
                        <p style={{ fontSize:12, color:'#555', marginTop:3 }}>아래 항목을 하나씩 확인하고 셋팅하세요.</p>
                      </div>
                      <a href={panel.link} target="_blank" rel="noopener noreferrer"
                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:8, background:panel.color, color:'#fff', fontSize:12, fontWeight:700, textDecoration:'none' }}>
                        {panel.linkLabel}
                      </a>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                      {panel.sections.map((sec, si) => (
                        <div key={si} style={{ background:sec.bg, border:`1.5px solid ${sec.border}`, borderRadius:10, padding:'14px 16px' }}>
                          <div style={{ fontSize:13, fontWeight:800, color:sec.color, marginBottom:10 }}>{sec.title}</div>
                          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            {sec.items.map((item, ii) => {
                              const ck = `${activeToolPanel}__${si}__${ii}`
                              const isAuto = item.text.startsWith('🤖')
                              const checked = isAuto || (ck in checklistChecks ? checklistChecks[ck] : (item.done||false))
                              return (
                                <div key={ii} onClick={()=>!isAuto&&toggleCheck(ck)}
                                  style={{ display:'flex', gap:10, alignItems:'flex-start', background:'rgba(255,255,255,0.05)', borderRadius:8, padding:'10px 12px', cursor:isAuto?'default':'pointer', opacity:checked?0.65:1, transition:'all .15s' }}>
                                  <span style={{ fontSize:18, flexShrink:0, color:checked?'#16a34a':'#555' }}>{checked?'☑':'☐'}</span>
                                  <div style={{ flex:1 }}>
                                    <div style={{ fontSize:13, fontWeight:700, color:checked?'#666':'#f0f0f0', textDecoration:checked&&!isAuto?'line-through':'none' }}>{item.text}</div>
                                    <div style={{ fontSize:12, color:'#666', lineHeight:1.6 }}>{item.desc}</div>
                                  </div>
                                  {isAuto && <span style={{ fontSize:11, color:'#16a34a', fontWeight:700, flexShrink:0 }}>자동완료</span>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* 루틴 달력 */}
            <div style={{ marginBottom:16 }}>
              <button onClick={()=>setShowRoutine(v=>!v)}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#161616', borderRadius:showRoutine?'10px 10px 0 0':'10px', border:'1px solid #2a2a2a', cursor:'pointer', fontFamily:"'Outfit', sans-serif", color:'#f0f0f0' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>📆 루틴 체크리스트 — {year}년 {month+1}월</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#16a34a', background:'#0a2a0a', border:'1px solid #166534', borderRadius:6, padding:'2px 8px' }}>
                    이번 달 {Object.values(dailyCount).reduce((a,b)=>a+b,0)}편
                  </span>
                </div>
                <span style={{ fontSize:12, color:'#555' }}>{showRoutine?'▲ 접기':'▼ 펼치기'}</span>
              </button>

              {showRoutine && (
                <div style={{ background:'#161616', border:'1px solid #2a2a2a', borderTop:'none', borderRadius:'0 0 12px 12px', padding:20 }}>
                  {/* 달력 */}
                  <div style={{ marginBottom:20 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, textAlign:'center', marginBottom:4 }}>
                      {['일','월','화','수','목','금','토'].map(d=>(
                        <div key={d} style={{ fontSize:11, fontWeight:700, color:'#555', padding:'4px 0' }}>{d}</div>
                      ))}
                      {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
                      {Array.from({length:daysInMonth}).map((_,i)=>{
                        const d=i+1, isToday=d===today
                        const isSat=new Date(year,month,d).getDay()===6
                        const isLastSat=d===lastSat, isWeekly=isSat&&!isLastSat, isMonthly=isLastSat
                        const cnt=dailyCount[d]||0
                        return (
                          <div key={d} style={{ padding:'4px 2px', borderRadius:6, background:isToday?'#e63946':isMonthly?'#1a1200':isWeekly?'#001a1f':'transparent', border:(isWeekly||isMonthly)&&!isToday?`1px solid ${isMonthly?'#78500a':'#0e7490'}`:'none', minHeight:40, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                            <div style={{ fontSize:12, fontWeight:isToday?700:400, color:isToday?'#fff':'#aaa' }}>{d}</div>
                            {isMonthly&&!isToday&&<div style={{ fontSize:8, color:'#d97706', lineHeight:1 }}>월간</div>}
                            {isWeekly&&!isToday&&<div style={{ fontSize:8, color:'#0891b2', lineHeight:1 }}>주간</div>}
                            {cnt>0&&<div style={{ fontSize:9, fontWeight:700, color:'#fff', background:'#e63946', borderRadius:3, padding:'0 4px', lineHeight:'15px', minWidth:14, textAlign:'center' }}>{cnt}</div>}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, color:'#0891b2' }}>🔵 주간 (매주 토요일)</span>
                      <span style={{ fontSize:11, color:'#d97706' }}>🟡 월간 (마지막 토요일)</span>
                      <span style={{ fontSize:11, color:'#e63946' }}>🔴 오늘</span>
                    </div>
                  </div>

                  {/* 루틴 섹션 */}
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {Object.entries(ROUTINES).map(([key, r]) => {
                      const periodKey = key==='publish'?'publish':key==='weekly'?getWeekKey():getMonthKey()
                      const isCollapsed = !!collapsedRoutines[key]
                      const checkedCnt = r.items.filter((_,ii)=>!!routineChecks[`${periodKey}__${ii}`]).length
                      return (
                        <div key={key} style={{ border:`1.5px solid ${r.border}33`, borderRadius:10, overflow:'hidden' }}>
                          <button onClick={()=>setCollapsedRoutines(v=>({...v,[key]:!v[key]}))}
                            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:r.bg, border:'none', cursor:'pointer', fontFamily:"'Outfit', sans-serif", color:'#f0f0f0' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:13, fontWeight:800, color:r.color }}>{r.label}</span>
                              <span style={{ fontSize:11, fontWeight:600, color:checkedCnt===r.items.length?'#16a34a':r.color, background:'rgba(255,255,255,0.1)', borderRadius:10, padding:'1px 8px' }}>
                                {checkedCnt}/{r.items.length}
                              </span>
                            </div>
                            <span style={{ fontSize:11, color:r.color }}>{isCollapsed?'▼':'▲'}</span>
                          </button>
                          {!isCollapsed && (
                            <div style={{ background:r.bg, padding:'0 14px 12px', display:'flex', flexDirection:'column', gap:8 }}>
                              {r.items.map((item, ii) => {
                                const mk = `${periodKey}__${ii}`, checked = !!routineChecks[mk]
                                return (
                                  <div key={ii} onClick={()=>toggleRoutine(periodKey, ii)}
                                    style={{ display:'flex', gap:10, alignItems:'flex-start', background:checked?'rgba(16,185,129,0.08)':'rgba(255,255,255,0.05)', borderRadius:8, padding:'10px 12px', cursor:'pointer', opacity:checked?0.7:1, transition:'all .15s' }}>
                                    <span style={{ fontSize:16, flexShrink:0 }}>{checked?'☑':'☐'}</span>
                                    <div style={{ flex:1 }}>
                                      <div style={{ fontSize:13, fontWeight:700, color:'#f0f0f0', textDecoration:checked?'line-through':'none' }}>{item.text}</div>
                                      <div style={{ fontSize:12, color:'#666', lineHeight:1.6 }}>{item.desc}</div>
                                    </div>
                                    {item.link && (
                                      <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                                        style={{ fontSize:11, fontWeight:700, color:r.color, background:'rgba(255,255,255,0.1)', border:`1px solid ${r.border}33`, borderRadius:6, padding:'3px 8px', textDecoration:'none', whiteSpace:'nowrap', flexShrink:0 }}>
                                        바로가기
                                      </a>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 글 필터 */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
              {[['all','전체'], ...allCategories.map(c=>[c,c])].map(([key,label]) => (
                <button key={key} onClick={()=>setFilterType(key)}
                  style={{ padding:'6px 14px', borderRadius:8, border:`1.5px solid ${filterType===key?'#e63946':'#2a2a2a'}`, background:filterType===key?'#2a0a0a':'#161616', color:filterType===key?'#e63946':'#888', fontSize:13, fontWeight:filterType===key?700:500, cursor:'pointer', fontFamily:"'Outfit', sans-serif" }}>
                  {label} {key==='all'?posts.length:posts.filter(p=>(p.category||'thumb-down')===key).length}
                </button>
              ))}
            </div>

            {/* 글 목록 */}
            {loading ? (
              <div style={{ textAlign:'center', padding:48, color:'#555' }}>불러오는 중...</div>
            ) : filteredPosts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', background:'#161616', borderRadius:14, border:'1px solid #2a2a2a', color:'#555' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📝</div>
                <div style={{ fontSize:15, fontWeight:600 }}>아직 작성된 글이 없습니다</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {filteredPosts.map(post => (
                  <div key={post.id} style={{ background:'#161616', borderRadius:12, border:'1.5px solid #2a2a2a', padding:'14px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontSize:11, fontWeight:700, borderRadius:999, padding:'2px 10px',
                          background: post.status==='published'?'#0a2a0a':post.status==='scheduled'?'#0d1b2a':'#1a1a1a',
                          color: post.status==='published'?'#4ade80':post.status==='scheduled'?'#60a5fa':'#888',
                          border:`1px solid ${post.status==='published'?'#166534':post.status==='scheduled'?'#1e3a5f':'#2a2a2a'}` }}>
                          {post.status==='published'?'✅ 발행':post.status==='scheduled'?'⏰ 예약':'📝 임시'}
                        </span>
                        {post.status==='scheduled' && post.scheduled_at && (
                          <span style={{ fontSize:11, color:'#60a5fa' }}>{new Date(post.scheduled_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
                        )}
                        {post.category && <span style={{ fontSize:11, color:'#888', background:'#1f1f1f', borderRadius:4, padding:'2px 8px', border:'1px solid #2a2a2a' }}>{post.category}</span>}
                      </div>
                      <div style={{ fontSize:15, fontWeight:700, color:'#f0f0f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:3 }}>{post.title}</div>
                      <div style={{ fontSize:12, color:'#555' }}>
                        {(post.published_at || post.created_at) ? toKSTDateStr(post.published_at || post.created_at).replace(/-/g, '. ') + '.' : ''}
                        {post.slug && <span style={{ marginLeft:8, opacity:0.5 }}>/blog/{post.slug}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      {post.status==='published' && post.slug && (
                        <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer"
                          style={{ padding:'6px 12px', borderRadius:7, border:'1px solid #2a2a2a', background:'#1f1f1f', color:'#888', fontSize:12, fontWeight:600, textDecoration:'none' }}>보기</a>
                      )}
                      <button onClick={()=>handleEdit(post)}
                        style={{ ...S.btn('#1a3a6a'), padding:'6px 14px', fontSize:12 }}>수정</button>
                      <button onClick={()=>handleDelete(post)}
                        style={{ ...S.btn('#2a0a0a'), padding:'6px 12px', fontSize:12, border:'1px solid #7f1d1d', color:'#f87171' }}>삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
