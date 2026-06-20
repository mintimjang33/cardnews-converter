import { useState, useEffect } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { findAdSlot } from '../lib/adSlots'

const I18N = {
  ko: {
    metaTitle: 'FAQ - DownTools',
    metaDesc: 'DownTools 자주 묻는 질문',
    heading: 'FAQ',
    sub: '자주 묻는 질문을 모았습니다',
    faqs: [
      { q: '모든 도구를 무료로 이용할 수 있나요?', a: '네, 카드뉴스 변환, 썸네일, 효과음, 보이스, 텍스트, 클럭(타이머) 등 모든 도구는 별도 회원가입 없이 무료로 이용하실 수 있습니다.' },
      { q: '카드뉴스 변환은 어떻게 하나요?', a: 'HTML 카드뉴스 파일을 변환기 페이지에 드래그하면 PNG 이미지 7장과 슬라이드 영상이 자동으로 생성됩니다. 생성된 이미지는 인스타그램 캐러셀 업로드용으로 바로 사용할 수 있습니다.' },
      { q: '입력한 텍스트나 이미지가 서버에 저장되나요?', a: '대부분의 도구는 브라우저 내에서 처리되며 서버로 전송되거나 저장되지 않습니다. 자세한 내용은 개인정보처리방침을 참고해 주세요.' },
      { q: '회원가입이 꼭 필요한가요?', a: '일반 이용자는 회원가입이 필요하지 않습니다. 관리자(admin) 기능을 사용하는 경우에만 로그인이 필요합니다.' },
      { q: '생성한 이미지나 영상의 저작권은 누구에게 있나요?', a: '이용자가 직접 입력한 콘텐츠로 생성한 결과물의 저작권은 이용자 본인에게 있습니다. 자세한 내용은 이용약관을 참고해 주세요.' },
      { q: '광고가 보이는 이유는 무엇인가요?', a: '모든 도구를 무료로 운영하기 위해 페이지 일부에 광고를 게재하고 있습니다. 광고 수익은 서비스 운영 및 개선에 사용됩니다.' },
      { q: '모바일에서도 이용할 수 있나요?', a: '네, 모바일 브라우저에서도 동일하게 이용 가능합니다. 다만 화면 크기에 따라 일부 사이드바 광고 영역은 표시되지 않을 수 있습니다.' },
      { q: '오류가 발생하거나 문의하고 싶을 때는 어떻게 하나요?', a: '사이트 운영자에게 문의해 주시면 빠르게 확인 후 답변드리겠습니다. 문의 방법은 개인정보처리방침 페이지의 문의처를 참고해 주세요.' },
    ],
  },
  en: {
    metaTitle: 'FAQ - DownTools',
    metaDesc: 'DownTools Frequently Asked Questions',
    heading: 'FAQ',
    sub: 'Answers to common questions about DownTools',
    faqs: [
      { q: 'Are all tools free to use?', a: 'Yes, all tools — CardNews Converter, Thumbnail, Sound, Voice, Text, and Clock (Timer) — are completely free and require no sign-up.' },
      { q: 'How does the CardNews Converter work?', a: 'Drag an HTML card news file into the converter page, and it automatically generates 7 PNG images plus a slideshow video, ready to upload as an Instagram carousel.' },
      { q: 'Is my text or image data stored on your servers?', a: 'Most tools process your data entirely in your browser — nothing is sent to or stored on our servers. See our Privacy Policy for details.' },
      { q: 'Is sign-up required?', a: 'No sign-up is required for regular use. Login is only required for admin features.' },
      { q: 'Who owns the copyright to content I generate?', a: 'Copyright of output you create using content you provided generally belongs to you. See our Terms of Use for details.' },
      { q: 'Why do I see ads on the site?', a: 'Ads are displayed on parts of the page to keep all tools free. Ad revenue is used to operate and improve the service.' },
      { q: 'Can I use this on mobile?', a: 'Yes, all tools work the same way on mobile browsers, though some sidebar ad areas may not display depending on screen size.' },
      { q: 'How do I report an issue or contact support?', a: 'Please reach out through the site operator\'s contact channel listed on the Privacy Policy page, and we\'ll respond as quickly as possible.' },
    ],
  },
}

export default function FAQ() {
  const [lang, setLang] = useState('ko')
  const [openIndex, setOpenIndex] = useState(null)
  const [adsOn, setAdsOn] = useState(true)
  const [adSlots, setAdSlots] = useState([])
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('dt_lang')
    if (saved === 'en' || saved === 'ko') setLang(saved)
    fetch('/api/settings/get').then(r => r.json()).then(d => {
      if (d.adsOn !== undefined) setAdsOn(d.adsOn)
      if (d.adSlots !== undefined) setAdSlots(d.adSlots)
    }).catch(() => {}).finally(() => setSettingsLoaded(true))
  }, [])

  const toggleLang = () => {
    const next = lang === 'ko' ? 'en' : 'ko'
    setLang(next)
    localStorage.setItem('dt_lang', next)
  }

  const t = I18N[lang]

  return (
    <>
      <Head>
        <title>{t.metaTitle}</title>
        <meta name="description" content={t.metaDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Header lang={lang} onToggleLang={toggleLang} siteName="DownTools" siteHref="/" />

      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{t.heading}</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 32 }}>{t.sub}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {t.faqs.map((item, i) => {
            const isOpen = openIndex === i
            return (
              <div key={i} style={{
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                background: 'var(--surface)', overflow: 'hidden'
              }}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--text)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', textAlign: 'left'
                  }}
                >
                  <span>{item.q}</span>
                  <span style={{ color: 'var(--text2)', fontSize: 18, flexShrink: 0, marginLeft: 12 }}>
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 18px 16px', fontSize: 13, lineHeight: 1.8, color: 'var(--text2)' }}>
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Footer lang={lang} siteName="Unified Tools" adsOn={adsOn} slotData={findAdSlot(adSlots, 'footer')} loaded={settingsLoaded} />
    </>
  )
}
