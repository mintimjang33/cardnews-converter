import Link from 'next/link'
import { useRouter } from 'next/router'

const TOOLS = [
  { href: '/',           label: '🏠 홈' },
  { href: '/thumb-down', label: '🖼 썸네일' },
  { href: '/sound-down', label: '🔊 효과음' },
  { href: '/voice-down', label: '🎤 보이스' },
  { href: '/text-down',  label: '📝 텍스트' },
  { href: '/clock-down', label: '⏱ 클럭' },
]

export default function Header({ lang, onToggleLang, siteName = 'Tools', siteHref = '/' }) {
  const router = useRouter()

  return (
    <header className="header">
      <div className="wrap header-inner">
        <Link href={siteHref} className="logo">
          <div className="logo-icon">▶</div>
          <span className="logo-text">{siteName}</span>
        </Link>
        <div className="header-right">
          <nav style={{ display: 'flex', gap: 4 }}>
            {TOOLS.map(t => (
              <Link key={t.href} href={t.href}
                className={`nav-link${router.pathname === t.href ? ' active' : ''}`}>
                {t.label}
              </Link>
            ))}
            <Link href="/blog" className={`nav-link${router.pathname.startsWith('/blog') ? ' active' : ''}`}>
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
  )
}
