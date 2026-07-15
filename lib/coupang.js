// 쿠팡 파트너스 노출 헬퍼
// 관리자가 등록한
//  1) "링크 목록" (링크만)
//  2) "위젯 목록" 중 사이즈가 지정되지 않은 것 (본문 하단 등에 넣는 일반 위젯)
// 를 모아서 보여준다. 링크와 위젯은 서로 완전히 별개의 목록이다.
//
// * 사이즈(728x90/160x600/300x250 등)가 지정된 위젯은 관리자 설정(광고 관리)의
//   슬롯 코드로 직접 붙여넣어 쓰는 용도이며, 이 헬퍼가 자동으로 골라 쓰지 않는다.
//
// * 링크는 반드시 쿠팡 파트너스 사이트(partners.coupang.com)의
//   "간편 링크 만들기" 등으로 직접 생성한 뒤 "링크 목록"에 등록해야 실적으로 집계된다.

// links:   [{ id, label, url, enabled }]
// widgets: [{ id, label, size, widget_html, enabled }]
//
// 반환값: { links: [{label, url}], widgets: [htmlString] }
export function resolveCoupangDisplay(links, widgets) {
  const resultLinks = []
  const resultWidgets = []

  ;(Array.isArray(links) ? links : []).forEach(l => {
    if (l.enabled && l.url) resultLinks.push({ label: l.label || '쿠팡에서 보기', url: l.url })
  })

  ;(Array.isArray(widgets) ? widgets : []).forEach(w => {
    if (w.enabled && w.widget_html && !w.size) resultWidgets.push(w.widget_html)
  })

  return { links: resultLinks, widgets: resultWidgets }
}
