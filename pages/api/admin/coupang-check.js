// 쿠팡 파트너스 링크 생존 여부 확인 (관리자 전용)
// - 서버에서 직접 링크를 열어보고(리다이렉트 추적) 상품이 삭제/품절/에러 페이지로
//   연결되는지 텍스트 패턴과 응답 상태로 최대한 판별한다.
// - 쿠팡은 자동화된 요청을 막거나 SPA 셸만 내려줄 수 있어 100% 정확하지는 않다.
//   판별이 애매한 경우엔 ok:null("확인 불가")을 내려줘서 오탐(정상인데 삭제됐다고 표시)을 피한다.

function isAdmin(req) {
  return req.headers['x-admin-token'] === process.env.ADMIN_SECRET_TOKEN
}

const NOT_FOUND_PATTERNS = [
  '존재하지 않는 상품',
  '존재하지 않는 페이지',
  '상품이 존재하지 않습니다',
  '판매가 중지된 상품',
  '판매중지',
  '품절된 상품',
  '요청하신 페이지를 찾을 수 없습니다',
  '페이지를 찾을 수 없습니다',
  '삭제된 상품',
  'sold out',
  'soldout',
  'page not found',
]

export default async function handler(req, res) {
  if (!isAdmin(req)) return res.status(401).json({ error: '인증 실패' })
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'url 필요' })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    clearTimeout(timeout)

    const finalUrl = response.url || url
    const status = response.status
    let text = ''
    try { text = (await response.text()).slice(0, 20000) } catch {}

    const hasNotFoundText = NOT_FOUND_PATTERNS.some(p => text.toLowerCase().includes(p.toLowerCase()))
    const looksLikeErrorRedirect = /\/(error|notfound|404)(\/|$|\?)/i.test(finalUrl)

    if (status >= 400 || hasNotFoundText || looksLikeErrorRedirect) {
      return res.status(200).json({ ok: false, status, finalUrl, checkedAt: new Date().toISOString() })
    }

    if (status >= 200 && status < 400) {
      return res.status(200).json({ ok: true, status, finalUrl, checkedAt: new Date().toISOString() })
    }

    return res.status(200).json({ ok: null, status, finalUrl, checkedAt: new Date().toISOString() })
  } catch (e) {
    clearTimeout(timeout)
    return res.status(200).json({ ok: null, error: e.message, checkedAt: new Date().toISOString() })
  }
}
