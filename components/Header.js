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
  { href: '/',              label: '🏠 홈' },
  { href: '/cardnews-down', label: '📰 카드뉴스' },
  { href: '/thumb-down',    label: '🖼 썸네일' },
  { href: '/sound-down',    label: '🔊 효과음' },
  { href: '/voice-down',    label: '🎤 보이스' },
  { href: '/text-down',     label: '📝 텍스트' },
  { href: '/clock-down',    label: '⏱ 클럭' },
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
                    {t.label}
                  </Link>
                )
              })}
              <Link href="/blog"
                className={`nav-link${router.pathname.startsWith('/blog') ? ' active' : ''}`}>
                📝 블로그
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
