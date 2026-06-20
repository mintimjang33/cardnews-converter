// 관리자(admin)가 저장한 adSlots 배열에서 id로 슬롯을 찾는 헬퍼
// 못 찾으면 null을 반환하고, 호출 측 컴포넌트는 기존 placeholder/환경변수 동작으로 폴백한다.
export function findAdSlot(adSlots, id) {
  if (!Array.isArray(adSlots)) return null
  return adSlots.find(s => s.id === id) || null
}
