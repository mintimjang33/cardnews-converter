import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'

const PAGE_ACCENTS = {
  '/':              '#e63946',
  '/cardnews-down': '#FF4B6E',
  '/thumb-down':    '#e63946',
  '/sound-down':    '#00d4aa',
  '/voice-down':    '#b48ef0',
  '/text-down':     '#3b82f6',
  '/clock-down':    '#c9a84c',
}

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
  const [menuOpen, setMenuOpen] = useState(false)

  const accent = Object.entries(PAGE_ACCENTS)
    .filter(([path]) => path !== '/')
    .find(([path]) => router.pathname.startsWith(path))?.[1]
    || PAGE_ACCENTS['/']

  const icon = LOGO_ICONS[siteName] || '▶'

  const allLinks = [
    ...TOOLS,
    { href: '/blog', ko: '📝 블로그', en: '📝 Blog' },
  ]

  return (
    <>
      <style>{`
        :root { --accent: ${accent}; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 6px; color: var(--text); font-size: 22px; line-height: 1; }
        .mobile-menu { display: none; }
        @media (max-width: 768px) {
          .header-nav { display: none !important; }
          .hamburger { display: flex; align-items: center; justify-content: center; }
          .mobile-menu {
            display: ${menuOpen ? 'flex' : 'none'};
            flex-direction: column;
            position: fixed;
            top: 56px;
            left: 0; right: 0;
            background: var(--bg);
            border-bottom: 1px solid var(--border);
            padding: 12px 16px;
            gap: 6px;
            z-index: 999;
          }
          .mobile-menu a {
            display: block;
            padding: 10px 14px;
            border-radius: 8px;
            text-decoration: none;
            color: var(--text);
            font-size: 15px;
            font-weight: 600;
          }
          .mobile-menu a:hover, .mobile-menu a.active {
            background: var(--surface2);
            color: var(--accent);
          }
        }
      `}</style>

      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <div className="logo-icon">{icon}</div>
            <span className="logo-text">{siteName}</span>
          </Link>
          <div className="header-right">
            <nav className="header-nav">
              {allLinks.map(t => {
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
            </nav>
            {onToggleLang && (
              <button className="lang-btn" onClick={onToggleLang}>
                {lang === 'ko' ? '🇺🇸 EN' : '🇰🇷 KR'}
              </button>
            )}
            <button className="hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="메뉴">
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      <div className="mobile-menu">
        {allLinks.map(t => {
          const isActive = t.href === '/'
            ? router.pathname === '/'
            : router.pathname.startsWith(t.href)
          return (
            <Link key={t.href} href={t.href}
              className={isActive ? 'active' : ''}
              onClick={() => setMenuOpen(false)}>
              {lang === 'en' ? t.en : t.ko}
            </Link>
          )
        })}
      </div>
    </>
  )
}
