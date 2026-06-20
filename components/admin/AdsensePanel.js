import { useState } from 'react'
import { S } from './AdminUI'

export default function AdsensePanel({ adminToken, adSlots, setAdSlots, onSaved }) {
  const [editId, setEditId] = useState(null)
  const [code, setCode] = useState('')
  const [pendingActive, setPendingActive] = useState({})
  const [savingId, setSavingId] = useState(null)

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

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>📢 광고 슬롯 관리</div>
        <div style={{ marginBottom: 20, padding: 16, background: '#1a1400', border: '1.5px solid #78500a', borderRadius: 12, fontSize: 13, color: '#fbbf24', lineHeight: 1.7 }}>
          <strong>동작 방식</strong><br />
          ⚪ <strong>OFF</strong> — 사용자 화면에서 해당 광고 영역이 완전히 숨겨집니다.<br />
          🟡 <strong>대기</strong> — ON인데 코드가 없는 상태. 빈 광고 자리만 표시됩니다.<br />
          ✅ <strong>ON + 코드 등록</strong> — 실제 광고가 노출됩니다.<br /><br />
          <strong>등록 방법</strong><br />
          1. Google AdSense에서 광고 단위를 생성합니다.<br />
          2. 생성된 <code style={{ background: '#2a1e00', padding: '2px 6px', borderRadius: 4 }}>&lt;script&gt;</code> 코드를 해당 슬롯에 붙여넣습니다.<br />
          3. 토글 스위치로 ON/OFF를 조정하고 반드시 저장 버튼을 눌러주세요.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {adSlots.map(slot => {
            const isPending = slot.id in pendingActive
            const activeVal = isPending ? pendingActive[slot.id] : slot.active
            const isSaving = savingId === slot.id
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

                    <div style={{
                      maxWidth: typeof slot.w === 'number' ? slot.w : 320, height: 50,
                      background: activeVal && slot.code ? '#0a1f0f' : activeVal ? '#1a1400' : '#0c0c0c',
                      border: `1.5px dashed ${activeVal && slot.code ? '#4ade80' : activeVal ? '#fbbf24' : '#333'}`,
                      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: activeVal && slot.code ? '#4ade80' : activeVal ? '#fbbf24' : '#555', marginBottom: 10,
                    }}>
                      {activeVal && slot.code ? '✅ 광고 노출 중' : activeVal ? '🟡 대기 (코드 등록 필요)' : '⚪ OFF (숨김)'}
                    </div>

                    {editId === slot.id ? (
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
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div onClick={() => setPendingActive(p => ({ ...p, [slot.id]: !activeVal }))} style={{
                      width: 46, height: 26, borderRadius: 13, background: activeVal ? '#e63946' : '#333',
                      position: 'relative', cursor: 'pointer', transition: 'background .2s',
                    }}>
                      <div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 3, left: activeVal ? 23 : 3, transition: 'left .2s' }} />
                    </div>
                    <span style={{ fontSize: 11, color: activeVal && slot.code ? '#4ade80' : activeVal ? '#fbbf24' : '#666', fontWeight: 600 }}>
                      {activeVal && slot.code ? 'ON' : activeVal ? '대기' : 'OFF'}
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
