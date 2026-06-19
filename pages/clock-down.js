import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { AdSlot, SidebarAd } from '../components/AdSlot'

const T = {
  tabs: ['시계','스탑워치','타이머','알람','세계시각','포모도로'],
  tabIcons: ['🕐','⏱','⏳','🔔','🌍','🍅'],
  digital: '디지털', analog: '아날로그',
  start: '시작', pause: '일시정지', resume: '계속', stop: '정지', reset: '초기화', lap: '랩', add: '추가', skip: '건너뛰기',
  hours: '시간', mins: '분', secs: '초',
  noAlarm: '등록된 알람이 없습니다',
  once: '반복 없음', everyday: '매일 반복', weekly: '매주 ',
  days: ['월','화','수','목','금','토','일'],
  weekdays: ['일','월','화','수','목','금','토'],
  best: '최고', worst: '최저',
  presets: [['1시간',3600],['30분',1800],['10분',600],['5분',300],['3분',180],['1분',60]],
  regions: ['전체','아시아','유럽','아메리카','오세아니아','중동·아프리카'],
  diffFrom: '서울 기준',
  pomModes: ['집중','짧은 휴식','긴 휴식'],
  pomPhase: ['FOCUS','SHORT BREAK','LONG BREAK'],
  pomFocus: '집중 (분)', pomShort: '짧은 휴식 (분)', pomLong: '긴 휴식 (분)', pomSessions: '세션 수',
  pomStats: '오늘 통계', sessions: '완료 세션', focusMins: '집중 분', sets: '완료 세트',
  alarmLabel: '알람 이름 (선택)', alarmDismiss: '끄기', alarmTag: '알람',
  settings: '시간 설정',
}

const CITIES = [
  {ko:'서울',tz:'Asia/Seoul',r:0},{ko:'도쿄',tz:'Asia/Tokyo',r:0},
  {ko:'베이징',tz:'Asia/Shanghai',r:0},{ko:'방콕',tz:'Asia/Bangkok',r:0},
  {ko:'싱가포르',tz:'Asia/Singapore',r:0},{ko:'뭄바이',tz:'Asia/Kolkata',r:0},
  {ko:'런던',tz:'Europe/London',r:1},{ko:'파리',tz:'Europe/Paris',r:1},
  {ko:'베를린',tz:'Europe/Berlin',r:1},{ko:'모스크바',tz:'Europe/Moscow',r:1},
  {ko:'이스탄불',tz:'Europe/Istanbul',r:1},
  {ko:'뉴욕',tz:'America/New_York',r:2},{ko:'LA',tz:'America/Los_Angeles',r:2},
  {ko:'시카고',tz:'America/Chicago',r:2},{ko:'토론토',tz:'America/Toronto',r:2},
  {ko:'상파울루',tz:'America/Sao_Paulo',r:2},
  {ko:'시드니',tz:'Australia/Sydney',r:3},{ko:'오클랜드',tz:'Pacific/Auckland',r:3},
  {ko:'두바이',tz:'Asia/Dubai',r:4},{ko:'카이로',tz:'Africa/Cairo',r:4},
]

const pad = (n, d=2) => String(Math.floor(n)).padStart(d,'0')
const CIRC = 2 * Math.PI * 96

function AnalogClock({ now }) {
  const h = now.getHours()%12, m = now.getMinutes(), s = now.getSeconds()
  const ha = (h/12 + m/720)*360 - 90
  const ma = (m/60 + s/3600)*360 - 90
  const sa = (s/60)*360 - 90
  const handEnd = (angle, len) => ({
    x: (150 + len * Math.cos(angle*Math.PI/180)).toFixed(1),
    y: (150 + len * Math.sin(angle*Math.PI/180)).toFixed(1),
  })
  const handTail = (angle, tail) => ({
    x: (150 + tail * Math.cos((angle+180)*Math.PI/180)).toFixed(1),
    y: (150 + tail * Math.sin((angle+180)*Math.PI/180)).toFixed(1),
  })
  const ticks = Array.from({length:60},(_,i)=>{
    const a = (i/60)*360-90, big=i%5===0
    const r1=big?128:134, r2=138
    return { x1:(150+r1*Math.cos(a*Math.PI/180)).toFixed(1), y1:(150+r1*Math.sin(a*Math.PI/180)).toFixed(1), x2:(150+r2*Math.cos(a*Math.PI/180)).toFixed(1), y2:(150+r2*Math.sin(a*Math.PI/180)).toFixed(1), big }
  })
  const nums = Array.from({length:12},(_,i)=>{
    const a=((i+1)/12)*360-90, r=112
    return { x:(150+r*Math.cos(a*Math.PI/180)).toFixed(1), y:(150+r*Math.sin(a*Math.PI/180)).toFixed(1), n:i+1 }
  })
  return (
    <svg width="300" height="300" viewBox="0 0 300 300" style={{filter:'drop-shadow(0 0 20px rgba(255,255,255,0.06))'}}>
      <circle cx="150" cy="150" r="145" fill="#1c1914" stroke="#2e2820" strokeWidth="2"/>
      <circle cx="150" cy="150" r="138" fill="none" stroke="#252118" strokeWidth="1"/>
      {ticks.map((t,i)=><line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.big?'#3a3a3a':'#222'} strokeWidth={t.big?2:1}/>)}
      <g fontFamily="Orbitron,monospace" fontSize="12" fill="#5a4f3a" textAnchor="middle" dominantBaseline="central">
        {nums.map(n=><text key={n.n} x={n.x} y={n.y}>{n.n}</text>)}
      </g>
      <line x1={handTail(ha,15).x} y1={handTail(ha,15).y} x2={handEnd(ha,70).x} y2={handEnd(ha,70).y} stroke="#c9a84c" strokeWidth="5" strokeLinecap="round"/>
      <line x1={handTail(ma,15).x} y1={handTail(ma,15).y} x2={handEnd(ma,55).x} y2={handEnd(ma,55).y} stroke="#9a8a6a" strokeWidth="3" strokeLinecap="round"/>
      <line x1={handTail(sa,18).x} y1={handTail(sa,18).y} x2={handEnd(sa,42).x} y2={handEnd(sa,42).y} stroke="#5a4f3a" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="150" cy="150" r="5" fill="#12100d"/>
      <circle cx="150" cy="150" r="2" fill="#12100d"/>
    </svg>
  )
}

export default function ClockDown() {
  const [tab, setTab] = useState(0)
  const [now, setNow] = useState(new Date())
  const [adsOn, setAdsOn] = useState(true)
  const t = T

  const [cMode, setCMode] = useState('digital')

  const [swEl, setSwEl] = useState(0)
  const [swRun, setSwRun] = useState(false)
  const swTs = useRef(0); const swIv = useRef(null)
  const [swLaps, setSwLaps] = useState([])
  const swLastLap = useRef(0)

  const [tH, setTH] = useState(0); const [tM, setTM] = useState(0); const [tS, setTS] = useState(0)
  const [tLeft, setTLeft] = useState(0); const [tTotal, setTTotal] = useState(0)
  const [tRun, setTRun] = useState(false)
  const tIv = useRef(null); const tLeftRef = useRef(0); const tTotalRef = useRef(0)

  const [alarms, setAlarms] = useState([])
  const [aTime, setATime] = useState('')
  const [aLabel, setALabel] = useState('')
  const [selDays, setSelDays] = useState([])
  const [ringingId, setRingingId] = useState(null)
  const beepLp = useRef(null)

  const [region, setRegion] = useState(-1)
  const [wcTimes, setWcTimes] = useState({})

  const [pomPhase, setPomPhase] = useState(0)
  const [pomSet, setPomSet] = useState(0)
  const [pomLeft, setPomLeft] = useState(25*60)
  const [pomTotal, setPomTotal] = useState(25*60)
  const [pomRun, setPomRun] = useState(false)
  const pomIv = useRef(null)
  const [pomFocusMin, setPomFocusMin] = useState(25)
  const [pomShortMin, setPomShortMin] = useState(5)
  const [pomLongMin, setPomLongMin] = useState(15)
  const [pomSessions, setPomSessions] = useState(4)
  const [pomTotalFocus, setPomTotalFocus] = useState(0)
  const [pomTotalMins, setPomTotalMins] = useState(0)
  const [pomTotalSets, setPomTotalSets] = useState(0)
  const pomPhaseRef = useRef(0); const pomSetRef = useRef(0)
  const pomLeftRef = useRef(25*60); const pomTotalRef = useRef(25*60)
  const pomRunRef = useRef(false)

  const audioCtx = useRef(null)
  const beep = useCallback((f=880,d=.4,v=.25) => {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext||window.webkitAudioContext)()
      const o=audioCtx.current.createOscillator(), g=audioCtx.current.createGain()
      o.connect(g); g.connect(audioCtx.current.destination)
      o.frequency.value=f
      g.gain.setValueAtTime(v, audioCtx.current.currentTime)
      g.gain.exponentialRampToValueAtTime(.001, audioCtx.current.currentTime+d)
      o.start(); o.stop(audioCtx.current.currentTime+d)
    } catch {}
  }, [])
  const alarmBeep = useCallback(() => {
    [880,1100,880].forEach((f,i) => setTimeout(()=>beep(f,.3,.35), i*380))
  }, [beep])

  useEffect(() => {
    const iv = setInterval(() => {
      const n = new Date()
      setNow(n)
      if (n.getSeconds() === 0) {
        const hh=pad(n.getHours()), mm=pad(n.getMinutes()), cur=`${hh}:${mm}`
        const di = n.getDay()===0?6:n.getDay()-1
        setAlarms(prev => {
          prev.forEach(a => {
            if (!a.on || a.time!==cur) return
            if (a.days?.length && !a.days.includes(di)) return
            setRingingId(a.id)
          })
          return prev
        })
      }
      setWcTimes(prev => {
        const next = {...prev}
        CITIES.forEach(c => {
          next[c.tz] = n.toLocaleTimeString('ko-KR',{timeZone:c.tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})
        })
        return next
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (ringingId !== null) {
      alarmBeep()
      beepLp.current = setInterval(alarmBeep, 1500)
    }
    return () => clearInterval(beepLp.current)
  }, [ringingId, alarmBeep])

  useEffect(() => {
    const saved = localStorage.getItem('clkdown_alarms')
    if (saved) setAlarms(JSON.parse(saved))
    fetch('/api/settings/get').then(r=>r.json()).then(d=>{if(d.adsOn!==undefined)setAdsOn(d.adsOn)}).catch(()=>{})
  }, [])

  const saveAlarms = (list) => localStorage.setItem('clkdown_alarms', JSON.stringify(list))

  const swToggle = () => {
    if (!swRun) {
      swTs.current = Date.now() - swEl
      swIv.current = setInterval(() => setSwEl(Date.now()-swTs.current), 31)
      setSwRun(true)
    } else { clearInterval(swIv.current); setSwRun(false) }
  }
  const swLap = () => {
    if (!swRun) return
    const lt = swEl - swLastLap.current; swLastLap.current = swEl
    setSwLaps(prev => [...prev, {total:swEl, lap:lt}])
    beep(1320,.1,.2)
  }
  const swReset = () => { clearInterval(swIv.current); setSwRun(false); setSwEl(0); setSwLaps([]); swLastLap.current=0 }
  const swFmt = (ms) => `${pad(Math.floor(ms/60000))}:${pad(Math.floor(ms%60000/1000))}.${String(ms%1000).padStart(3,'0')}`

  const tToggle = () => {
    if (!tRun) {
      let left = tLeftRef.current
      if (left === 0) {
        const total = tH*3600+tM*60+tS
        if (!total) return
        left = total; tTotalRef.current = total; tLeftRef.current = total
        setTTotal(total); setTLeft(total)
      }
      setTRun(true)
      tIv.current = setInterval(() => {
        tLeftRef.current--; setTLeft(tLeftRef.current)
        if (tLeftRef.current <= 0) {
          clearInterval(tIv.current); setTRun(false)
          for(let i=0;i<6;i++) setTimeout(()=>beep(660,.5,.4), i*650)
        }
      }, 1000)
    } else { clearInterval(tIv.current); setTRun(false) }
  }
  const tReset = () => { clearInterval(tIv.current); setTRun(false); tLeftRef.current=0; setTLeft(0); setTTotal(0); tTotalRef.current=0 }
  const setPreset = (sec) => { tReset(); setTH(Math.floor(sec/3600)); setTM(Math.floor(sec%3600/60)); setTS(sec%60) }

  const addAlarm = () => {
    if (!aTime) return
    const label = aLabel.trim() || '알람'
    const next = [...alarms, {id:Date.now(), time:aTime, label, on:true, days:[...selDays]}]
    setAlarms(next); saveAlarms(next)
    setATime(''); setALabel(''); setSelDays([])
  }
  const toggleDay = (d) => setSelDays(prev => prev.includes(d)?prev.filter(x=>x!==d):[...prev,d])
  const togAlarm = (id) => { const next=alarms.map(a=>a.id===id?{...a,on:!a.on}:a); setAlarms(next); saveAlarms(next) }
  const delAlarm = (id) => { const next=alarms.filter(a=>a.id!==id); setAlarms(next); saveAlarms(next) }
  const stopAlarm = () => {
    clearInterval(beepLp.current)
    const a = alarms.find(x=>x.id===ringingId)
    if (a && (!a.days?.length)) { const next=alarms.map(x=>x.id===ringingId?{...x,on:false}:x); setAlarms(next); saveAlarms(next) }
    setRingingId(null)
  }
  const repLabel = (days) => {
    if (!days?.length) return t.once
    if (days.length===7) return t.everyday
    return t.weekly + [...days].sort().map(d=>t.days[d]).join(' ')
  }

  const getTzOff = (tz) => {
    try {
      const s = now.toLocaleString('en-US',{timeZone:tz,timeZoneName:'shortOffset'})
      const m = s.match(/GMT([+-]\d+(?::\d+)?)/)
      if (m){const p=m[1].split(':');return parseInt(p[0])*60+(parseInt(p[1]||0)*(parseInt(p[0])<0?-1:1))}
    } catch {}
    return 0
  }
  const seoulOff = getTzOff('Asia/Seoul')
  const filteredCities = region===-1?CITIES:CITIES.filter(c=>c.r===region)

  const pomSec = useCallback((phase) => {
    return [pomFocusMin*60, pomShortMin*60, pomLongMin*60][phase]
  }, [pomFocusMin, pomShortMin, pomLongMin])

  const pomAdvance = useCallback(() => {
    const maxS = pomSessions
    clearInterval(pomIv.current); pomRunRef.current=false
    let nextPhase, nextSet=pomSetRef.current
    if (pomPhaseRef.current===0) {
      setPomTotalFocus(p=>p+1); setPomTotalMins(p=>p+pomFocusMin)
      nextSet++
      if (nextSet>=maxS) { nextSet=0; setPomTotalSets(p=>p+1); nextPhase=2 }
      else nextPhase=1
    } else { nextPhase=0 }
    pomPhaseRef.current=nextPhase; pomSetRef.current=nextSet
    setPomPhase(nextPhase); setPomSet(nextSet)
    const sec=[pomFocusMin*60,pomShortMin*60,pomLongMin*60][nextPhase]
    pomLeftRef.current=sec; pomTotalRef.current=sec
    setPomLeft(sec); setPomTotal(sec); setPomRun(true); pomRunRef.current=true
    pomIv.current = setInterval(() => {
      pomLeftRef.current--; setPomLeft(pomLeftRef.current)
      if (pomLeftRef.current<=0) pomAdvance()
    },1000)
    for(let i=0;i<4;i++) setTimeout(()=>beep(nextPhase===0?880:660,.3,.3),i*500)
  }, [pomSessions, pomFocusMin, pomShortMin, pomLongMin, beep])

  const pomToggle = () => {
    if (!pomRun) {
      setPomRun(true); pomRunRef.current=true
      pomIv.current = setInterval(()=>{
        pomLeftRef.current--; setPomLeft(pomLeftRef.current)
        if(pomLeftRef.current<=0) pomAdvance()
      },1000)
    } else { clearInterval(pomIv.current); setPomRun(false); pomRunRef.current=false }
  }
  const pomSkip = () => { clearInterval(pomIv.current); pomAdvance() }
  const pomReset = () => {
    clearInterval(pomIv.current); setPomRun(false); pomRunRef.current=false
    pomPhaseRef.current=0; pomSetRef.current=0
    setPomPhase(0); setPomSet(0)
    const sec=pomFocusMin*60; pomLeftRef.current=sec; pomTotalRef.current=sec
    setPomLeft(sec); setPomTotal(sec)
  }
  const pomJump = (i) => {
    clearInterval(pomIv.current); setPomRun(false); pomRunRef.current=false
    pomPhaseRef.current=i; setPomPhase(i)
    const sec=pomSec(i); pomLeftRef.current=sec; pomTotalRef.current=sec
    setPomLeft(sec); setPomTotal(sec)
  }

  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 (${t.weekdays[now.getDay()]})`
  const pomArcOffset = pomTotal>0 ? CIRC*(1-pomLeft/pomTotal) : 0

  return (
    <>
      <Head>
        <title>Clock-Down — 무료 온라인 시계 | 알람·타이머·스탑워치·세계시각·포모도로</title>
        <meta name="description" content="알람, 타이머, 스탑워치, 세계시각, 포모도로가 모두 있는 무료 온라인 시계." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Orbitron:wght@300;400;700&display=swap" rel="stylesheet" />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`} crossOrigin="anonymous" />
        )}
      </Head>

      <style jsx global>{`
.clock-page {
  background: #12100d;
  color: #f0e8d8;
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  min-height: 100vh;
  line-height: 1.6;
}
.clock-page {
  --bg: #12100d;
  --surface: #1c1914;
  --surface2: #252118;
  --surface3: #2f2a1f;
  --accent: #c9a84c;
  --accent2: #a8873a;
  --accent3: #e8c96a;
  --text: #f0e8d8;
  --text2: #9a8a6a;
  --text3: #5a4f3a;
  --border: #2e2820;
  --radius: 12px;
  --mono: 'Orbitron', monospace;
}






/* ── SCROLLBAR ── */




/* ── HEADER ── */
.header {
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0;
  background: rgba(10,10,10,0.95);
  backdrop-filter: blur(12px);
  z-index: 100;
}
.header-inner { display:flex; align-items:center; justify-content:space-between; max-width:1280px; margin:0 auto; padding:0 20px; }
.logo { display:flex; align-items:center; gap:10px; text-decoration:none; color:var(--text); }
.logo-icon {
  width:34px; height:34px;
  background: #c9a84c;
  border-radius:8px;
  display:flex; align-items:center; justify-content:center;
  font-size:16px;
}
.logo-text { font-size:18px; font-weight:800; letter-spacing:-0.5px; font-family: var(--mono); }
.logo-text span { color: var(--text2); }
.lang-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text2);
  padding: 5px 13px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.lang-btn:hover, .lang-btn.active { border-color: var(--text); color: var(--text); }

/* ── AD SLOTS ── */
.ad-slot {
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: 20px;
  text-align: center;
  color: var(--text3);
  font-size: 12px;
  display: flex; flex-direction:column; align-items:center; gap:5px;
  min-height: 80px; justify-content:center;
}
.ad-tag { font-size:10px; color:var(--text3); letter-spacing:1px; }

/* ── LAYOUT ── */
.page-layout {
  display: flex;
  max-width: 1280px;
  margin: 0 auto;
  min-height: calc(100vh - 60px);
}

/* ── SIDEBAR NAV ── */
.sidebar-nav {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  padding: 16px 0;
  position: sticky;
  top: 60px;
  height: calc(100vh - 60px);
  overflow-y: auto;
}
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 14px;
  color: var(--text2);
  border-left: 3px solid transparent;
  user-select: none;
}
.nav-item:hover { color: var(--text); background: var(--surface); }
.nav-item.active { color: var(--text); background: var(--surface); border-left-color: var(--text); }
.nav-icon { font-size: 18px; width: 24px; text-align: center; }

/* ── MAIN CONTENT ── */
.main-content {
  flex: 1;
  padding: 28px 24px;
  min-width: 0;
  overflow-y: auto;
}

/* ── AD SIDEBAR ── */
.ad-sidebar {
  width: 180px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  padding: 16px;
}

/* ── PANEL ── */
.panel { display: none; animation: fadeUp .18s ease; }
.panel.active { display: block; }
@keyframes fadeUp { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }

/* ── CARD ── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 16px;
}
.card-title {
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--text3);
  margin-bottom: 20px;
  font-weight: 600;
}

/* ── CLOCK ── */
.clock-mode-row { display:flex; gap:8px; margin-bottom:24px; justify-content:center; }
.cmode-btn {
  padding: 8px 24px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text2);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.cmode-btn.active { background: var(--accent); border-color: var(--accent); color: var(--bg); font-weight: 700; }

.digital-clock { text-align: center; padding: 40px 20px; }
.dig-time {
  font-family: var(--mono);
  font-size: clamp(52px, 10vw, 88px);
  font-weight: 300;
  letter-spacing: 4px;
  color: var(--text);
  line-height: 1;
}
.dig-sep { animation: blink 1s infinite; }
@keyframes blink { 50%{opacity:.1} }
.dig-sec { font-family: var(--mono); font-size: clamp(26px,5vw,42px); color: var(--text2); font-weight: 300; }
.dig-date { font-size: 13px; color: var(--text3); margin-top: 12px; letter-spacing: 1px; }

/* ── BIG NUM ── */
.big-num {
  font-family: var(--mono);
  font-size: clamp(42px,7vw,68px);
  font-weight: 300;
  text-align: center;
  padding: 20px 0;
  letter-spacing: 2px;
  line-height: 1;
  color: var(--text);
}
.big-num.running { color: var(--text); }
.big-num.done { animation: blink-num .5s infinite; }
@keyframes blink-num { 50%{opacity:.2} }

/* ── BTNS ── */
.btn-row { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
.btn {
  padding: 11px 26px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  font-weight: 600;
}
.btn:hover { background: var(--surface2); border-color: var(--text2); }
.btn:active { transform: scale(.97); }
.btn.go { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.btn.stop { background: var(--surface3); border-color: var(--text2); }
.btn.sm { padding: 7px 16px; font-size: 12px; }

/* ── PROGRESS ── */
.prog { height: 2px; background: var(--border); border-radius: 2px; margin: 16px 0; overflow: hidden; }
.prog-fill { height: 100%; background: var(--text); border-radius: 2px; transition: width .8s linear; }

/* ── TIMER INPUTS ── */
.t-inputs { display:flex; gap:8px; justify-content:center; align-items:center; margin-bottom:16px; }
.t-field { display:flex; flex-direction:column; align-items:center; gap:4px; }
.t-field input {
  width: 70px; height: 58px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-family: var(--mono);
  font-size: 26px; font-weight: 300;
  text-align: center;
}
.t-field input:focus { outline: none; border-color: var(--text2); }
.t-field label { font-size: 10px; color: var(--text3); letter-spacing: 1px; }
.t-sep { font-family: var(--mono); font-size: 26px; color: var(--text3); padding-bottom: 14px; }
.presets { display:flex; gap:6px; flex-wrap:wrap; justify-content:center; margin-bottom:16px; }

/* ── ALARM ── */
.alarm-add { display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end; margin-bottom:12px; }
.alarm-add input[type=time] {
  height: 42px;
  background: var(--surface2); border: 1px solid var(--border); border-radius: 9px;
  color: var(--text); font-family: var(--mono); font-size: 17px; padding: 0 12px; width: 130px;
}
.alarm-add input[type=text] {
  height: 42px;
  background: var(--surface2); border: 1px solid var(--border); border-radius: 9px;
  color: var(--text); font-size: 13px; padding: 0 12px; flex: 1; min-width: 100px; font-family: inherit;
}
.alarm-add input:focus { outline: none; border-color: var(--text2); }
.days-row { display:flex; gap:6px; margin:8px 0; flex-wrap:wrap; }
.day-btn {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid var(--border); background: transparent;
  color: var(--text3); font-size: 11px; cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.day-btn.sel { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.rep-lbl { font-size: 11px; color: var(--text3); margin-top: 4px; }
.alarm-list { display:flex; flex-direction:column; gap:8px; }
.a-item {
  display:flex; align-items:center; gap:12px;
  padding: 14px 16px;
  background: var(--surface2); border: 1px solid var(--border); border-radius: 12px;
  transition: all 0.2s;
}
/* 알람 점멸 */
.a-item.ring {
  border-color: var(--text);
  animation: alarm-flash 0.5s infinite;
}
@keyframes alarm-flash {
  0%, 100% { background: var(--surface2); border-color: var(--accent); }
  50% { background: var(--accent); border-color: var(--accent); }
}
.a-item.ring .a-time,
.a-item.ring .a-lbl { color: var(--bg); }
.a-item.ring .a-days { color: rgba(0,0,0,0.5); }

.a-time { font-family: var(--mono); font-size: 22px; font-weight: 300; min-width: 76px; }
.a-meta { flex: 1; }
.a-lbl { font-size: 13px; font-weight: 600; }
.a-days { font-size: 11px; color: var(--text3); margin-top: 2px; }
.tog {
  width: 42px; height: 22px; background: var(--border); border-radius: 11px;
  position: relative; border: none; cursor: pointer; transition: background 0.2s; flex-shrink: 0;
}
.tog::after {
  content: ''; position: absolute; top: 3px; left: 3px;
  width: 16px; height: 16px; background: var(--text2); border-radius: 50%; transition: left 0.2s;
}
.tog.on { background: var(--text); }
.tog.on::after { left: 23px; background: var(--bg); }
.del-btn { background: none; border: none; color: var(--text3); cursor: pointer; font-size: 20px; padding: 4px; transition: color .15s; line-height: 1; }
.del-btn:hover { color: var(--text); }
.empty { text-align: center; color: var(--text3); padding: 24px; font-size: 13px; }

/* 알람 배너 점멸 */
.ring-banner {
  display: none;
  position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
  z-index: 9999;
  background: var(--accent); color: var(--bg);
  padding: 16px 28px; border-radius: 14px;
  box-shadow: 0 8px 40px rgba(255,255,255,0.2);
  min-width: 280px; text-align: center;
}
.ring-banner.show { display: block; animation: banner-flash 0.6s infinite, slideD .3s ease; }
@keyframes banner-flash {
  0%, 100% { background: #c9a84c; color: #000000; }
  50% { background: #000000; color: #c9a84c; border: 2px solid #c9a84c; }
}
@keyframes slideD { from{opacity:0;transform:translateX(-50%) translateY(-16px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
.rb-tag { font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; opacity: .6; }
.rb-name { font-size: 22px; font-weight: 700; margin: 4px 0; }
.rb-stop { background: var(--bg); color: var(--text); border: 1px solid var(--text); border-radius: 8px; padding: 8px 22px; font-size: 13px; font-weight: 700; cursor: pointer; margin-top: 8px; font-family: inherit; }

/* ── LAP ── */
.lap-list { max-height: 200px; overflow-y: auto; display:flex; flex-direction:column; gap:5px; margin-top:14px; }
.lap-row { display:flex; justify-content:space-between; align-items:center; padding:7px 12px; background:var(--surface2); border-radius:7px; font-family:var(--mono); font-size:13px; }
.lap-row.best { color: var(--text); border: 1px solid var(--text3); }
.lap-row.worst { color: var(--text2); }
.lap-n { color: var(--text3); font-size: 11px; min-width: 40px; }

/* ── WORLD CLOCK ── */
.country-select { margin-bottom: 16px; }
.country-select select { width:100%; height:40px; background:var(--surface2); border:1px solid var(--border); border-radius:9px; color:var(--text); font-size:13px; padding:0 12px; font-family:inherit; cursor:pointer; }
.country-select select:focus { outline:none; border-color:var(--text2); }
.wc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
.wc-card { background:var(--surface2); border:1px solid var(--border); border-radius:12px; padding:14px; transition:border-color 0.2s; }
.wc-card:hover { border-color: var(--text2); }
.wc-city { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--text3); margin-bottom:6px; }
.wc-t { font-family:var(--mono); font-size:24px; font-weight:300; }
.wc-d { font-size:11px; color:var(--text3); margin-top:3px; }
.wc-diff { font-size:11px; color:var(--text2); margin-top:2px; }

/* ── POMODORO ── */
.pom-mode-row { display:flex; gap:8px; justify-content:center; margin-bottom:20px; flex-wrap:wrap; }
.pom-mode-btn { padding:7px 18px; background:transparent; border:1px solid var(--border); border-radius:8px; color:var(--text3); font-size:12px; cursor:pointer; transition:all .15s; font-family:inherit; }
.pom-mode-btn.active { background:var(--text); border-color:var(--text); color:var(--bg); font-weight:700; }
.pom-ring { display:flex; justify-content:center; align-items:center; margin:8px 0 20px; }
.pom-svg-wrap { position:relative; width:220px; height:220px; }
.pom-svg-wrap svg { position:absolute; top:0; left:0; }
.pom-center-text { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; pointer-events:none; }
.pom-time { font-family:var(--mono); font-size:46px; font-weight:300; letter-spacing:2px; color:var(--text); line-height:1; }
.pom-phase { font-size:10px; letter-spacing:3px; text-transform:uppercase; color:var(--text3); margin-top:6px; }
.pom-sets { display:flex; gap:8px; justify-content:center; align-items:center; margin:16px 0; }
.pom-dot { width:10px; height:10px; border-radius:50%; border:1.5px solid var(--border); transition:all .3s; }
.pom-dot.done { background:var(--text); border-color:var(--text); }
.pom-dot.current { background:var(--text2); border-color:var(--text2); }
.pom-settings { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:10px; margin-top:8px; }
.pom-set-item { display:flex; flex-direction:column; gap:4px; }
.pom-set-item label { font-size:10px; color:var(--text3); letter-spacing:1px; }
.pom-set-item input { width:100%; height:44px; background:var(--surface2); border:1px solid var(--border); border-radius:9px; color:var(--text); font-family:var(--mono); font-size:22px; font-weight:300; text-align:center; }
.pom-set-item input:focus { outline:none; border-color:var(--text2); }
.pom-stat-row { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:16px; }
.pom-stat { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px; text-align:center; }
.pom-stat-n { font-family:var(--mono); font-size:28px; font-weight:300; color:var(--text); }
.pom-stat-l { font-size:10px; color:var(--text3); margin-top:4px; letter-spacing:1px; }

/* ── FOOTER ── */
.footer { border-top:1px solid var(--border); padding:32px 0 20px; margin-top:0; }
.footer-inner { max-width:1280px; margin:0 auto; padding:0 20px; }
.footer-text { text-align:center; color:var(--text3); font-size:12px; margin:12px 0; }
.admin-link { display:block; text-align:center; color:var(--surface3); font-size:10px; margin-top:12px; text-decoration:none; }
.admin-link:hover { color:var(--text3); }

@media(max-width:800px) {
  .sidebar-nav { width: 56px; }
  .nav-label { display: none; }
  .nav-item { padding: 14px; justify-content: center; }
  .ad-sidebar { display: none; }
  .main-content { padding: 16px; }
}

/* ── WRAP (블로그/privacy/terms/faq 페이지용) ── */
      `}</style>

      <div className="clock-page">

      {ringingId !== null && (
        <div className="ring-banner show">
          <div className="rb-tag">{t.alarmTag}</div>
          <div className="rb-name">{alarms.find(a=>a.id===ringingId)?.label || t.alarmTag}</div>
          <button className="rb-stop" onClick={stopAlarm}>{t.alarmDismiss}</button>
        </div>
      )}

      <Header siteName="Clock-Down" siteHref="/" />

      {adsOn && (
        <div style={{maxWidth:1280,margin:'0 auto',padding:'12px 20px'}}>
          <AdSlot slot={process.env.NEXT_PUBLIC_AD_SLOT_TOP||'1111111111'} />
        </div>
      )}

      <div className="page-layout">
        {adsOn && <aside className="sidebar"><SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_LEFT || '5555555555'} /></aside>}
        <nav className="sidebar-nav">
          {t.tabs.map((name,i) => (
            <div key={i} className={`nav-item${tab===i?' active':''}`} onClick={()=>setTab(i)}>
              <span className="nav-icon">{t.tabIcons[i]}</span>
              <span className="nav-label">{name}</span>
            </div>
          ))}
        </nav>

        <div className="main-content">

          {/* 시계 */}
          <div className={`panel${tab===0?' active':''}`}>
            <div className="clock-mode-row">
              <button className={`cmode-btn${cMode==='digital'?' active':''}`} onClick={()=>setCMode('digital')}>{t.digital}</button>
              <button className={`cmode-btn${cMode==='analog'?' active':''}`} onClick={()=>setCMode('analog')}>{t.analog}</button>
            </div>
            {cMode==='digital' && (
              <div className="digital-clock">
                <div className="dig-time">
                  <span>{pad(now.getHours())}</span>
                  <span className="dig-sep">:</span>
                  <span>{pad(now.getMinutes())}</span>
                  <span className="dig-sec">:<span>{pad(now.getSeconds())}</span></span>
                </div>
                <div className="dig-date">{dateStr}</div>
              </div>
            )}
            {cMode==='analog' && (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <AnalogClock now={now} />
                <div className="dig-date" style={{marginTop:16}}>{dateStr}</div>
              </div>
            )}
          </div>

          {/* 스탑워치 */}
          <div className={`panel${tab===1?' active':''}`}>
            <div className="card">
              <div className={`big-num${swRun?' running':''}`}>{swFmt(swEl)}</div>
              <div className="btn-row" style={{marginBottom:14}}>
                <button className={`btn${swRun?' stop':' go'}`} onClick={swToggle}>{swRun ? t.stop : (swEl>0 ? t.resume : t.start)}</button>
                <button className="btn" onClick={swLap} disabled={!swRun}>{t.lap}</button>
                <button className="btn" onClick={swReset}>{t.reset}</button>
              </div>
              {swLaps.length>0 && (
                <div className="lap-list">
                  {[...swLaps].reverse().map((l,ri)=>{
                    const i=swLaps.length-1-ri
                    const times=swLaps.map(x=>x.lap)
                    const best=Math.min(...times),worst=Math.max(...times)
                    const cls=swLaps.length>1?(l.lap===best?' best':l.lap===worst?' worst':''):''
                    return (
                      <div key={i} className={`lap-row${cls}`}>
                        <span className="lap-n">Lap {i+1}{l.lap===best&&swLaps.length>1?` (${t.best})`:''}{l.lap===worst&&swLaps.length>1?` (${t.worst})`:''}</span>
                        <span>{swFmt(l.lap)}</span>
                        <span style={{color:'#9a8a6a',fontSize:11}}>{swFmt(l.total)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 타이머 */}
          <div className={`panel${tab===2?' active':''}`}>
            <div className="card">
              <div className="t-inputs">
                <div className="t-field"><input type="number" value={tH} min="0" max="23" onChange={e=>setTH(+e.target.value)} /><label>{t.hours}</label></div>
                <div className="t-sep">:</div>
                <div className="t-field"><input type="number" value={tM} min="0" max="59" onChange={e=>setTM(+e.target.value)} /><label>{t.mins}</label></div>
                <div className="t-sep">:</div>
                <div className="t-field"><input type="number" value={tS} min="0" max="59" onChange={e=>setTS(+e.target.value)} /><label>{t.secs}</label></div>
              </div>
              <div className="presets">
                {t.presets.map(([lbl,sec])=>(
                  <button key={sec} className="btn sm" onClick={()=>setPreset(sec)}>{lbl}</button>
                ))}
              </div>
              <div className={`big-num${tLeft===0&&tTotal>0?' done':''}`}>
                {`${pad(Math.floor(tLeft/3600))}:${pad(Math.floor(tLeft%3600/60))}:${pad(tLeft%60)}`}
              </div>
              <div className="prog">
                <div className="prog-fill" style={{width: tTotal>0?`${((tTotal-tLeft)/tTotal)*100}%`:'0%'}} />
              </div>
              <div className="btn-row">
                <button className={`btn${tRun?' stop':' go'}`} onClick={tToggle}>{tRun ? t.pause : (tLeft>0 ? t.resume : t.start)}</button>
                <button className="btn" onClick={tReset}>{t.reset}</button>
              </div>
            </div>
          </div>

          {/* 알람 */}
          <div className={`panel${tab===3?' active':''}`}>
            <div className="card">
              <div className="card-title">알람 추가</div>
              <div className="alarm-add">
                <input type="time" value={aTime} onChange={e=>setATime(e.target.value)} />
                <input type="text" value={aLabel} onChange={e=>setALabel(e.target.value)} placeholder={t.alarmLabel} />
                <button className="btn go" onClick={addAlarm}>{t.add}</button>
              </div>
              <div className="days-row">
                {t.days.map((d,i)=>(
                  <button key={i} className={`day-btn${selDays.includes(i)?' sel':''}`} onClick={()=>toggleDay(i)}>{d}</button>
                ))}
              </div>
              <div className="rep-lbl">{repLabel(selDays)}</div>
            </div>
            <div className="card">
              <div className="card-title">알람 목록</div>
              {alarms.length===0 ? (
                <div className="empty">{t.noAlarm}</div>
              ) : (
                <div className="alarm-list">
                  {alarms.map(a=>(
                    <div key={a.id} className={`a-item${a.id===ringingId?' ring':''}`}>
                      <div className="a-time">{a.time}</div>
                      <div className="a-meta">
                        <div className="a-lbl">{a.label}</div>
                        <div className="a-days">{repLabel(a.days)}</div>
                      </div>
                      <button className={`tog${a.on?' on':''}`} onClick={()=>togAlarm(a.id)} />
                      <button className="del-btn" onClick={()=>delAlarm(a.id)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 세계시각 */}
          <div className={`panel${tab===4?' active':''}`}>
            <div className="card">
              <div className="country-select">
                <select value={region} onChange={e=>setRegion(+e.target.value)}>
                  {t.regions.map((r,i)=><option key={i} value={i-1}>{r}</option>)}
                </select>
              </div>
              <div className="wc-grid">
                {filteredCities.map(c=>{
                  const off=getTzOff(c.tz), diff=Math.round((off-seoulOff)/60)
                  const di=now.toLocaleDateString('ko-KR',{timeZone:c.tz,month:'numeric',day:'numeric',weekday:'short'})
                  return (
                    <div key={c.tz} className="wc-card">
                      <div className="wc-city">{c.ko}</div>
                      <div className="wc-t">{wcTimes[c.tz]||'--:--:--'}</div>
                      <div className="wc-d">{di}</div>
                      <div className="wc-diff">{diff===0?'—':`${t.diffFrom} ${diff>0?'+':''}${diff}h`}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 포모도로 */}
          <div className={`panel${tab===5?' active':''}`}>
            <div className="pom-mode-row">
              {t.pomModes.map((m,i)=>(
                <button key={i} className={`pom-mode-btn${pomPhase===i?' active':''}`} onClick={()=>pomJump(i)}>{m}</button>
              ))}
            </div>
            <div className="card">
              <div className="pom-ring">
                <div className="pom-svg-wrap">
                  <svg width="220" height="220" viewBox="0 0 220 220">
                    <circle cx="110" cy="110" r="96" fill="none" stroke="#2e2820" strokeWidth="8"/>
                    <circle cx="110" cy="110" r="96" fill="none"
                      stroke="#c9a84c" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={CIRC} strokeDashoffset={pomArcOffset}
                      transform="rotate(-90 110 110)"
                      style={{transition:'stroke-dashoffset .9s linear'}}
                    />
                  </svg>
                  <div className="pom-center-text">
                    <div className="pom-time">{`${pad(Math.floor(pomLeft/60))}:${pad(pomLeft%60)}`}</div>
                    <div className="pom-phase">{t.pomPhase[pomPhase]}</div>
                  </div>
                </div>
              </div>
              <div className="pom-sets">
                {Array.from({length:pomSessions},(_,i)=>(
                  <div key={i} className={`pom-dot${i<pomSet?' done':i===pomSet&&pomPhase===0?' current':''}`} />
                ))}
              </div>
              <div className="btn-row">
                <button className={`btn${pomRun?' stop':' go'}`} onClick={pomToggle}>{pomRun ? t.pause : t.start}</button>
                <button className="btn" onClick={pomSkip}>{t.skip}</button>
                <button className="btn" onClick={pomReset}>{t.reset}</button>
              </div>
            </div>
            <div className="card">
              <div className="card-title">{t.settings}</div>
              <div className="pom-settings">
                {[
                  [t.pomFocus, pomFocusMin, setPomFocusMin],
                  [t.pomShort, pomShortMin, setPomShortMin],
                  [t.pomLong, pomLongMin, setPomLongMin],
                  [t.pomSessions, pomSessions, setPomSessions],
                ].map(([lbl,val,set])=>(
                  <div key={lbl} className="pom-set-item">
                    <label>{lbl}</label>
                    <input type="number" value={val} min="1" max="90" onChange={e=>set(+e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-title">{t.pomStats}</div>
              <div className="pom-stat-row">
                {[[pomTotalFocus,t.sessions],[pomTotalMins,t.focusMins],[pomTotalSets,t.sets]].map(([n,l])=>(
                  <div key={l} className="pom-stat">
                    <div className="pom-stat-n">{n}</div>
                    <div className="pom-stat-l">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {adsOn && <aside className="sidebar"><SidebarAd slot={process.env.NEXT_PUBLIC_AD_SLOT_RIGHT || '6666666666'} /></aside>}
      </div>

      <Footer siteName="Clock-Down" adsOn={adsOn} />

      </div>
    </>
  )
}
