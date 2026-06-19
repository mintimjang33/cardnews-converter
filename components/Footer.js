import Link from 'next/link'
import { AdSlot } from './AdSlot'

export default function Footer({ lang = 'ko', adsOn = true, siteName = 'Unified Tools' }) {
  return (
    <footer className="footer">
      <div className="wrap">
        {adsOn && (
          <AdSlot
            slot={process.env.NEXT_PUBLIC_AD_SLOT_FOOTER || '4444444444'}
            label={lang === 'ko' ? '광고' : 'Ad'}
          />
        )}
        <p className="footer-text">© 2024 {siteName}. All rights reserved.</p>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ color: '#444', fontSize: 12, textDecoration: 'none' }}>개인정보처리방침</Link>
          <Link href="/terms" style={{ color: '#444', fontSize: 12, textDecoration: 'none' }}>이용약관</Link>
          <Link href="/faq" style={{ color: '#444', fontSize: 12, textDecoration: 'none' }}>FAQ</Link>
          <Link href="/blog" style={{ color: '#444', fontSize: 12, textDecoration: 'none' }}>블로그</Link>
        </div>
        <Link href="/admin" className="admin-link">admin</Link>
      </div>
    </footer>
  )
}
