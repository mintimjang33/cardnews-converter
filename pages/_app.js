import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* Google Fonts preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* 검색엔진 인증 */}
        <meta name="google-site-verification" content="828Mf-hRlCpwvG4M6VOXjZidjk3eV0a5Pe4OVnXhq0Y" />
        <meta name="naver-site-verification" content="c684c5f62177e061e405ce1be7874e0c2b52650b" />
        <meta name="yandex-verification" content="YOUR_YANDEX_VERIFICATION_CODE" />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=YOUR_ADSENSE_CLIENT_ID"
          crossOrigin="anonymous"
        />

        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-SCEZB3HBQG" />
        <script dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SCEZB3HBQG');
          `
        }} />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
