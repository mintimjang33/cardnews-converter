import Link from 'next/link'
import { useRouter } from 'next/router'

// 각 페이지 원래 테마 accent 색상 (각 사이트 globals.css :root --accent 기준)
const PAGE_ACCENTS = {
  '/':              '#e63946', // cardnews 기본
  '/cardnews-down': '#FF4B6E',
  '/thumb-down':    '#e63946',
  '/sound-down':    '#00d4aa',
  '/voice-down':    '#b48ef0', // Voice-Down 원래 테마
  '/text-down':     '#3b82f6',
  '/clock-down':    '#c9a84c', // Clock-Down 원래 골드 테마
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

  // 현재 경로의 accent 색상
  const accent = Object.entries(PAGE_ACCENTS)
    .filter(([path]) => path !== '/')
    .find(([path]) => router.pathname.startsWith(path))?.[1]
    || PAGE_ACCENTS['/']

  return (
    <>
      <style>{`:root { --accent: ${accent}; }`}</style>

      <header className="header">
        <div className="wrap header-inner">
          <Link href={siteHref} className="logo">
            <div className="logo-icon">▶</div>
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
