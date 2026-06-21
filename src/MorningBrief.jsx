// ════════════════════════════════════════════════════════════════════
//  MorningBrief.jsx — สรุปรายสาขาสไตล์ "MORNING BRIEF" (Cockpit CI)
//  ดึงข้อมูลจริงจาก ctx เดียวกับ Tracker/Products/ASP tab — ไม่มี demo data
//  ใช้: <MorningBrief ctx={ctx} selBr={selBr} setSelBr={setSelBr}/>
// ════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react'

// ── CI tokens (จาก logo: เหลือง #FFEB00 / ดำ / แดง) ──
const CI = {
  yellow: '#FFEB00', black: '#15181C', ink: '#0D1117', red: '#E2231A',
  white: '#FFFFFF', paper: '#F4F4F2', line: '#E3E3DE',
}
const ST = { over: '#1A7F3E', near: '#F2B100', push: '#E2231A' }
const statusOf = p => (p >= 100 ? 'over' : p >= 80 ? 'near' : 'push')
const dotColor = p => ST[statusOf(p)]

const F_DISP = "'Barlow Condensed', 'Arial Narrow', sans-serif"
const F_NUM  = "'JetBrains Mono', 'Roboto Mono', monospace"
const F_BODY = "'Barlow', system-ui, -apple-system, sans-serif"

const pct  = (a, b) => (b > 0 ? (a / b) * 100 : 0)
const num  = n => (n == null ? '—' : Math.round(n).toLocaleString('en-US'))
const kFmt = n => {
  if (n == null) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 ? 2 : 1).replace(/\.0$/, '') + 'M'
  if (abs >= 1000) return Math.round(n / 1000) + 'K'
  return Math.round(n).toLocaleString('en-US')
}

// ════════════════════════════════════════════════════════════════════
//  buildBriefData() — ดึงข้อมูลจริงจาก ctx (เหมือน Tracker/Products tab เป๊ะ)
//  ไม่มีค่า demo ใดๆ — ทุกตัวเลขมาจาก de (กรอกมือ) + TARGET (SEED_T/Supabase)
// ════════════════════════════════════════════════════════════════════
function buildBriefData(bid, ctx) {
  const { getMTD, getTS, getT, de, FIELDS, sumDaysUpTo, calcTS,
          TODAY_D, TOTAL_D, MTD_R, MONTH_TH, cfg, BRANCHES, BCLR } = ctx

  const branchIdx = BRANCHES.findIndex(b => b.id === bid)
  const branch = BRANCHES[branchIdx] || { id: bid, name: bid, short: bid }
  const color = BCLR[branchIdx] || CI.red

  const t  = getT(bid)     // {sales, tire, lube, battery, brake, shock, mp, cc, tireSalesTgt, ccFormula}
  const m  = getMTD(bid)   // MTD actual aggregate (ทุกฟิลด์ที่กรอกมือ)
  const ts = getTS(bid)    // MTD total sales (฿) คำนวณจาก calcTS

  // ── วันนี้ vs เป้าวัน (dynamic) — สูตรเดียวกับ Tracker tab ──
  const beforeToday    = sumDaysUpTo(de, bid, TODAY_D - 1)
  const tsBeforeToday  = calcTS(beforeToday)
  const tireBeforeToday = beforeToday.tire || 0
  const daysInclToday  = TOTAL_D - TODAY_D + 1
  const salesDayTgt = Math.max(0, Math.round((t.sales - tsBeforeToday) / daysInclToday))
  const tireDayTgt  = Math.max(0, Math.round((t.tire  - tireBeforeToday) / daysInclToday))

  const todayRow = de[bid]?.[TODAY_D] || {}
  const todayAgg = Object.fromEntries(FIELDS.map(f => [f.key, Number(todayRow[f.key]) || 0]))
  const todaySales = calcTS(todayAgg)
  const todayTire  = todayAgg.tire || 0

  // ── สินค้า MTD — สูตรเป้า MTD เดียวกับ Products tab (prorate ด้วย MTD_R) ──
  const products = [
    { key: 'tire',      name: 'ยาง',         unit: 'เส้น', actual: m.tire,      target: Math.round(t.tire * MTD_R) },
    { key: 'bsTire',    name: 'Bridgestone', unit: 'เส้น', actual: m.bsTire,    target: Math.round(t.tire * 0.35 * MTD_R) },
    { key: 'alloyWheel',name: 'Alloy Wheel', unit: 'วง',   actual: m.alloyWheel,target: null },
    { key: 'battery',   name: 'Battery',     unit: 'ลูก',  actual: m.battery,   target: Math.round(t.battery * MTD_R) },
    { key: 'brake',     name: 'Brake',       unit: 'ชิ้น', actual: m.brake,     target: Math.round(t.brake * MTD_R) },
    { key: 'shockUp',   name: 'Shock UP',    unit: 'ชิ้น', actual: m.shockUp,   target: Math.round(t.shock * MTD_R) },
    { key: 'mp',        name: 'MP',          unit: 'ชุด',  actual: m.mp,        target: Math.round(t.mp * MTD_R) },
    { key: 'lubricant', name: 'Lubricant',   unit: 'ลิตร', actual: m.lubricant, target: Math.round(t.lube * MTD_R) },
    { key: 'filter',    name: 'Filter',      unit: '',     actual: m.filter,    target: null },
    { key: 'airFilter', name: 'Air Filter',  unit: '',     actual: m.airFilter, target: null },
    { key: 'service',   name: 'Service',     unit: '',     actual: m.service,   target: null },
    { key: 'jobOrder',  name: 'Job Order',   unit: 'ราย',  actual: m.jobOrder,  target: Math.round(t.ccFormula * MTD_R) },
  ]

  // ── ASP / SPD — สูตรเดียวกับ ASP tab ──
  const asp = (m.tire > 0 && m.tireSales > 0) ? m.tireSales / m.tire : 0
  const spd = (m.jobOrder > 0) ? ts / m.jobOrder : 0

  return {
    branch: { id: branch.id, name: branch.short, color },
    dateLabel: `${TODAY_D} ${MONTH_TH} ${cfg.year}`,
    monthDay: `${TODAY_D} ${MONTH_TH}`,

    today:  { sales: todaySales, salesTarget: salesDayTgt, tires: todayTire, tiresTarget: tireDayTgt },
    mtd:    { day: TODAY_D, totalDay: TOTAL_D, sales: ts, salesTarget: Math.round(t.sales * MTD_R),
              tires: m.tire, tiresTarget: Math.round(t.tire * MTD_R) },
    month:  { salesTarget: t.sales, tiresTarget: t.tire },

    tireRev:  { actual: m.tireSales, target: Math.round(t.tireSalesTgt * MTD_R) },
    jobOrder: { actual: m.jobOrder,  target: Math.round(t.ccFormula * MTD_R) },

    kpi: { asp, aspTarget: 3800, spd, spdTarget: 5100 },
    products,
  }
}

// ── FitScreen: ย่อทั้งโปสเตอร์ให้พอดีจอ ไม่มีเลื่อน (iOS/Android + safe-area) ──
function FitScreen({ children }) {
  const wrapRef = useRef(null)
  const contentRef = useRef(null)
  const [design, setDesign] = useState(1180)
  const [scale, setScale]   = useState(1)
  useLayoutEffect(() => {
    const fit = () => {
      const wrap = wrapRef.current, content = contentRef.current
      if (!wrap || !content) return
      const aw = wrap.clientWidth, ah = wrap.clientHeight
      const d  = aw < ah ? 720 : 1180
      const cw = content.offsetWidth, ch = content.offsetHeight
      const s  = Math.min(aw / cw, ah / ch)
      setDesign(d); setScale(s)
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (contentRef.current) ro.observe(contentRef.current)
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); window.removeEventListener('orientationchange', fit) }
  }, [])
  return (
    <div ref={wrapRef} style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100dvh',
      background: CI.ink, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)',
    }}>
      <div ref={contentRef} style={{
        width: design, flex: '0 0 auto',
        transform: `scale(${scale})`, transformOrigin: 'center center',
        transition: 'transform .15s ease',
      }}>{children}</div>
    </div>
  )
}

function Mascot({ src, flip = false, size = 120 }) {
  const [err, setErr] = useState(false)
  if (src && !err) {
    return <img src={src} alt="" onError={() => setErr(true)}
      style={{ width: size, height: 'auto', objectFit: 'contain', transform: flip ? 'scaleX(-1)' : 'none' }}/>
  }
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 120 150" style={{ transform: flip ? 'scaleX(-1)' : 'none' }}>
      <ellipse cx="60" cy="34" rx="22" ry="24" fill="#F4C9A0"/>
      <path d="M38 30 Q40 8 60 8 Q80 8 82 30 Q82 18 60 16 Q38 18 38 30Z" fill={CI.black}/>
      <circle cx="52" cy="34" r="3" fill={CI.black}/><circle cx="68" cy="34" r="3" fill={CI.black}/>
      <path d="M54 44 Q60 48 66 44" stroke={CI.black} strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M34 62 Q60 56 86 62 L92 120 L28 120 Z" fill={CI.black}/>
      <path d="M60 58 L60 120 L92 120 L86 62 Q73 58 60 58Z" fill={CI.red} opacity="0.92"/>
      <path d="M60 58 L52 74 L60 80 L68 74 Z" fill={CI.yellow}/>
      <rect x="58.5" y="62" width="3" height="56" fill={CI.yellow} opacity="0.8"/>
    </svg>
  )
}
function Ring({ value, size = 60, stroke = 8, color }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(value, 100))
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={CI.line} strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
              strokeDasharray={`${(v/100)*c} ${c}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray .6s ease' }}/>
    </svg>
  )
}
function Bar({ value, color }) {
  const v = Math.max(0, Math.min(value, 100))
  return <div style={{ height: 9, borderRadius: 6, background: CI.line, overflow: 'hidden', flex: 1 }}>
    <div style={{ height: '100%', width: `${v}%`, background: color, borderRadius: 6, transition: 'width .6s ease' }}/>
  </div>
}
const CardTitle = ({ children, bg, fg = CI.white }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, color: fg,
                fontFamily: F_DISP, fontWeight: 700, fontSize: 16, letterSpacing: .3,
                padding: '4px 12px', borderRadius: 6 }}>{children}</div>
)
const cardBox = { background: CI.white, border: `1px solid ${CI.line}`, borderRadius: 12, padding: 12 }
const liS = { fontSize: 12, marginBottom: 5, listStyle: 'none', lineHeight: 1.3 }
const Divider = () => <div style={{ height: 1, background: CI.line, margin: '8px 0' }}/>
const Legend = ({ c, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }}/>{children}
  </span>
)
function Metric({ label, big, sub, p, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>{label}</div>
        <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 28, color, lineHeight: 1 }}>{big}</div>
        <div style={{ fontSize: 11, color: '#888' }}>{sub}</div>
      </div>
      <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 20, color: dotColor(p) }}>{p.toFixed(0)}%</div>
    </div>
  )
}
function MetricBar({ label, big, sub, p }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>{label}</div>
      <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 28, color: ST.over, lineHeight: 1 }}>{big}</div>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{sub}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Bar value={p} color={dotColor(p)}/>
        <span style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 15, color: dotColor(p) }}>{p.toFixed(1)}%</span>
      </div>
    </div>
  )
}
function RingMetric({ label, big, sub, p, ringFg }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>{label}</div>
        <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 24, lineHeight: 1 }}>{big}</div>
        <div style={{ fontSize: 11, color: '#888' }}>{sub}</div>
      </div>
      <div style={{ position: 'relative' }}>
        <Ring value={p} color={ringFg}/>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                       justifyContent: 'center', fontFamily: F_DISP, fontWeight: 900, fontSize: 13,
                       color: dotColor(p) }}>{p.toFixed(0)}%</span>
      </div>
    </div>
  )
}
function Panel({ title, accent, children, dark }) {
  return (
    <div style={{ background: dark ? CI.black : CI.white, border: `1px solid ${CI.line}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: accent, color: dark ? CI.black : (accent === CI.yellow ? CI.black : CI.white),
                    fontFamily: F_DISP, fontWeight: 700, fontSize: 14, padding: '4px 10px', textAlign: 'center' }}>
        {title}
      </div>
      <ul style={{ padding: '8px 10px', margin: 0, color: dark ? CI.white : CI.black, minHeight: 60 }}>{children}</ul>
    </div>
  )
}
function KpiRow({ label, val, target, ok }) {
  return (
    <li style={{ listStyle: 'none', marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: '#bbb' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 20, color: ok ? ST.over : CI.red }}>{val}</span>
        <span style={{ fontSize: 11, color: '#bbb' }}>เป้า {num(target)}</span>
        <span style={{ fontSize: 12, color: ok ? ST.over : CI.red, fontWeight: 700 }}>{ok ? '✔ เกินเป้า' : '✘ ไม่ถึงเป้า'}</span>
      </div>
    </li>
  )
}

// ════════════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════════════
export default function MorningBrief({ ctx, selBr, setSelBr, onClose,
                                        mascotSrc = '/icons/cockpit-boy.png', mascotSrc2 = '/icons/cockpit-girl.png' }) {
  const { BRANCHES, mobile } = ctx
  const [localBr, setLocalBr] = useState(selBr && selBr !== 'ALL' ? selBr : BRANCHES[0].id)
  const bid = (selBr && selBr !== 'ALL') ? selBr : localBr
  const onPick = (id) => { setLocalBr(id); if (setSelBr) setSelBr(id) }

  const b = useMemo(() => buildBriefData(bid, ctx), [bid, ctx])

  const mtdSalesP = pct(b.mtd.sales, b.mtd.salesTarget)
  const mtdTireP  = pct(b.mtd.tires, b.mtd.tiresTarget)
  const todaySP   = pct(b.today.sales, b.today.salesTarget)
  const todayTP   = pct(b.today.tires, b.today.tiresTarget)
  const monSP     = pct(b.mtd.sales, b.month.salesTarget)
  const monTP     = pct(b.mtd.tires, b.month.tiresTarget)
  const tireRevP  = pct(b.tireRev.actual, b.tireRev.target)
  const jobP      = pct(b.jobOrder.actual, b.jobOrder.target)

  const scored = useMemo(() => b.products.filter(p => p.target != null && p.target > 0)
    .map(p => ({ ...p, p: pct(p.actual, p.target) })), [b])
  const weak   = scored.filter(x => x.p < 100).sort((a, c) => a.p - c.p).slice(0, 5)
  const strong = scored.filter(x => x.p >= 100).sort((a, c) => c.p - a.p).slice(0, 5)

  return (
    <>
    {onClose && (
      <button onClick={onClose} aria-label="กลับ" style={{
        position: 'fixed', top: 'calc(10px + env(safe-area-inset-top))', left: 'calc(10px + env(safe-area-inset-left))',
        zIndex: 50, background: CI.black, color: CI.yellow, border: `1px solid ${CI.yellow}`,
        borderRadius: 8, padding: '6px 12px', fontFamily: F_DISP, fontWeight: 700, fontSize: 13,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
      }}>← กลับ</button>
    )}
    <FitScreen>
    <div style={{ fontFamily: F_BODY, width: '100%', color: CI.black }}>
      <div style={{ width: '100%', background: CI.paper, borderRadius: 14, overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0,0,0,.5)' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'stretch', background: CI.yellow }}>
          <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 28, lineHeight: .9, letterSpacing: -1 }}>COCKPIT</div>
            <div style={{ fontSize: 9, fontWeight: 600, opacity: .75 }}>ศูนย์บริการรถยนต์ครบวงจร</div>
          </div>
          <div style={{ flex: 1, position: 'relative', background: CI.black,
                        clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
            <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 24, color: CI.white, letterSpacing: 1 }}>MORNING BRIEF ☀</div>
            <div style={{ background: CI.white, color: CI.black, fontWeight: 700, fontSize: 12,
                          padding: '1px 14px', borderRadius: 4, marginTop: 2 }}>{b.dateLabel}</div>
          </div>
          <div style={{ background: CI.yellow, padding: '8px 18px', textAlign: 'right',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 34, lineHeight: .85 }}>{b.branch.id}</div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>{b.branch.name}</div>
          </div>
        </div>

        {/* branch selector */}
        <div style={{ background: CI.black, padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: CI.yellow, fontSize: 12, fontWeight: 700 }}>เลือกสาขา</span>
          <select value={bid} onChange={e => onPick(e.target.value)}
                  style={{ background: CI.ink, color: CI.white, border: `1px solid ${CI.yellow}`,
                           borderRadius: 6, padding: '3px 8px', fontWeight: 700 }}>
            {BRANCHES.map(br => <option key={br.id} value={br.id}>{br.id} — {br.short}</option>)}
          </select>
        </div>

        <div style={{ padding: 12 }}>
          {/* TOP 3 CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 10 }}>
            <div style={cardBox}>
              <CardTitle bg={CI.red}>📅 วันนี้ ({b.monthDay})</CardTitle>
              <Metric label="ยอดขายวันนี้" big={kFmt(b.today.sales)} sub={`เป้าวัน ${kFmt(b.today.salesTarget)}`} p={todaySP} color={CI.red}/>
              <Divider/>
              <Metric label="ยางวันนี้" big={`${num(b.today.tires)} เส้น`} sub={`เป้าวัน ${num(b.today.tiresTarget)} เส้น`} p={todayTP} color={CI.red}/>
            </div>

            <div style={cardBox}>
              <CardTitle bg={ST.over}>MTD (1–{b.mtd.day})</CardTitle>
              <MetricBar label="ยอดขาย MTD" big={kFmt(b.mtd.sales)} sub={`เป้า MTD ${kFmt(b.mtd.salesTarget)}`} p={mtdSalesP}/>
              <Divider/>
              <MetricBar label="ยาง MTD" big={`${num(b.mtd.tires)} เส้น`} sub={`เป้า MTD ${num(b.mtd.tiresTarget)} เส้น`} p={mtdTireP}/>
            </div>

            <div style={cardBox}>
              <CardTitle bg={CI.black} fg={CI.yellow}>🎯 เป้ารวมทั้งเดือน</CardTitle>
              <RingMetric label="ยอดขายเป้ารวม" big={kFmt(b.month.salesTarget)} sub={`(MTD ${kFmt(b.mtd.sales)})`} p={monSP} ringFg={CI.red}/>
              <Divider/>
              <RingMetric label="ยางเป้ารวม" big={`${num(b.month.tiresTarget)} เส้น`} sub={`(MTD ${num(b.mtd.tires)} เส้น)`} p={monTP} ringFg={CI.yellow}/>
            </div>
          </div>

          {/* PRODUCTS MTD */}
          <div style={{ background: CI.black, borderRadius: 12, padding: 12, marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
              <span style={{ color: CI.white, fontFamily: F_DISP, fontWeight: 700, fontSize: 17 }}>
                สินค้า MTD (1–{b.mtd.day})
              </span>
              <span style={{ display: 'flex', gap: 10, fontSize: 11, color: '#cfd2d6' }}>
                <Legend c={ST.over}>เกินเป้า</Legend><Legend c={ST.near}>ใกล้เป้า</Legend><Legend c={ST.push}>ต้องเร่ง</Legend>
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 7 }}>
              {b.products.map(p => {
                const has = p.target != null && p.target > 0
                const pp = has ? pct(p.actual, p.target) : null
                return (
                  <div key={p.key} style={{ background: CI.paper, borderRadius: 8, padding: '7px 9px' }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{p.name}</div>
                    <div style={{ fontFamily: F_NUM, fontSize: 13, marginTop: 1 }}>
                      {p.key === 'service' ? kFmt(p.actual) : num(p.actual)}{has ? ` / ${num(p.target)}` : ''} {p.unit}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: has ? dotColor(pp) : '#bbb' }}/>
                      <span style={{ fontWeight: 700, fontSize: 12, color: has ? dotColor(pp) : '#888' }}>
                        {has ? pp.toFixed(1) + '%' : '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 8, marginTop: 8 }}>
              <div style={{ background: CI.paper, borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>ยอดขายยาง MTD</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 21 }}>
                    {kFmt(b.tireRev.actual)} / {kFmt(b.tireRev.target)} ฿
                  </span>
                  <span style={{ fontWeight: 800, color: dotColor(tireRevP) }}>{tireRevP.toFixed(1)}%</span>
                </div>
              </div>
              <div style={{ background: '#FFF7D6', border: `1px solid ${CI.yellow}`, borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>ลูกค้าเข้าใช้บริการ (Job Order)</div>
                <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 18 }}>
                  {num(b.jobOrder.actual)} / {num(b.jobOrder.target)} ราย
                  <span style={{ marginLeft: 8, color: dotColor(jobP), fontSize: 16 }}>{jobP.toFixed(1)}%</span>
                </div>
                {b.jobOrder.target - b.jobOrder.actual > 0 &&
                  <div style={{ color: CI.red, fontWeight: 700, fontSize: 11 }}>
                    ขาดลูกค้าอีก {Math.round(b.jobOrder.target - b.jobOrder.actual)} ราย เร่งเพิ่ม Traffic!
                  </div>}
              </div>
            </div>
          </div>

          {/* BOTTOM 4 PANELS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 8, marginTop: 12 }}>
            <Panel title="จุดอ่อนที่ต้องเร่ง" accent={CI.red}>
              {weak.length === 0 && <li style={{ ...liS, color: '#888' }}>ไม่มีจุดอ่อน 🎉</li>}
              {weak.map(w => (
                <li key={w.key} style={liS}>
                  <b style={{ color: CI.red }}>▼ {w.name} {w.p.toFixed(1)}%</b>
                  <span style={{ color: '#666' }}> ขาดอีก {Math.max(0, Math.round(w.target - w.actual))} {w.unit} ถึงเป้า</span>
                </li>
              ))}
            </Panel>
            <Panel title="จุดแข็งที่น่าชื่นชม" accent={ST.over}>
              {strong.length === 0 && <li style={{ ...liS, color: '#888' }}>ยังไม่มีรายการเกินเป้า</li>}
              {strong.map(s => (
                <li key={s.key} style={liS}>
                  <b style={{ color: ST.over }}>▲ {s.name} {s.p.toFixed(1)}%</b>
                  <span style={{ color: '#666' }}> เกินเป้า +{Math.round(s.actual - s.target)} {s.unit}</span>
                </li>
              ))}
            </Panel>
            <Panel title="แนวทางเร่งรัด" accent="#1d4ed8">
              <li style={liS}>เพิ่ม Traffic / ลูกค้าใหม่ ดันยอด Job Order</li>
              <li style={liS}>โฟกัสกลุ่มยางต่อเนื่อง รักษายอดขาย</li>
              <li style={liS}>เร่งเพิ่ม MP และ Shock UP แนะนำสินค้าเพิ่มเติม</li>
              <li style={liS}>จับกลุ่มลูกค้าเก่า / Fleet ต่อเนื่อง</li>
            </Panel>
            <Panel title="KPI สำคัญ" accent={CI.yellow} dark>
              <KpiRow label="ASP (บาท/เส้น)" val={b.kpi.asp > 0 ? '฿' + num(b.kpi.asp) : '—'} target={b.kpi.aspTarget} ok={b.kpi.asp >= b.kpi.aspTarget}/>
              <KpiRow label="SPD (บาท/Job)" val={b.kpi.spd > 0 ? '฿' + num(b.kpi.spd) : '—'} target={b.kpi.spdTarget} ok={b.kpi.spd >= b.kpi.spdTarget}/>
            </Panel>
          </div>
        </div>

        {/* FOOTER + mascots */}
        <div style={{ background: CI.yellow, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 14px' }}>
          <Mascot src={mascotSrc} size={100}/>
          <div style={{ textAlign: 'center', paddingBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: CI.red, fontStyle: 'italic' }}>
              รักษามาตรฐานที่ดีต่อเนื่อง! ปิดจุดอ่อน เพิ่มจุดแข็ง
            </div>
            <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 26, letterSpacing: -.5 }}>
              COCKPIT <span style={{ color: CI.red }}>100%</span>
            </div>
          </div>
          <Mascot src={mascotSrc2} flip size={100}/>
        </div>
      </div>
    </div>
    </FitScreen>
    </>
  )
}
