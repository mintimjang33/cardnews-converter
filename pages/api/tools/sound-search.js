/**
 * /api/search
 * Freesound.org API를 통해 CC0 무료 효과음 검색
 * API 키: freesound.org에서 무료 발급 (일 2,000회 무료)
 */

const CATEGORY_TAGS = {
  animal:  'animals',
  youtube: 'soundeffect',
  nature:  'nature',
  meme:    'funny',
  game:    'game',
  ui:      'interface',
  space:   'space',
  asmr:    'relaxing',
}

export default async function handler(req, res) {
  const { q = 'sound effect', lang = 'ko' } = req.query
  const apiKey = process.env.NEXT_PUBLIC_FREESOUND_API_KEY

  // API 키 없을 때 → 데모 데이터 반환
  if (!apiKey || apiKey.includes('여기에')) {
    return res.json({ sounds: getDemoSounds(q, lang) })
  }

  try {
    const params = new URLSearchParams({
      query: q,
      filter: 'license:"Creative Commons 0"',
      fields: 'id,name,duration,previews,download,license,tags',
      page_size: '15',
      token: apiKey,
    })

    const response = await fetch(
      `https://freesound.org/apiv2/search/text/?${params}`,
      { headers: { 'User-Agent': 'SoundDown/1.0' } }
    )

    if (!response.ok) throw new Error('Freesound API error')

    const data = await response.json()
    const sounds = (data.results || []).map(s => ({
      id: String(s.id),
      name: s.name.replace(/\.[^.]+$/, '').substring(0, 60),
      duration: Math.round(s.duration),
      preview: s.previews?.['preview-lq-mp3'] || s.previews?.['preview-hq-mp3'] || '',
      download: s.previews?.['preview-hq-mp3'] || s.previews?.['preview-lq-mp3'] || '',
      license: 'CC0',
      category: getCategoryLabel(s.tags || [], lang),
    })).filter(s => s.preview && s.duration > 0 && s.duration < 300)

    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.json({ sounds })
  } catch (err) {
    // API 오류 시 데모 데이터로 폴백
    res.json({ sounds: getDemoSounds(q, lang) })
  }
}

function getCategoryLabel(tags, lang) {
  const tagStr = tags.join(' ').toLowerCase()
  if (tagStr.includes('animal') || tagStr.includes('dog') || tagStr.includes('cat') || tagStr.includes('bird'))
    return lang === 'ko' ? '🐾 동물' : '🐾 Animal'
  if (tagStr.includes('nature') || tagStr.includes('rain') || tagStr.includes('wind') || tagStr.includes('water'))
    return lang === 'ko' ? '🌿 자연' : '🌿 Nature'
  if (tagStr.includes('game') || tagStr.includes('retro') || tagStr.includes('8bit'))
    return lang === 'ko' ? '🎮 게임' : '🎮 Game'
  if (tagStr.includes('interface') || tagStr.includes('click') || tagStr.includes('button') || tagStr.includes('ui'))
    return lang === 'ko' ? '🔔 UI' : '🔔 UI'
  if (tagStr.includes('funny') || tagStr.includes('cartoon') || tagStr.includes('comic'))
    return lang === 'ko' ? '😂 밈' : '😂 Meme'
  if (tagStr.includes('space') || tagStr.includes('sci') || tagStr.includes('electronic'))
    return lang === 'ko' ? '🚀 우주' : '🚀 Space'
  return lang === 'ko' ? '💥 효과음' : '💥 SFX'
}

// API 키 없을 때 사용하는 데모 데이터
function getDemoSounds(q, lang) {
  const demos = [
    { id:'demo1', name: lang==='ko'?'강아지 짖는 소리':'Dog Barking', duration:3, preview:'https://cdn.freesound.org/previews/446/446100_8610594-lq.mp3', download:'https://cdn.freesound.org/previews/446/446100_8610594-lq.mp3', license:'CC0', category: lang==='ko'?'🐾 동물':'🐾 Animal' },
    { id:'demo2', name: lang==='ko'?'알림 벨 소리':'Notification Bell', duration:2, preview:'https://cdn.freesound.org/previews/320/320654_5260872-lq.mp3', download:'https://cdn.freesound.org/previews/320/320654_5260872-lq.mp3', license:'CC0', category: lang==='ko'?'🔔 UI':'🔔 UI' },
    { id:'demo3', name: lang==='ko'?'빗소리 (루프)':'Rain Sound Loop', duration:10, preview:'https://cdn.freesound.org/previews/346/346134_5621492-lq.mp3', download:'https://cdn.freesound.org/previews/346/346134_5621492-lq.mp3', license:'CC0', category: lang==='ko'?'🌿 자연':'🌿 Nature' },
    { id:'demo4', name: lang==='ko'?'게임 코인 획득':'Game Coin Pickup', duration:1, preview:'https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3', download:'https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3', license:'CC0', category: lang==='ko'?'🎮 게임':'🎮 Game' },
    { id:'demo5', name: lang==='ko'?'웃음소리 (짧게)':'Laugh Sound Effect', duration:2, preview:'https://cdn.freesound.org/previews/400/400316_5121236-lq.mp3', download:'https://cdn.freesound.org/previews/400/400316_5121236-lq.mp3', license:'CC0', category: lang==='ko'?'😂 밈':'😂 Meme' },
    { id:'demo6', name: lang==='ko'?'고양이 야옹':'Cat Meow', duration:2, preview:'https://cdn.freesound.org/previews/441/441637_9150335-lq.mp3', download:'https://cdn.freesound.org/previews/441/441637_9150335-lq.mp3', license:'CC0', category: lang==='ko'?'🐾 동물':'🐾 Animal' },
    { id:'demo7', name: lang==='ko'?'버튼 클릭음':'Button Click', duration:1, preview:'https://cdn.freesound.org/previews/256/256116_3263906-lq.mp3', download:'https://cdn.freesound.org/previews/256/256116_3263906-lq.mp3', license:'CC0', category: lang==='ko'?'🔔 UI':'🔔 UI' },
    { id:'demo8', name: lang==='ko'?'바람소리':'Wind Sound', duration:8, preview:'https://cdn.freesound.org/previews/346/346525_6142149-lq.mp3', download:'https://cdn.freesound.org/previews/346/346525_6142149-lq.mp3', license:'CC0', category: lang==='ko'?'🌿 자연':'🌿 Nature' },
  ]
  // 검색어로 간단 필터
  if (!q || q === '효과음' || q === 'sound effect') return demos
  const qLow = q.toLowerCase()
  const filtered = demos.filter(d =>
    d.name.toLowerCase().includes(qLow) ||
    d.category.toLowerCase().includes(qLow)
  )
  return filtered.length > 0 ? filtered : demos
}
