// 블로그 기본 카테고리 (사이트별 자동 생성, 삭제 불가)
// BlogAdminPanel(글쓰기), BlogMenuPanel(메뉴관리), pages/blog/index.js(공개 필터)
// 세 곳에서 전부 이 목록을 공유한다. 여기서 하나 추가/삭제하면 세 곳 모두 반영됨.
export const DEFAULT_CATEGORIES = [
  'thumb-down', 'sound-down', 'clock-down', 'voice-down', 'text-down', 'sensor-game', 'general',
]

// 기본 카테고리의 공개 페이지 표시용 라벨(아이콘 포함)
// 커스텀 카테고리는 매핑이 없으므로 label 그대로 사용됨
const CATEGORY_LABELS = {
  'thumb-down':  '🖼 썸네일',
  'sound-down':  '🔊 효과음',
  'clock-down':  '⏱ 타이머',
  'voice-down':  '🎤 보이스',
  'text-down':   '📝 텍스트',
  'sensor-game': '🎮 센서게임',
  'general':     '💡 일반',
}

export function categoryLabel(id) {
  return CATEGORY_LABELS[id] || id
}
