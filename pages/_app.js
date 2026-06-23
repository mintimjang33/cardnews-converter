import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* 검색엔진 인증 */}
        <meta name="google-site-verification" content="828Mf-hRlCpwvG4M6VOXjZidjk3eV0a5Pe4OVnXhq0Y" />
        <meta name="naver-site-verification" content="YOUR_NAVER_VERIFICATION_CODE" />
        <meta name="yandex-verification" content="YOUR_YANDEX_VERIFICATION_CODE" />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=YOUR_ADSENSE_CLIENT_ID"
          crossOrigin="anonymous"
        />

        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA4_ID" />
        <script dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'YOUR_GA4_ID');
          `
        }} />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
