// ════════════════════════════════════════════════════════════════════
//  MorningBrief.jsx — สรุปรายสาขาสไตล์ "MORNING BRIEF" (Cockpit CI)
//  เรนเดอร์เป็น tab ปกติ (เลื่อนได้เหมือนแท็บอื่นๆ) — ไม่ใช้ JS scale-to-fit
//  เพราะวิธีนั้นพังบนเครื่องจริง (จับขนาดผิดจังหวะตอนฟอนต์/รูปโหลด)
//  รองรับ "🌐 รวมทุกสาขา" โดยใช้ getAllMTD/getAllTS/getT('ALL') ตัวเดียวกับ
//  Overview/Tracker tab
// ════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react'

const CI = {
  yellow: '#FFEB00', black: '#15181C', red: '#E2231A',
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
//  buildBriefData() — ดึงข้อมูลจริงจาก ctx (เหมือน Tracker/Products/ASP tab)
//  bid === 'ALL' → รวมทุกสาขา (ใช้ getAllMTD/getAllTS/getT('ALL') ที่มีอยู่แล้ว)
// ════════════════════════════════════════════════════════════════════
function buildBriefData(bid, ctx) {
  const { getMTD, getAllMTD, getTS, getAllTS, getT, de, FIELDS, sumDaysUpTo, calcTS,
          TODAY_D, TOTAL_D, MTD_R, MONTH_TH, cfg, BRANCHES, BCLR } = ctx

  const isAll = bid === 'ALL'
  const branchIdx = isAll ? -1 : BRANCHES.findIndex(x => x.id === bid)
  const branch = isAll
    ? { id: 'ALL', short: 'รวมทุกสาขา' }
    : (BRANCHES[branchIdx] || { id: bid, short: bid })
  const color = isAll ? CI.black : (BCLR[branchIdx] || CI.red)

  const t  = getT(bid)
  const m  = isAll ? getAllMTD() : getMTD(bid)
  const ts = isAll ? getAllTS() : getTS(bid)

  // ── วันนี้ vs เป้าวัน (dynamic) — สูตรเดียวกับ Tracker tab ──
  // สำหรับ ALL: รวม before-today และ today ของทุกสาขาเอง (de ไม่มี key 'ALL')
  const ids = isAll ? BRANCHES.map(b => b.id) : [bid]
  const beforeToday = Object.fromEntries(FIELDS.map(f => [f.key, 0]))
  ids.forEach(id => {
    const s = sumDaysUpTo(de, id, TODAY_D - 1)
    FIELDS.forEach(f => { beforeToday[f.key] += s[f.key] || 0 })
  })
  const tsBeforeToday   = calcTS(beforeToday)
  const tireBeforeToday = beforeToday.tire || 0
  const daysInclToday   = TOTAL_D - TODAY_D + 1
  const salesDayTgt = Math.max(0, Math.round((t.sales - tsBeforeToday) / daysInclToday))
  const tireDayTgt  = Math.max(0, Math.round((t.tire  - tireBeforeToday) / daysInclToday))

  const todayAgg = Object.fromEntries(FIELDS.map(f => [f.key, 0]))
  ids.forEach(id => {
    const row = de[id]?.[TODAY_D] || {}
    FIELDS.forEach(f => { todayAgg[f.key] += Number(row[f.key]) || 0 })
  })
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

function Mascot({ src, flip = false, size = 90 }) {
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
function Ring({ value, size = 56, stroke = 8, color }) {
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
  return <div style={{ height: 8, borderRadius: 6, background: CI.line, overflow: 'hidden', flex: 1 }}>
    <div style={{ height: '100%', width: `${v}%`, background: color, borderRadius: 6, transition: 'width .6s ease' }}/>
  </div>
}
const CardTitle = ({ children, bg, fg = CI.white }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: bg, color: fg,
                fontFamily: F_DISP, fontWeight: 700, fontSize: 14, letterSpacing: .3,
                padding: '4px 10px', borderRadius: 6 }}>{children}</div>
)
const cardBox = { background: CI.white, border: `1px solid ${CI.line}`, borderRadius: 12, padding: 11 }
const liS = { fontSize: 11.5, marginBottom: 5, listStyle: 'none', lineHeight: 1.3 }
const Divider = () => <div style={{ height: 1, background: CI.line, margin: '7px 0' }}/>
const Legend = ({ c, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }}/>{children}
  </span>
)
function Metric({ label, big, sub, p, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>{label}</div>
        <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 24, color, lineHeight: 1 }}>{big}</div>
        <div style={{ fontSize: 10, color: '#888' }}>{sub}</div>
      </div>
      <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 18, color: dotColor(p) }}>{p.toFixed(0)}%</div>
    </div>
  )
}
function MetricBar({ label, big, sub, p }) {
  return (
    <div style={{ marginTop: 7 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>{label}</div>
      <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 24, color: ST.over, lineHeight: 1 }}>{big}</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>{sub}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Bar value={p} color={dotColor(p)}/>
        <span style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 13, color: dotColor(p) }}>{p.toFixed(1)}%</span>
      </div>
    </div>
  )
}
function RingMetric({ label, big, sub, p, ringFg }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>{label}</div>
        <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 21, lineHeight: 1 }}>{big}</div>
        <div style={{ fontSize: 10, color: '#888' }}>{sub}</div>
      </div>
      <div style={{ position: 'relative' }}>
        <Ring value={p} color={ringFg}/>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                       justifyContent: 'center', fontFamily: F_DISP, fontWeight: 900, fontSize: 12,
                       color: dotColor(p) }}>{p.toFixed(0)}%</span>
      </div>
    </div>
  )
}
function Panel({ title, accent, children, dark }) {
  return (
    <div style={{ background: dark ? CI.black : CI.white, border: `1px solid ${CI.line}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ background: accent, color: dark ? CI.black : (accent === CI.yellow ? CI.black : CI.white),
                    fontFamily: F_DISP, fontWeight: 700, fontSize: 13, padding: '4px 10px', textAlign: 'center' }}>
        {title}
      </div>
      <ul style={{ padding: '8px 10px', margin: 0, color: dark ? CI.white : CI.black, minHeight: 50 }}>{children}</ul>
    </div>
  )
}
function KpiRow({ label, val, target, ok }) {
  return (
    <li style={{ listStyle: 'none', marginBottom: 7 }}>
      <div style={{ fontSize: 10.5, color: '#bbb' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 18, color: ok ? ST.over : CI.red }}>{val}</span>
        <span style={{ fontSize: 10.5, color: '#bbb' }}>เป้า {num(target)}</span>
        <span style={{ fontSize: 11, color: ok ? ST.over : CI.red, fontWeight: 700 }}>{ok ? '✔ เกินเป้า' : '✘ ไม่ถึงเป้า'}</span>
      </div>
    </li>
  )
}

// ════════════════════════════════════════════════════════════════════
//  MAIN — เรนเดอร์เป็นเนื้อหาใน content area ปกติ (เลื่อนได้เหมือนแท็บอื่น)
// ════════════════════════════════════════════════════════════════════
export default function MorningBrief({ ctx, selBr, setSelBr,
                                        mascotSrc = '/icons/cockpit-boy.png', mascotSrc2 = '/icons/cockpit-girl.png' }) {
  const { BRANCHES, mobile } = ctx
  const bid = selBr || '143'
  const onPick = (id) => { if (setSelBr) setSelBr(id) }
  const [page, setPage] = useState(0)
  const PAGES = ['สรุป', 'สินค้า', 'วิเคราะห์']

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
    <div style={{ fontFamily: F_BODY, color: CI.black, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ background: CI.paper, borderRadius: 14, overflow: 'hidden',
                    boxShadow: '0 6px 24px rgba(0,0,0,.35)' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'stretch', background: CI.yellow, flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 24, lineHeight: .9, letterSpacing: -1 }}>COCKPIT</div>
            <div style={{ fontSize: 8.5, fontWeight: 600, opacity: .75 }}>ศูนย์บริการรถยนต์ครบวงจร</div>
          </div>
          <div style={{ flex: 1, minWidth: 160, position: 'relative', background: CI.black,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px' }}>
            <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 20, color: CI.white, letterSpacing: 1 }}>MORNING BRIEF ☀</div>
            <div style={{ background: CI.white, color: CI.black, fontWeight: 700, fontSize: 11,
                          padding: '1px 12px', borderRadius: 4, marginTop: 2 }}>{b.dateLabel}</div>
          </div>
          <div style={{ background: CI.yellow, padding: '8px 14px', textAlign: 'right',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 26, lineHeight: .85 }}>{b.branch.id}</div>
            <div style={{ fontWeight: 700, fontSize: 11 }}>{b.branch.name}</div>
          </div>
        </div>

        {/* branch selector — รวม "🌐 รวมทุกสาขา" เหมือนแท็บอื่นในแอป */}
        <div style={{ background: CI.black, padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: CI.yellow, fontSize: 11, fontWeight: 700 }}>เลือกสาขา</span>
          <select value={bid} onChange={e => onPick(e.target.value)}
                  style={{ background: '#0D1117', color: CI.white, border: `1px solid ${CI.yellow}`,
                           borderRadius: 6, padding: '3px 8px', fontWeight: 700, fontSize: 13, maxWidth: '100%' }}>
            <option value="ALL">🌐 รวมทุกสาขา</option>
            {BRANCHES.map(br => <option key={br.id} value={br.id}>{br.id} — {br.short}</option>)}
          </select>
        </div>

        {/* page switcher — แบ่ง 3 หน้าย่อยให้แต่ละหน้าสั้นพอไม่ต้องเลื่อน */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#0D1117', padding: '6px 8px' }}>
          <button onClick={() => setPage(p => (p + 2) % 3)} aria-label="ก่อนหน้า" style={{
            background: 'transparent', color: CI.yellow, border: 'none', fontSize: 18, fontWeight: 900,
            padding: '2px 8px', cursor: 'pointer', lineHeight: 1 }}>‹</button>
          <div style={{ display: 'flex', flex: 1, gap: 4 }}>
            {PAGES.map((label, i) => (
              <button key={i} onClick={() => setPage(i)} style={{
                flex: 1, padding: '6px 4px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: F_DISP, fontWeight: 700, fontSize: 12,
                background: page === i ? CI.yellow : '#1e2230', color: page === i ? CI.black : '#9aa',
              }}>{i + 1}. {label}</button>
            ))}
          </div>
          <button onClick={() => setPage(p => (p + 1) % 3)} aria-label="หน้าถัดไป" style={{
            background: 'transparent', color: CI.yellow, border: 'none', fontSize: 18, fontWeight: 900,
            padding: '2px 8px', cursor: 'pointer', lineHeight: 1 }}>›</button>
        </div>

        <div style={{ padding: mobile ? 8 : 12 }}>
          {/* PAGE 1 — สรุป: วันนี้ / MTD / เป้ารวมเดือน */}
          {page === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 8 }}>
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
          )}

          {/* PAGE 2 — สินค้า MTD */}
          {page === 1 && (
          <div style={{ background: CI.black, borderRadius: 12, padding: 10, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <span style={{ color: CI.white, fontFamily: F_DISP, fontWeight: 700, fontSize: 15 }}>
                สินค้า MTD (1–{b.mtd.day})
              </span>
              <span style={{ display: 'flex', gap: 9, fontSize: 10, color: '#cfd2d6' }}>
                <Legend c={ST.over}>เกินเป้า</Legend><Legend c={ST.near}>ใกล้เป้า</Legend><Legend c={ST.push}>ต้องเร่ง</Legend>
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 6 }}>
              {b.products.map(p => {
                const has = p.target != null && p.target > 0
                const pp = has ? pct(p.actual, p.target) : null
                return (
                  <div key={p.key} style={{ background: CI.paper, borderRadius: 8, padding: '7px 8px' }}>
                    <div style={{ fontWeight: 700, fontSize: 11.5 }}>{p.name}</div>
                    <div style={{ fontFamily: F_NUM, fontSize: 12.5, marginTop: 1 }}>
                      {p.key === 'service' ? kFmt(p.actual) : num(p.actual)}{has ? ` / ${num(p.target)}` : ''} {p.unit}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: has ? dotColor(pp) : '#bbb' }}/>
                      <span style={{ fontWeight: 700, fontSize: 11, color: has ? dotColor(pp) : '#888' }}>
                        {has ? pp.toFixed(1) + '%' : '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 7, marginTop: 7 }}>
              <div style={{ background: CI.paper, borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#555' }}>ยอดขายยาง MTD</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 18 }}>
                    {kFmt(b.tireRev.actual)} / {kFmt(b.tireRev.target)} ฿
                  </span>
                  <span style={{ fontWeight: 800, color: dotColor(tireRevP) }}>{tireRevP.toFixed(1)}%</span>
                </div>
              </div>
              <div style={{ background: '#FFF7D6', border: `1px solid ${CI.yellow}`, borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#555' }}>ลูกค้าเข้าใช้บริการ (Job Order)</div>
                <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 15 }}>
                  {num(b.jobOrder.actual)} / {num(b.jobOrder.target)} ราย
                  <span style={{ marginLeft: 7, color: dotColor(jobP), fontSize: 14 }}>{jobP.toFixed(1)}%</span>
                </div>
                {b.jobOrder.target - b.jobOrder.actual > 0 &&
                  <div style={{ color: CI.red, fontWeight: 700, fontSize: 10.5 }}>
                    ขาดลูกค้าอีก {Math.round(b.jobOrder.target - b.jobOrder.actual)} ราย เร่งเพิ่ม Traffic!
                  </div>}
              </div>
            </div>
          </div>
          )}

          {/* PAGE 3 — วิเคราะห์: จุดอ่อน/จุดแข็ง/แนวทาง/KPI */}
          {page === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 7 }}>
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
          )}
        </div>

        {/* FOOTER + mascots */}
        <div style={{ background: CI.yellow, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 10px', flexWrap: 'wrap' }}>
          <Mascot src={mascotSrc} size={80}/>
          <div style={{ textAlign: 'center', paddingBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: CI.red, fontStyle: 'italic' }}>
              รักษามาตรฐานที่ดีต่อเนื่อง! ปิดจุดอ่อน เพิ่มจุดแข็ง
            </div>
            <div style={{ fontFamily: F_DISP, fontWeight: 900, fontSize: 22, letterSpacing: -.5 }}>
              COCKPIT <span style={{ color: CI.red }}>100%</span>
            </div>
          </div>
          <Mascot src={mascotSrc2} flip size={80}/>
        </div>
      </div>
    </div>
  )
}
