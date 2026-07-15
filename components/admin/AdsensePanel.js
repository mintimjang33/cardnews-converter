import { useState, useEffect } from 'react'
import { S } from './AdminUI'
import { SLOT_BANNER_SIZE } from '../../lib/adSlotSizes'

const SOURCE_OPTIONS = [
  { value: 'adsense', label: '애드센스' },
  { value: 'coupang', label: '쿠팡' },
  { value: 'random',  label: '무작위' },
]

export default function AdsensePanel({ adminToken, adSlots, setAdSlots, onSaved }) {
  const [editId, setEditId] = useState(null)
  const [code, setCode] = useState('')
  const [pendingActive, setPendingActive] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [coupangWidgets, setCoupangWidgets] = useState([])

  // 슬롯별 "쿠팡" 소스를 골랐을 때 실제로 매칭되는 배너가 몇 개 등록됐는지 보여주기 위해 로드
  useEffect(() => {
    fetch('/api/admin/coupang-widgets')
      .then(r => r.ok ? r.json() : [])
      .then(data => setCoupangWidgets(Array.isArray(data) ? data : []))
      .catch(() => setCoupangWidgets([]))
  }, [])

  const countCoupangBanners = (slotId) => {
    const size = SLOT_BANNER_SIZE[slotId]
    if (!size) return 0
    return coupangWidgets.filter(w => w.enabled && w.widget_html && w.size === size).length
  }

  const persist = async (nextSlots) => {
    await fetch('/api/settings/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ adSlots: nextSlots }),
    })
    onSaved?.()
  }

  const updateSlot = (id, patch) => {
    const next = adSlots.map(s => s.id === id ? { ...s, ...patch } : s)
    setAdSlots(next)
    return next
  }

  const saveCode = async (id) => {
    setSavingId(id)
    const next = updateSlot(id, { code })
    await persist(next)
    setEditId(null)
    setSavingId(null)
  }

  const removeCode = async (id) => {
    setSavingId(id)
    const next = updateSlot(id, { code: '' })
    await persist(next)
    setEditId(null)
    setSavingId(null)
  }

  const saveActive = async (id) => {
    setSavingId(id)
    const val = pendingActive[id]
    const next = updateSlot(id, { active: val })
    await persist(next)
    setPendingActive(p => { const n = { ...p }; delete n[id]; return n })
    setSavingId(null)
  }

  const setSource = async (id, source) => {
    setSavingId(id)
    const next = updateSlot(id, { source })
    await persist(next)
    setSavingId(null)
  }

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>📢 광고 슬롯 관리</div>
        <div style={{ marginBottom: 20, padding: 16, background: '#1a1400', border: '1.5px solid #78500a', borderRadius: 12, fontSize: 13, color: '#fbbf24', lineHeight: 1.7 }}>
          <strong>동작 방식</strong><br />
          ⚪ <strong>OFF</strong> — 사용자 화면에서 해당 광고 영역이 완전히 숨겨집니다.<br />
          🟡 <strong>대기</strong> — ON인데 노출할 코드/배너가 없는 상태. 빈 광고 자리만 표시됩니다.<br />
          ✅ <strong>ON + 코드/배너 등록</strong> — 실제 광고가 노출됩니다.<br /><br />
          <strong>소스 선택 (애드센스 / 쿠팡 / 무작위)</strong><br />
          <strong>애드센스</strong> — 아래 "코드 입력"에 등록한 애드센스 코드를 보여줍니다.<br />
          <strong>쿠팡</strong> — 쿠팡 관리 &gt; 배너/위젯 목록에서 이 슬롯 사이즈와 맞는 배너를 자동으로(여러 개면 무작위로) 골라 보여줍니다. 코드 입력은 필요 없어요.<br />
          <strong>무작위</strong> — 애드센스 코드와 쿠팡 배너 중 있는 것을 무작위로 섞어서 보여줍니다.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(Array.isArray(adSlots) ? adSlots : []).map(slot => {
            const isPending = slot.id in pendingActive
            const activeVal = isPending ? pendingActive[slot.id] : slot.active
            const isSaving = savingId === slot.id
            const source = slot.source || 'adsense'
            const coupangCount = countCoupangBanners(slot.id)
            const hasContent = source === 'coupang' ? coupangCount > 0
              : source === 'random' ? (!!slot.code || coupangCount > 0)
              : !!slot.code
            let statusText = '⚪ OFF (숨김)'
            if (activeVal) {
              if (!hasContent) statusText = '🟡 대기 (코드/배너 등록 필요)'
              else if (source === 'coupang') statusText = `🛒 쿠팡 배너 자동 노출 (${coupangCount}개 등록됨)`
              else if (source === 'random') statusText = '🔀 무작위 노출 중'
              else statusText = '✅ 광고 노출 중'
            }
            return (
              <div key={slot.id} style={S.row}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>{slot.name}</span>
                      <span style={{ fontSize: 11, color: '#666', background: '#0c0c0c', padding: '2px 8px', borderRadius: 6 }}>
                        {typeof slot.w === 'number' ? slot.w : slot.w} × {slot.h}px
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 10 }}>슬롯 ID: {slot.id}</div>

                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, maxWidth: typeof slot.w === 'number' ? slot.w : 320 }}>
                      {SOURCE_OPTIONS.map(opt => {
                        const on = source === opt.value
                        return (
                          <button key={opt.value} onClick={() => setSource(slot.id, opt.value)} disabled={isSaving}
                            style={{
                              flex: 1, padding: '6px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                              cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                              border: `1.5px solid ${on ? '#e63946' : '#333'}`,
                              background: on ? '#2a0a0b' : '#1f1f1f',
                              color: on ? '#e63946' : '#888',
                              opacity: isSaving ? 0.6 : 1,
                            }}>
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>

                    <div style={{
                      maxWidth: typeof slot.w === 'number' ? slot.w : 320, height: 50,
                      background: activeVal && hasContent ? '#0a1f0f' : activeVal ? '#1a1400' : '#0c0c0c',
                      border: `1.5px dashed ${activeVal && hasContent ? '#4ade80' : activeVal ? '#fbbf24' : '#333'}`,
                      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: activeVal && hasContent ? '#4ade80' : activeVal ? '#fbbf24' : '#555', marginBottom: 10,
                      textAlign: 'center', padding: '0 8px',
                    }}>
                      {statusText}
                    </div>

                    {source !== 'coupang' ? (
                      editId === slot.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <textarea value={code} onChange={e => setCode(e.target.value)} rows={4}
                            placeholder="<script>... AdSense 코드를 붙여넣으세요 ...</script>" style={S.textarea} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => saveCode(slot.id)} disabled={isSaving} style={{ ...S.btn(), padding: '7px 16px', fontSize: 13, opacity: isSaving ? 0.6 : 1 }}>저장</button>
                            <button onClick={() => setEditId(null)} style={{ ...S.btnGhost, padding: '7px 16px', fontSize: 13 }}>취소</button>
                            {slot.code && <button onClick={() => removeCode(slot.id)} style={{ ...S.btn('#7f1d1d'), padding: '7px 16px', fontSize: 13 }}>코드 삭제</button>}
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setCode(slot.code || ''); setEditId(slot.id) }} style={{ ...S.btnGhost, padding: '7px 16px', fontSize: 13 }}>
                          {slot.code ? '코드 편집' : '+ 코드 입력'}
                        </button>
                      )
                    ) : (
                      <div style={{ fontSize: 12, color: '#666' }}>
                        쿠팡 관리 &gt; 배너/위젯 목록에서 이 슬롯 사이즈에 맞는 배너를 등록하면 자동으로 노출돼요. 코드 입력 필요 없음.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div onClick={() => setPendingActive(p => ({ ...p, [slot.id]: !activeVal }))} style={{
                      width: 46, height: 26, borderRadius: 13, background: activeVal ? '#e63946' : '#333',
                      position: 'relative', cursor: 'pointer', transition: 'background .2s',
                    }}>
                      <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 3, left: activeVal ? 23 : 3, transition: 'left .2s' }} />
                    </div>
                    <span style={{ fontSize: 11, color: activeVal && hasContent ? '#4ade80' : activeVal ? '#fbbf24' : '#666', fontWeight: 600 }}>
                      {activeVal && hasContent ? 'ON' : activeVal ? '대기' : 'OFF'}
                    </span>
                    {isPending && (
                      <button onClick={() => saveActive(slot.id)} disabled={isSaving} style={{ ...S.btn(), padding: '5px 12px', fontSize: 12, opacity: isSaving ? 0.6 : 1 }}>저장</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
