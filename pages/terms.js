import { useState, useEffect } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'

const I18N = {
  ko: {
    metaTitle: '이용약관 - DownTools',
    metaDesc: 'DownTools 이용약관',
    heading: '이용약관',
    updated: '시행일: 2026년 6월 20일',
    sections: [
      {
        title: '제1조 (목적)',
        content: '본 약관은 DownTools(이하 "서비스")가 제공하는 카드뉴스 변환, 썸네일, 효과음, 보이스, 텍스트, 클럭(타이머) 등 일체의 도구 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.',
      },
      {
        title: '제2조 (서비스의 제공)',
        content: '서비스는 별도의 회원가입 절차 없이 누구나 무료로 이용할 수 있는 온라인 도구를 제공합니다. 서비스 내용은 운영상·기술상 필요에 따라 사전 고지 없이 변경되거나 중단될 수 있습니다.',
      },
      {
        title: '제3조 (이용자의 의무)',
        list: [
          '이용자는 관계 법령 및 본 약관을 준수해야 합니다.',
          '타인의 저작권, 초상권 등 권리를 침해하는 콘텐츠를 제작·배포하지 않습니다.',
          '서비스를 이용해 생성한 카드뉴스, 썸네일, 음성, 텍스트 등 결과물의 법적 책임은 이용자 본인에게 있습니다.',
          '서비스의 정상적인 운영을 방해하는 행위(과도한 트래픽 유발, 자동화 어뷰징 등)를 하지 않습니다.',
        ],
      },
      {
        title: '제4조 (콘텐츠 및 저작권)',
        content: '이용자가 서비스를 통해 직접 생성한 결과물의 저작권은 원칙적으로 이용자에게 귀속됩니다. 단, 서비스 내에서 제공하는 템플릿, 디자인 요소, 소스 코드 등에 대한 권리는 서비스 운영자에게 있습니다.',
      },
      {
        title: '제5조 (광고 게재)',
        content: '서비스는 무료 제공을 위해 화면 내 광고를 게재할 수 있으며, 광고는 Google AdSense 등 제3자 광고 네트워크를 통해 운영될 수 있습니다.',
      },
      {
        title: '제6조 (면책조항)',
        content: '서비스는 천재지변, 시스템 점검, 제3자 서비스 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다. 또한 이용자가 서비스를 통해 생성·게시한 콘텐츠로 발생한 분쟁에 대해 서비스 운영자는 책임을 지지 않습니다.',
      },
      {
        title: '제7조 (약관의 변경)',
        content: '본 약관은 관련 법령 변경 또는 서비스 정책 변경에 따라 개정될 수 있으며, 개정 시 서비스 내 공지를 통해 안내합니다.',
      },
    ],
  },
  en: {
    metaTitle: 'Terms of Use - DownTools',
    metaDesc: 'DownTools Terms of Use',
    heading: 'Terms of Use',
    updated: 'Effective date: June 20, 2026',
    sections: [
      {
        title: 'Article 1 (Purpose)',
        content: 'These Terms govern the rights, obligations, and responsibilities between DownTools (the "Service") and users in connection with the use of tools including CardNews Converter, Thumbnail, Sound, Voice, Text, and Clock (Timer).',
      },
      {
        title: 'Article 2 (Provision of Service)',
        content: 'The Service provides free online tools that anyone can use without sign-up. Service content may change or be suspended without prior notice for operational or technical reasons.',
      },
      {
        title: 'Article 3 (User Obligations)',
        list: [
          'Users must comply with applicable laws and these Terms.',
          'Users must not create or distribute content that infringes on others\' copyrights, portrait rights, or other rights.',
          'Users are solely responsible for any legal consequences arising from card news, thumbnails, voice, text, or other content they create using the Service.',
          'Users must not engage in activities that disrupt normal Service operation, such as excessive traffic or automated abuse.',
        ],
      },
      {
        title: 'Article 4 (Content and Copyright)',
        content: 'Copyright of output directly created by users through the Service generally belongs to the user. However, rights to templates, design elements, and source code provided within the Service belong to the Service operator.',
      },
      {
        title: 'Article 5 (Advertising)',
        content: 'The Service may display ads to remain free, operated through third-party advertising networks such as Google AdSense.',
      },
      {
        title: 'Article 6 (Disclaimer)',
        content: 'The Service is not liable for interruptions caused by force majeure events, system maintenance, or third-party service failures. The Service operator is not responsible for disputes arising from content created or published by users through the Service.',
      },
      {
        title: 'Article 7 (Changes to Terms)',
        content: 'These Terms may be revised due to changes in applicable law or service policy, and such changes will be announced within the Service.',
      },
    ],
  },
}

export default function Terms() {
  const [lang, setLang] = useState('ko')
  const [customTerms, setCustomTerms] = useState(null)   // 관리자가 저장한 한국어 본문
  const [customTermsEn, setCustomTermsEn] = useState(null) // 관리자가 저장한 영어 본문
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('dt_lang')
    if (saved === 'en' || saved === 'ko') setLang(saved)

    fetch('/api/settings/get').then(r => r.json()).then(d => {
      if (d.terms && d.terms.trim()) setCustomTerms(d.terms)
      if (d.termsEn && d.termsEn.trim()) setCustomTermsEn(d.termsEn)
    }).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  const toggleLang = () => {
    const next = lang === 'ko' ? 'en' : 'ko'
    setLang(next)
    localStorage.setItem('dt_lang', next)
  }

  const t = I18N[lang]
  const customText = lang === 'ko' ? customTerms : customTermsEn
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
                {s.content && <p>{s.content}</p>}
                {s.list && (
                  <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {s.list.map((li, j) => <li key={j}>{li}</li>)}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      <Footer lang={lang} siteName="Unified Tools" />
    </>
  )
}
