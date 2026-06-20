import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DEFAULT_TERMS = `이용약관

제1조 (목적)
본 약관은 DownTools(이하 "서비스")가 제공하는 카드뉴스 변환, 썸네일, 효과음, 보이스, 텍스트, 클럭(타이머) 등 일체의 도구 이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (서비스의 제공)
서비스는 별도의 회원가입 절차 없이 누구나 무료로 이용할 수 있는 온라인 도구를 제공합니다. 서비스 내용은 운영상·기술상 필요에 따라 사전 고지 없이 변경되거나 중단될 수 있습니다.

제3조 (이용자의 의무)
이용자는 관계 법령 및 본 약관을 준수해야 하며, 타인의 권리를 침해하는 콘텐츠를 제작·배포하지 않습니다.

제4조 (면책조항)
서비스는 천재지변, 시스템 점검 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.`

const DEFAULT_PRIVACY = `개인정보처리방침

1. 수집하는 개인정보 항목
서비스는 별도 회원가입 없이 이용할 수 있습니다. 서비스 이용 과정에서 접속 IP, 쿠키, 방문 일시, 브라우저·기기 정보가 자동으로 수집될 수 있습니다.

2. 개인정보의 수집 및 이용 목적
수집된 정보는 서비스 제공 및 운영, 이용 통계 분석, 광고 게재 목적으로 이용됩니다.

3. 쿠키의 운영 및 광고 제공
본 사이트는 Google 등 제3자 광고 네트워크를 통해 광고를 게재하며, 이 과정에서 쿠키가 사용될 수 있습니다.

4. 개인정보의 보유 및 이용 기간
수집된 정보는 목적 달성 후 지체 없이 파기함을 원칙으로 합니다.`

const DEFAULT_AD_SLOTS = [
  { id: 'home_top',      name: '전체 페이지 상단 배너',     w: '100%', h: 90,  active: false, code: '' },
  { id: 'home_left',     name: '전체 페이지 좌측 사이드',   w: 160,    h: 600, active: false, code: '' },
  { id: 'home_right',    name: '전체 페이지 우측 사이드',   w: 160,    h: 600, active: false, code: '' },
  { id: 'home_middle',   name: '전체 페이지 중단 배너',     w: '100%', h: 90,  active: false, code: '' },
  { id: 'home_cooldown', name: '다운로드 대기 화면 배너',   w: '100%', h: 250, active: false, code: '' },
  { id: 'footer',        name: '전체 페이지 하단 푸터 배너', w: '100%', h: 90,  active: false, code: '' },
]

const DEFAULTS = {
  cooldown: 12,
  adsOn: true,
  terms: DEFAULT_TERMS,
  privacy: DEFAULT_PRIVACY,
  adSlots: DEFAULT_AD_SLOTS,
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const { data, error } = await supabase.from('settings').select('key, value')
    if (error) throw error
    const map = {}
    for (const row of data || []) map[row.key] = row.value
    res.status(200).json({
      cooldown: map['site:cooldown'] ?? DEFAULTS.cooldown,
      adsOn:    map['site:ads_on']   ?? DEFAULTS.adsOn,
      terms:    map['site:terms']    ?? DEFAULTS.terms,
      privacy:  map['site:privacy']  ?? DEFAULTS.privacy,
      termsEn:  map['site:terms_en']   ?? null,
      privacyEn:map['site:privacy_en'] ?? null,
      adSlots:  map['site:ad_slots'] ?? DEFAULTS.adSlots,
    })
  } catch (err) {
    res.status(200).json(DEFAULTS)
  }
}
