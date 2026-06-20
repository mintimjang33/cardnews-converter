import { useState, useEffect } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { findAdSlot } from '../lib/adSlots'

const I18N = {
  ko: {
    metaTitle: '개인정보처리방침 - DownTools',
    metaDesc: 'DownTools 개인정보처리방침',
    heading: '개인정보처리방침',
    updated: '시행일: 2026년 6월 20일',
    sections: [
      {
        title: '1. 수집하는 개인정보 항목',
        content: '카드뉴스 변환, 썸네일, 효과음, 보이스, 텍스트, 클럭(타이머) 등 모든 도구는 별도 회원가입 없이 이용할 수 있습니다. 대부분의 도구는 입력하신 텍스트·이미지·오디오를 브라우저 내에서 처리하며 서버에 저장하지 않습니다. 다만 서비스 이용 과정에서 접속 IP, 쿠키, 방문 일시, 브라우저·기기 정보가 자동으로 수집될 수 있으며, 관리자 도구 이용 시에는 로그인 정보가 수집됩니다.',
      },
      {
        title: '2. 개인정보의 수집 및 이용 목적',
        content: '수집된 정보는 도구 기능 제공 및 운영, 서비스 이용 통계 분석과 품질 개선, 그리고 Google AdSense 등 광고 네트워크를 통한 맞춤형 광고 게재 목적으로 이용됩니다.',
      },
      {
        title: '3. 쿠키(Cookie)의 운영 및 광고 제공',
        content: '본 사이트는 무료 서비스 운영을 위해 Google 등 제3자 광고 네트워크를 통해 광고를 게재하며, 이 과정에서 쿠키가 사용될 수 있습니다. 이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으며, 이 경우 일부 기능 이용에 제한이 있을 수 있습니다.',
      },
      {
        title: '4. 개인정보의 보유 및 이용 기간',
        content: '수집된 정보는 수집 목적 달성 후 지체 없이 파기함을 원칙으로 하며, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 안전하게 보관합니다.',
      },
      {
        title: '5. 개인정보의 제3자 제공',
        content: '본 서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 법령에 근거하거나 수사기관의 적법한 절차에 따른 요청이 있는 경우는 예외로 합니다.',
      },
      {
        title: '6. 이용자의 권리',
        content: '이용자는 언제든지 자신의 개인정보 처리 현황에 대해 열람, 정정, 삭제를 요청할 수 있습니다.',
      },
      {
        title: '7. 문의처',
        content: '개인정보 관련 문의사항은 사이트 내 고객센터 또는 운영자 이메일을 통해 접수해 주시기 바랍니다.',
      },
    ],
    note: '본 방침은 관련 법령 및 서비스 정책 변경에 따라 사전 고지 없이 수정될 수 있습니다.',
  },
  en: {
    metaTitle: 'Privacy Policy - DownTools',
    metaDesc: 'DownTools Privacy Policy',
    heading: 'Privacy Policy',
    updated: 'Effective date: June 20, 2026',
    sections: [
      {
        title: '1. Information We Collect',
        content: 'All tools — CardNews Converter, Thumbnail, Sound, Voice, Text, and Clock (Timer) — are available without sign-up. Most tools process the text, images, or audio you provide directly in your browser and do not store it on our servers. However, basic information such as IP address, cookies, visit timestamps, and browser/device information may be collected automatically. Login information is collected only when using the admin tools.',
      },
      {
        title: '2. Purpose of Collection and Use',
        content: 'Collected information is used to provide and operate tool features, analyze usage statistics for service improvement, and serve personalized ads through advertising networks such as Google AdSense.',
      },
      {
        title: '3. Cookies and Advertising',
        content: 'To keep our tools free, this site displays ads through third-party advertising networks such as Google, which may use cookies. You can disable cookies in your browser settings, though this may limit some features.',
      },
      {
        title: '4. Retention Period',
        content: 'Collected information is deleted without delay once its purpose has been fulfilled, except where retention is required by applicable law.',
      },
      {
        title: '5. Third-Party Disclosure',
        content: 'We do not share your personal information with third parties, except where required by law or requested through lawful procedures by investigative authorities.',
      },
      {
        title: '6. Your Rights',
        content: 'You may request to view, correct, or delete your personal information at any time.',
      },
      {
        title: '7. Contact',
        content: 'For privacy-related inquiries, please reach out through the site\'s support channel or the operator\'s email.',
      },
    ],
    note: 'This policy may be updated without prior notice due to changes in applicable law or service policy.',
  },
}

export default function Privacy() {
  const [lang, setLang] = useState('ko')
  const [customPrivacy, setCustomPrivacy] = useState(null)     // 관리자가 저장한 한국어 본문
  const [customPrivacyEn, setCustomPrivacyEn] = useState(null) // 관리자가 저장한 영어 본문
  const [loaded, setLoaded] = useState(false)
  const [adsOn, setAdsOn] = useState(true)
  const [adSlots, setAdSlots] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem('dt_lang')
    if (saved === 'en' || saved === 'ko') setLang(saved)

    fetch('/api/settings/get').then(r => r.json()).then(d => {
      if (d.privacy && d.privacy.trim()) setCustomPrivacy(d.privacy)
      if (d.privacyEn && d.privacyEn.trim()) setCustomPrivacyEn(d.privacyEn)
      if (d.adsOn !== undefined) setAdsOn(d.adsOn)
      if (d.adSlots !== undefined) setAdSlots(d.adSlots)
    }).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  const toggleLang = () => {
    const next = lang === 'ko' ? 'en' : 'ko'
    setLang(next)
    localStorage.setItem('dt_lang', next)
  }

  const t = I18N[lang]
  const customText = lang === 'ko' ? customPrivacy : customPrivacyEn
  const useCustom = !!customText

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
        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 32 }}>{t.updated}</p>

        {!loaded ? null : useCustom ? (
          <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
            {customText}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, fontSize: 14, lineHeight: 1.8, color: 'var(--text2)' }}>
            {t.sections.map((s, i) => (
              <section key={i}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{s.title}</h2>
                <p>{s.content}</p>
              </section>
            ))}

            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12 }}>{t.note}</p>
          </div>
        )}
      </div>

      <Footer lang={lang} siteName="Unified Tools" adsOn={adsOn} slotData={findAdSlot(adSlots, 'footer')} />
    </>
  )
}
