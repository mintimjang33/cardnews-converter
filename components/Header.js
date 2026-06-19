import Link from 'next/link'
import { useRouter } from 'next/router'

const PAGE_ACCENTS = {
  '/':              '#e63946',
  '/cardnews-down': '#FF4B6E',
  '/thumb-down':    '#e63946',
  '/sound-down':    '#00d4aa',
  '/voice-down':    '#b48ef0',
  '/text-down':     '#3b82f6',
  '/clock-down':    '#c9a84c',
}

// 로고 아이콘: siteName에 따라 매핑
const LOGO_ICONS = {
  'DownTools':     '▶',
  'CardNews-Down': '📰',
  'Thumb-Down':    '🖼',
  'Sound-Down':    '🔊',
  'Voice-Down':    '🎤',
  'Text-Down':     '📝',
  'Clock-Down':    '⏱',
}

const TOOLS = [
  { href: '/',              ko: '🏠 홈',      en: '🏠 Home' },
  { href: '/cardnews-down', ko: '📰 카드뉴스', en: '📰 CardNews' },
  { href: '/thumb-down',    ko: '🖼 썸네일',   en: '🖼 Thumbnail' },
  { href: '/sound-down',    ko: '🔊 효과음',   en: '🔊 Sounds' },
  { href: '/voice-down',    ko: '🎤 보이스',   en: '🎤 Voice' },
  { href: '/text-down',     ko: '📝 텍스트',   en: '📝 Text' },
  { href: '/clock-down',    ko: '⏱ 클럭',     en: '⏱ Clock' },
]

export default function Header({ lang, onToggleLang, siteName = 'DownTools', siteHref = '/' }) {
  const router = useRouter()

  const accent = Object.entries(PAGE_ACCENTS)
    .filter(([path]) => path !== '/')
    .find(([path]) => router.pathname.startsWith(path))?.[1]
    || PAGE_ACCENTS['/']

  const icon = LOGO_ICONS[siteName] || '▶'

  return (
    <>
      <style>{`:root { --accent: ${accent}; }`}</style>

      <header className="header">
        <div className="wrap header-inner">
          {/* 로고 클릭 → 항상 홈(/) */}
          <Link href="/" className="logo">
            <div className="logo-icon">{icon}</div>
            <span className="logo-text">{siteName}</span>
          </Link>
          <div className="header-right">
            <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {TOOLS.map(t => {
                const isActive = t.href === '/'
                  ? router.pathname === '/'
                  : router.pathname.startsWith(t.href)
                const color = PAGE_ACCENTS[t.href]
                return (
                  <Link key={t.href} href={t.href}
                    className={`nav-link${isActive ? ' active' : ''}`}
                    style={isActive ? { color, background: `${color}18`, borderColor: `${color}44` } : {}}>
                    {lang === 'en' ? t.en : t.ko}
                  </Link>
                )
              })}
              <Link href="/blog"
                className={`nav-link${router.pathname.startsWith('/blog') ? ' active' : ''}`}>
                {lang === 'en' ? '📝 Blog' : '📝 블로그'}
              </Link>
            </nav>
            {onToggleLang && (
              <button className="lang-btn" onClick={onToggleLang}>
                {lang === 'ko' ? '🇺🇸 EN' : '🇰🇷 KR'}
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
