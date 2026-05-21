import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase.js'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

/* ── Google Fonts ── */
const _f = document.createElement('link')
_f.rel = 'stylesheet'
_f.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=JetBrains+Mono:wght@400;600;700&family=Barlow:wght@400;500;600&display=swap'
document.head.appendChild(_f)

/* ════════════════════════════════════════════════════════
   SUPABASE HELPERS
   ใช้ตาราง app_data (key TEXT, value JSONB)
════════════════════════════════════════════════════════ */
const DB = {
  get: async (key) => {
    const { data } = await supabase.from('app_data').select('value').eq('key', key).maybeSingle()
    return data?.value ?? null
  },
  set: async (key, val) => {
    await supabase.from('app_data').upsert({ key, value: val, updated_at: new Date().toISOString() })
  },
  // subscribe to all changes in app_data table
  listen: (onRow) => {
    return supabase.channel('cockpit_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data' }, onRow)
      .subscribe()
  }
}

/* ── Mobile hook ── */
function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

/* ════════════════════════════════════════════════════════
   STATIC DATA
════════════════════════════════════════════════════════ */
const BRANCHES = [
  { id:'003', name:'Cockpit Srinakarin',         short:'ศรีนครินทร์'   },
  { id:'009', name:'Cockpit Nakorn Ratchasima',  short:'นครราชสีมา'   },
  { id:'010', name:'Cockpit Udonthani',           short:'อุดรธานี'     },
  { id:'012', name:'Cockpit Khonkaen',            short:'ขอนแก่น'     },
  { id:'014', name:'Cockpit Ubolratchathani',     short:'อุบลราชธานี' },
  { id:'048', name:'Cockpit Surin',               short:'สุรินทร์'     },
  { id:'050', name:'Cockpit Lopburi',             short:'ลพบุรี'       },
  { id:'096', name:'Cockpit Nakorn Ratchasima 2', short:'นครราชสีมา2' },
  { id:'107', name:'Cockpit By Pass Udonthani',   short:'Bypass อุดรฯ'},
  { id:'143', name:'Cockpit Samut Prakarn',       short:'สมุทรปราการ' },
]

const SEED_T = {
  '003':{sales:2553704,tire:400,lube:650, battery:43,brake:36,shock:33,mp:150,cc:790},
  '009':{sales:2455797,tire:430,lube:514, battery:25,brake:37,shock:34,mp:154,cc:728},
  '010':{sales:2353415,tire:380,lube:447, battery:36,brake:34,shock:31,mp:142,cc:760},
  '012':{sales:2502610,tire:420,lube:862, battery:45,brake:37,shock:34,mp:155,cc:919},
  '014':{sales:2516970,tire:420,lube:726, battery:42,brake:38,shock:34,mp:156,cc:739},
  '048':{sales:1613513,tire:290,lube:273, battery:30,brake:26,shock:24,mp:107,cc:583},
  '050':{sales:2100540,tire:400,lube:726, battery:21,brake:35,shock:32,mp:146,cc:458},
  '096':{sales:1618298,tire:270,lube:301, battery:21,brake:24,shock:21,mp:98, cc:330},
  '107':{sales:1517936,tire:250,lube:344, battery:27,brake:23,shock:20,mp:92, cc:377},
  '143':{sales:903980, tire:150,lube:120, battery:10,brake:12,shock:11,mp:55, cc:200},
}

const SEED_H = {
  '003':{2023:[2969,2212,2940,2555,2383,2419,2637,2271,2423,2551,2210,3240],2024:[3031,3082,2272,2313,2327,2219,2650,2400,2031,3198,2378,2878],2025:[2599,3142,2232,2680,2626,2363,3135,2710,2596,2917,2907,4215],2026:[3037,2405,2970,2580,null,null,null,null,null,null,null,null]},
  '009':{2023:[2235,1790,1586,1764,1369,1568,1824,1488,1021,1165,2163,1672],2024:[1786,1696,1773,1863,1741,1719,1855,1843,1741,2012,1569,2276],2025:[2071,2179,1798,1935,1891,1875,2093,2444,2343,2440,1940,2300],2026:[2134,2085,2529,2410,null,null,null,null,null,null,null,null]},
  '010':{2023:[2468,2209,2460,2675,2356,2374,2462,2111,2009,2335,1823,2433],2024:[2328,2429,2149,2262,2320,1955,2382,1909,1256,2253,1646,2270],2025:[2338,2199,2028,2191,2142,2126,2488,2458,2357,2639,2056,2636],2026:[2430,1890,2460,2258,null,null,null,null,null,null,null,null]},
  '012':{2023:[2121,1680,1922,1903,1660,2037,1868,1880,1583,1352,1805,2019],2024:[2056,1979,1703,1881,1948,2157,2038,1866,2014,2216,2342,2444],2025:[2269,1869,1955,2100,1831,2251,2013,2300,2434,2164,1996,2664],2026:[2518,2209,2718,2464,null,null,null,null,null,null,null,null]},
  '014':{2023:[2009,2048,2043,1755,2026,1678,2052,1619,1613,1948,1895,2265],2024:[2250,2136,1643,2047,2001,1988,2156,1621,1227,1910,1803,2016],2025:[2335,2045,2239,2136,1985,1923,2300,2081,2268,2878,2333,2693],2026:[2430,2272,2362,2501,null,null,null,null,null,null,null,null]},
  '048':{2023:[1335,1260,1197,1184,1066,1019,1178,1170,982,1238,984,1273],  2024:[1358,1165,1076,1066,1166,1054,1161,1339,1113,1270,1220,1647],2025:[1562,1138,1099,1527,1384,1334,1375,1428,1375,1726,1452,1505],2026:[1554,1373,1737,1788,null,null,null,null,null,null,null,null]},
  '050':{2023:[1268,1326,1119,1008,932,1117,1102,1026,987,1079,868,1480],   2024:[1471,1477,1140,1191,1158,1526,1124,1088,1069,1132,1017,1718],2025:[1266,1376,1416,1366,1210,1446,1982,1698,1713,1844,1713,2259],2026:[2202,1973,2527,2530,null,null,null,null,null,null,null,null]},
  '096':{2023:[1330,1036,1346,1211,1214,987,1293,1069,1085,1068,1059,1149], 2024:[1429,1416,1217,1027,1210,1082,1300,1346,1252,1643,1452,1303],2025:[1849,1757,1496,1802,1733,1556,1682,1433,1443,1535,1241,1581],2026:[1589,1470,1713,1533,null,null,null,null,null,null,null,null]},
  '107':{2023:[1223,939,1234,1560,1131,1427,1455,1262,1134,1517,1104,1333], 2024:[1267,1401,1076,1564,1396,1352,1457,1433,1305,1477,983,1058], 2025:[1184,1522,1322,1242,1538,1292,1520,1472,1299,1374,1536,1643],2026:[1745,1440,1450,1624,null,null,null,null,null,null,null,null]},
  '143':{2023:[1376,1042,992,1033,561,1009,1191,744,868,927,1137,1450],     2024:[1447,1265,1047,1110,1060,866,1018,805,594,702,586,857],     2025:[930,819,864,864,864,864,864,864,864,864,864,864],          2026:[null,null,null,987,null,null,null,null,null,null,null,null]},
}

const SEED_TIREQ = {
  '003':{2024:[310,295,270,290,258,270,300,275,250,330,290,380],2025:[340,380,310,340,301,310,355,320,305,375,340,450]},
  '009':{2024:[442,400,432,465,347,420,476,425,430,504,392,567],2025:[519,545,449,484,329,469,523,611,576,610,485,575]},
  '010':{2024:[545,560,502,528,425,442,561,446,293,526,384,531],2025:[546,514,473,511,374,496,581,574,550,616,480,615]},
  '012':{2024:[508,489,421,465,359,533,504,461,497,548,578,603],2025:[560,462,483,519,316,556,497,568,601,535,494,658]},
  '014':{2024:[556,528,407,506,359,490,533,401,303,472,446,499],2025:[578,506,554,528,342,475,569,515,561,712,577,666]},
  '048':{2024:[249,213,197,195,200,193,213,245,204,233,224,302],2025:[286,208,201,279,258,244,251,261,252,315,266,275]},
  '050':{2024:[215,220,200,215,232,255,220,210,200,225,200,310],2025:[245,255,260,255,273,290,370,335,320,360,325,420]},
  '096':{2024:[248,246,211,178,210,188,226,234,217,285,252,226],2025:[321,305,260,313,270,270,292,249,251,267,215,274]},
  '107':{2024:[219,243,187,271,214,234,253,249,227,256,171,184],2025:[205,264,229,215,241,224,264,256,225,238,266,285]},
  '143':{2024:[200,185,175,185,166,155,175,150,110,130,110,155],2025:[175,165,180,180,235,195,190,185,185,190,185,230]},
}

const MAY_TIRE  = {'003':{2024:258,2025:301},'009':{2024:347,2025:329},'010':{2024:425,2025:374},'012':{2024:359,2025:316},'014':{2024:359,2025:342},'048':{2024:200,2025:258},'050':{2024:232,2025:273},'096':{2024:210,2025:270},'107':{2024:214,2025:241},'143':{2024:166,2025:235}}
const MAY_SALES = {'003':{2024:2342613,2025:2636276},'009':{2024:1752367,2025:1902681},'010':{2024:2335800,2025:2154803},'012':{2024:1963187,2025:1843356},'014':{2024:2010373,2025:1998710},'048':{2024:1171076,2025:1390155},'050':{2024:1167049,2025:1218827},'096':{2024:1210000,2025:1733000},'107':{2024:1403859,2025:1543090},'143':{2024:1055953,2025:1639561}}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const BCLR = ['#f59e0b','#3b82f6','#10b981','#ef4444','#8b5cf6','#f97316','#06b6d4','#e11d48','#84cc16','#ec4899']
const YRCLR = {2023:'#475569',2024:'#94a3b8',2025:'#f59e0b',2026:'#22c55e'}
const DEFAULT_CFG = {year:2026, month:5, todayDay:15}

/* ── Helpers ── */
const N  = (n,d=0) => Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:d,maximumFractionDigits:d})
const fM = (n) => n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':N(n)
const P  = (a,b) => b?(a/b)*100:0
const dIM = (y,m) => new Date(y,m,0).getDate()

/* ── Entry field definitions ── */
const FIELDS = [
  {key:'totalSales', label:'ยอดขายรวมวัน (฿)',         tgt:null},   // ← เพิ่มใหม่
  {key:'tire',       label:'ยาง (เส้น)',                tgt:'tire'},
  {key:'tireSales',  label:'ยอดขายยาง (฿)',             tgt:null},
  {key:'bsTire',     label:'ยาง Bridgestone (เส้น)',    tgt:null},
  {key:'alloyWheel', label:'Alloy Wheel (วง)',           tgt:null},
  {key:'battery',    label:'Battery (ลูก)',              tgt:'battery'},
  {key:'brake',      label:'Brake (ชิ้น)',               tgt:'brake'},
  {key:'shockUp',    label:'Shock Up (ชิ้น)',            tgt:'shock'},
  {key:'mp',         label:'MP (ชุด)',                   tgt:'mp'},
  {key:'lubricant',  label:'Lubricant (ลิตร)',           tgt:'lube'},
  {key:'filter',     label:'Filter (ชิ้น)',              tgt:null},
  {key:'airFilter',  label:'Air Filter (ชิ้น)',          tgt:null},
  {key:'service',    label:'Service (฿)',                tgt:null},
  {key:'jobOrder',   label:'Job Order (ราย)',            tgt:'cc'},
]
const EMPTY_ROW = () => Object.fromEntries(FIELDS.map(f=>[f.key,0]))

function sumDays(de, bid) {
  const agg = Object.fromEntries(FIELDS.map(f=>[f.key,0]))
  Object.values(de[bid]||{}).forEach(r => FIELDS.forEach(f => { agg[f.key] += parseFloat(r[f.key])||0 }))
  return agg
}
// Sum days 1..toDay only (for dynamic daily target calculation)
function sumDaysUpTo(de, bid, toDay) {
  const agg = Object.fromEntries(FIELDS.map(f=>[f.key,0]))
  for (let d=1; d<=toDay; d++) {
    const r = de[bid]?.[d]
    if (r) FIELDS.forEach(f => { agg[f.key] += parseFloat(r[f.key])||0 })
  }
  return agg
}
function calcTS(agg) {
  // 1️⃣ ถ้ากรอก "ยอดขายรวมวัน (฿)" โดยตรง ใช้ค่านั้น
  if ((agg.totalSales||0) > 0) return Number(agg.totalSales)
  // 2️⃣ ถ้ากรอกยอดแยกรายการ รวมเฉพาะช่องที่เป็นเงิน (฿)
  // tireSales, service คือยอดเงินโดยตรง
  // battery/brake/shock/mp/alloy คูณราคาประมาณ
  const fromItems = (agg.tireSales||0)+(agg.service||0)+
    (agg.battery||0)*3500+(agg.brake||0)*800+
    (agg.shockUp||0)*800+(agg.mp||0)*2500+(agg.alloyWheel||0)*4500
  return fromItems
}

/* ── UI atoms ── */
function PBadge({value}) {
  const v = parseFloat(value)||0
  const bg = v>=100?'#166534':v>=90?'#92400e':'#991b1b'
  const tx = v>=100?'#bbf7d0':v>=90?'#fef3c7':'#fecaca'
  return <span style={{background:bg,color:tx,borderRadius:4,padding:'2px 8px',fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",whiteSpace:'nowrap'}}>{v.toFixed(1)}%</span>
}

function Card({label,value,sub,color='#f59e0b',small}) {
  return (
    <div style={{background:'#1e2538',border:'1px solid #2d3548',borderRadius:8,padding:'10px 12px'}}>
      <div style={{fontSize:9,color:'#6b7280',textTransform:'uppercase',letterSpacing:1,marginBottom:2,fontFamily:'Barlow Condensed'}}>{label}</div>
      <div style={{fontSize:small?16:20,fontWeight:700,color,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:'#6b7280',marginTop:2}}>{sub}</div>}
    </div>
  )
}

/* ── Branch Selector (dropdown on mobile, sidebar on desktop) ── */
function BranchSelect({sel, onSel, showAll=true, mobile}) {
  if (mobile) return (
    <div style={{marginBottom:12}}>
      <select value={sel} onChange={e=>onSel(e.target.value)}
        style={{width:'100%',background:'#1e2538',border:'1px solid #f59e0b',borderRadius:8,padding:'12px 14px',color:'#f59e0b',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:15,outline:'none'}}>
        {showAll && <option value="ALL">🌐 รวมทุกสาขา</option>}
        {BRANCHES.map(b=><option key={b.id} value={b.id}>{b.id} — {b.short}</option>)}
      </select>
    </div>
  )
  return (
    <div style={{width:165,flexShrink:0}}>
      <div style={{fontSize:10,color:'#6b7280',textTransform:'uppercase',letterSpacing:1,marginBottom:6,fontFamily:'Barlow Condensed'}}>เลือกสาขา</div>
      {showAll && <>
        <button onClick={()=>onSel('ALL')} style={{display:'block',width:'100%',textAlign:'left',padding:'8px 10px',marginBottom:5,borderRadius:6,cursor:'pointer',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,background:sel==='ALL'?'#1e2538':'transparent',border:sel==='ALL'?'1px solid #f59e0b':'1px solid #2d3548',color:sel==='ALL'?'#f59e0b':'#9ca3af'}}>
          🌐 รวมทุกสาขา
        </button>
        <div style={{borderBottom:'1px solid #2d3548',marginBottom:5}}/>
      </>}
      {BRANCHES.map((b,i) => (
        <button key={b.id} onClick={()=>onSel(b.id)} style={{display:'block',width:'100%',textAlign:'left',padding:'7px 10px',marginBottom:3,borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'Barlow',background:sel===b.id?'#1e2538':'transparent',border:sel===b.id?`1px solid ${BCLR[i]}`:'1px solid transparent',color:sel===b.id?BCLR[i]:'#9ca3af',transition:'all .15s'}}>
          <span style={{fontSize:9,marginRight:3,color:BCLR[i]}}>●</span><span style={{fontSize:9,color:'#4b5563',marginRight:3}}>{b.id}</span>{b.short}
        </button>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   TAB DEFINITIONS
════════════════════════════════════════════════════════ */
const TABS = [
  {id:'overview', label:'🏠 ภาพรวม',   mLabel:'🏠', mText:'หน้าหลัก'},
  {id:'mtd',      label:'📊 MTD',        mLabel:'📊', mText:'MTD'},
  {id:'products', label:'🛍 สินค้า',    mLabel:'🛍', mText:'สินค้า'},
  {id:'daily',    label:'📅 รายวัน',    mLabel:'📅', mText:'รายวัน'},
  {id:'monthly',  label:'📈 รายเดือน',  mLabel:'📈', mText:'รายเดือน'},
  {id:'tracker',  label:'🎯 Tracker',    mLabel:'🎯', mText:'Tracker'},
  {id:'asp',      label:'💰 ASP & SPD',  mLabel:'💰', mText:'ASP'},
  {id:'plan',     label:'🤖 AI แผน',     mLabel:'🤖', mText:'AI'},
  {id:'entry',    label:'✏️ กรอกยอด',   mLabel:'✏️', mText:'กรอก'},
  {id:'upload',   label:'📁 Excel',      mLabel:'📁', mText:'Excel'},
  {id:'settings', label:'⚙️ ตั้งค่า',   mLabel:'⚙️', mText:'ตั้งค่า'},
]

/* ════════════════════════════════════════════════════════
   ROOT APP
════════════════════════════════════════════════════════ */
export default function App() {
  const mobile = useIsMobile()
  const [tab, setTab]   = useState('overview')
  const [selBr, setSelBr] = useState('ALL')
  const [ready, setReady] = useState(false)
  const [connErr, setConnErr] = useState(false)

  /* ── App state (synced via Supabase) ── */
  const [de, setDe]         = useState(() => Object.fromEntries(BRANCHES.map(b=>[b.id,{}])))
  const [TARGET, setTARGET] = useState(SEED_T)
  const [HIST, setHIST]     = useState(SEED_H)
  const [cfg, setCfg]       = useState(DEFAULT_CFG)
  const [aiAna, setAiAna]   = useState({})
  const [fcst, setFcst]     = useState({})
  const [upStat, setUpStat] = useState({})
  const [aiLoad, setAiLoad] = useState({})
  const [fcstLoad, setFcstLoad] = useState(false)
  const [histDailySales, setHistDailySales] = useState({})  // { bid: {'YYYY-MM':{day:฿}} }
  const [histTireQ, setHistTireQ] = useState({})            // { bid: { 2024:[12], 2025:[12], 2026:[12] } }
  const [histDailyTire,  setHistDailyTire]  = useState({})  // { bid: {'YYYY-MM':{day:qty}} }

  /* ── Load all data & subscribe to realtime changes ── */
  useEffect(() => {
    let settled = false

    const finish = (isErr = false) => {
      if (settled) return
      settled = true
      if (isErr) setConnErr(true)
      setReady(true)
    }

    ;(async () => {
      try {
        const keys = ['cp_de','cp_tgt','cp_hist','cp_cfg','cp_ai','cp_fcst','cp_up','cp_hdsl','cp_hdtr','cp_tireq']
        const { data: rows, error } = await supabase
          .from('app_data').select('key,value').in('key', keys)

        if (error) throw error

        if (rows) {
          rows.forEach(r => {
            if (r.key==='cp_de')    setDe(r.value)
            if (r.key==='cp_tgt')   setTARGET(r.value)
            if (r.key==='cp_hist')  setHIST(r.value)
            if (r.key==='cp_cfg')   setCfg(r.value)
            if (r.key==='cp_ai')    setAiAna(r.value)
            if (r.key==='cp_fcst')  setFcst(r.value)
            if (r.key==='cp_up')    setUpStat(r.value)
            if (r.key==='cp_hdsl') setHistDailySales(r.value)
            if (r.key==='cp_hdtr') setHistDailyTire(r.value)
            if (r.key==='cp_tireq') setHistTireQ(r.value)
          })
        }
        finish(false)  // ✅ โหลดสำเร็จ ไม่โชว์ banner

      } catch(e) {
        console.error('Supabase error:', e)
        finish(true)   // ❌ error จริง โชว์ banner
      }
    })()

    /* Realtime subscription */
    const ch = DB.listen(payload => {
      const r = payload.new
      if (!r) return
      if (r.key==='cp_de')   setDe(r.value)
      if (r.key==='cp_tgt')  setTARGET(r.value)
      if (r.key==='cp_hist') setHIST(r.value)
      if (r.key==='cp_cfg')  setCfg(r.value)
      if (r.key==='cp_ai')   setAiAna(r.value)
      if (r.key==='cp_fcst') setFcst(r.value)
      if (r.key==='cp_up')   setUpStat(r.value)
      if (r.key==='cp_hdsl') setHistDailySales(r.value)
      if (r.key==='cp_hdtr') setHistDailyTire(r.value)
      if (r.key==='cp_tireq') setHistTireQ(r.value)
    })

    // Timeout 10s — แสดง app แต่ไม่โชว์ banner (ช้าไม่ใช่ error)
    const t = setTimeout(() => finish(false), 10000)
    return () => { clearTimeout(t); supabase.removeChannel(ch) }
  }, [])

  /* ── Write helpers ── */
  const saveDay = useCallback((bid, day, field, val) => {
    setDe(prev => {
      const next = {...prev, [bid]:{...prev[bid], [day]:{...(prev[bid]?.[day]||EMPTY_ROW()), [field]:val}}}
      DB.set('cp_de', next)
      return next
    })
  }, [])

  const delDay = useCallback((bid, day) => {
    setDe(prev => {
      const b = {...prev[bid]}; delete b[day]
      const next = {...prev, [bid]:b}
      DB.set('cp_de', next)
      return next
    })
  }, [])

  const saveCfg = (next) => { setCfg(next); DB.set('cp_cfg', next) }

  /* ── Derived date constants ── */
  const TODAY_D  = cfg.todayDay
  const TOTAL_D  = dIM(cfg.year, cfg.month)
  const DAYS_LEFT = Math.max(1, TOTAL_D - TODAY_D)
  const MTD_R    = TODAY_D / TOTAL_D
  const MONTH_TH = MONTHS_TH[cfg.month-1]
  const DATE_LABEL = `${TODAY_D} ${MONTH_TH} ${cfg.year}`

  /* ── Computed ── */
  const getMTD    = (bid) => sumDays(de, bid)
  const getTS     = (bid) => calcTS(getMTD(bid))
  const getAllMTD  = () => { const agg=Object.fromEntries(FIELDS.map(f=>[f.key,0])); BRANCHES.forEach(b=>{const m=getMTD(b.id);FIELDS.forEach(f=>{agg[f.key]+=m[f.key]})}); return agg }
  const getAllTS   = () => BRANCHES.reduce((s,b)=>s+getTS(b.id),0)
  const getT      = (bid) => {
    const base = bid==='ALL'
      ? Object.values(TARGET).reduce((a,t)=>({sales:a.sales+t.sales,tire:a.tire+t.tire,lube:a.lube+t.lube,battery:a.battery+t.battery,brake:a.brake+t.brake,shock:a.shock+t.shock,mp:a.mp+t.mp,cc:a.cc+t.cc}),{sales:0,tire:0,lube:0,battery:0,brake:0,shock:0,mp:0,cc:0})
      : (TARGET[bid]||SEED_T[bid])
    return {
      ...base,
      tireSalesTgt: base.tire * 3800,            // ยอดขายยาง เป้า = ยาง×3,800฿
      ccFormula: Math.round(base.sales / 5100),  // Job Order เป้า = ยอดขาย÷5,100฿
    }
  }

  const getH26 = (bid) => {
    const base = [...((bid==='ALL'
      ? Array(12).fill(null).map((_,i)=>BRANCHES.reduce((s,b)=>{const v=HIST[b.id]?.[2026]?.[i]; return s+(v!=null?v:0)},0))
      : HIST[bid]?.[2026])||Array(12).fill(null))]
    const mv = bid==='ALL'?getAllTS():getTS(bid)
    if (mv>0) base[cfg.month-1] = Math.round(mv/1000)
    return base
  }
  const getH = (bid) => {
    if (bid==='ALL') {
      const h={}
      ;[2023,2024,2025].forEach(yr=>{h[yr]=Array(12).fill(0).map((_,i)=>BRANCHES.reduce((s,b)=>s+(HIST[b.id]?.[yr]?.[i]||0),0))})
      h[2026]=getH26('ALL'); return h
    }
    return {...(HIST[bid]||{}), 2026:getH26(bid)}
  }

  /* ── AI helpers ── */
  // ── AI helper: เรียกผ่าน /api/claude (Vercel proxy) แทน direct call (CORS blocked)
  const callAI = async (body) => {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return res.json()
  }

  const genPlan = async (bid) => {
    setAiLoad(p=>({...p,[bid]:true}))
    const br = bid==='ALL'?{name:'รวมทุกสาขา'}:BRANCHES.find(x=>x.id===bid)
    const t=getT(bid), m=bid==='ALL'?getAllMTD():getMTD(bid), ts=bid==='ALL'?getAllTS():getTS(bid), h=getH(bid)
    // m.battery, m.brake etc. are cumulative MTD totals from sumDays
    try {
      const d = await callAI({
        model:'claude-sonnet-4-20250514', max_tokens:900,
        messages:[{role:'user', content:
          `คุณเป็นที่ปรึกษาการขาย Cockpit ร้านยางรถยนต์ ตอบเป็นภาษาไทยเท่านั้น ห้ามใช้ภาษาอื่นใด
สาขา: ${br.name} | MTD ${TODAY_D} ${MONTH_TH} ${cfg.year} (${TODAY_D}/${TOTAL_D} วัน = ${(MTD_R*100).toFixed(0)}%)

=== เป้าหมายรายสินค้า vs ยอดจริง ===
ยอดขายรวม: เป้า ${N(Math.round(t.sales*MTD_R))}฿ | จริง ${N(ts)}฿ | ${P(ts,t.sales*MTD_R).toFixed(1)}%
ยาง (เส้น): เป้า ${Math.round(t.tire*MTD_R)} | จริง ${m.tire} | ${P(m.tire,t.tire*MTD_R).toFixed(1)}%
ยอดขายยาง (฿): เป้า ${N(Math.round(t.tireSalesTgt*MTD_R))} | จริง ${N(m.tireSales||0)} | ${P(m.tireSales||0,t.tireSalesTgt*MTD_R).toFixed(1)}%
Battery (ลูก): เป้า ${Math.round(t.battery*MTD_R)} | จริง ${m.battery||0} | ${P(m.battery||0,t.battery*MTD_R).toFixed(1)}%
Brake (ชิ้น): เป้า ${Math.round(t.brake*MTD_R)} | จริง ${m.brake||0} | ${P(m.brake||0,t.brake*MTD_R).toFixed(1)}%
Shock Up (ชิ้น): เป้า ${Math.round(t.shock*MTD_R)} | จริง ${m.shockUp||0} | ${P(m.shockUp||0,t.shock*MTD_R).toFixed(1)}%
MP (ชุด): เป้า ${Math.round(t.mp*MTD_R)} | จริง ${m.mp||0} | ${P(m.mp||0,t.mp*MTD_R).toFixed(1)}%
Lubricant (ลิตร): เป้า ${Math.round(t.lube*MTD_R)} | จริง ${m.lubricant||0} | ${P(m.lubricant||0,t.lube*MTD_R).toFixed(1)}%
Job Order (จำนวนลูกค้า/งาน ไม่ใช่สินค้า): เป้า ${Math.round(t.ccFormula*MTD_R)} ราย | จริง ${m.jobOrder||0} ราย | ${P(m.jobOrder||0,t.ccFormula*MTD_R).toFixed(1)}%

=== ประวัติยอดขายรายเดือน (฿000) ===
2025: ${(h[2025]||[]).join(',')}
2026 YTD: ${(h[2026]||[]).slice(0,cfg.month).join(',')}

วิเคราะห์เป็นภาษาไทยเท่านั้น:
1. หมวดสินค้าที่ขาดเป้าหนักที่สุด (เรียงลำดับจากมากไปน้อย)
2. สินค้าที่ควร push เพิ่มเพื่อชดเชยยอดที่ขาด พร้อมเหตุผล (Job Order = จำนวนลูกค้าเข้าร้าน)
3. แนวทางปฏิบัติที่ทำได้ทันที 3-5 ข้อ (เป็นภาษาไทยเท่านั้น)`
        }]
      })
      const n = {...aiAna, [bid]:d.content[0].text}
      setAiAna(n); DB.set('cp_ai', n)
    } catch(e) { console.error('genPlan error:', e) }
    setAiLoad(p=>({...p,[bid]:false}))
  }

  const genFcst = async () => {
    setFcstLoad(true)
    const s = BRANCHES.map(b=>`${b.short}: PY25=${fM((MAY_SALES[b.id]?.[2025]||0)*MTD_R)} เป้า=${fM(getT(b.id).sales)}`).join('\n')
    try {
      const d = await callAI({
        model:'claude-sonnet-4-20250514', max_tokens:1200,
        messages:[{role:'user', content:
          `คำนวณ Forecast ยอดขายรายวัน (฿) สำหรับวันที่ ${TODAY_D+1}-${TOTAL_D} (${DAYS_LEFT}วัน)
ใช้ข้อมูล: run rate ปัจจุบัน, เป้าหมาย, ปีก่อน (PY25)
ต้องมีความผันผวนตามธรรมชาติ (ไม่ใช่เส้นตรง) สูงต้นสัปดาห์/ปลายเดือน ต่ำกลางสัปดาห์

${s}

ตอบ JSON เท่านั้น (ไม่มี markdown):
{"003":{"dailyForecast":[${DAYS_LEFT} ตัวเลข ฿],"comment":"สรุปสั้น"},"009":{...},...} ครบ 10 สาขา`
        }]
      })
      const p = JSON.parse(d.content[0].text.replace(/```json|```/g,'').trim())
      setFcst(p); DB.set('cp_fcst', p)
    } catch(e) { console.error('genFcst error:', e) }
    setFcstLoad(false)
  }

  const ctx = {selBr,setSelBr,de,saveDay,delDay,getMTD,getTS,getAllMTD,getAllTS,getT,getH,TARGET,HIST,aiAna,aiLoad,genPlan,fcst,fcstLoad,genFcst,upStat,setUpStat,setTARGET,setHIST,cfg,saveCfg,TODAY_D,TOTAL_D,DAYS_LEFT,MTD_R,MONTH_TH,DATE_LABEL,mobile,FIELDS,histDailySales,setHistDailySales,histDailyTire,setHistDailyTire,histTireQ,setHistTireQ}

  /* ── Loading screen ── */
  if (!ready) return (
    <div style={{background:'#0d1117',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:20}}>
      <img src="/icons/apple-touch-icon.png" alt="Cockpit" style={{width:80,height:80,borderRadius:16}}
        onError={e=>{e.target.style.display='none'}}/>
      <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:22,color:'#f59e0b',letterSpacing:3}}>COCKPIT</div>
      <div style={{fontFamily:'Barlow Condensed',fontSize:14,color:'#6b7280'}}>SALES INTELLIGENCE</div>
      <style>{`@keyframes slide{0%{width:0}60%{width:70%}100%{width:100%}}.bar{animation:slide 1.8s ease-in-out infinite}`}</style>
      <div style={{width:180,height:3,background:'#1e2538',borderRadius:2,overflow:'hidden'}}><div className="bar" style={{height:'100%',background:'#f59e0b',borderRadius:2}}/></div>
      <div style={{fontSize:11,color:'#4b5563'}}>กำลังเชื่อมต่อ Supabase...</div>
    </div>
  )

  /* ── Connection error banner (shown inside app) ── */
  const ConnBanner = connErr ? (
    <div style={{background:'#7c2d12',borderBottom:'1px solid #ea580c',padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
      <div style={{fontSize:12,color:'#fed7aa'}}>
        ⚠️ Supabase ออฟไลน์ — ข้อมูลอาจไม่ sync · ไปที่{' '}
        <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
          style={{color:'#fb923c',fontWeight:700}}>supabase.com/dashboard</a>
        {' '}เพื่อ Resume project
      </div>
      <button onClick={()=>window.location.reload()}
        style={{padding:'4px 12px',background:'#ea580c',color:'#fff',border:'none',borderRadius:4,cursor:'pointer',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:12,whiteSpace:'nowrap'}}>
        🔄 ลองใหม่
      </button>
    </div>
  ) : null

  return (
    <div style={{fontFamily:'Barlow,sans-serif',background:'#0d1117',height:'100dvh',height:'100vh',display:'flex',flexDirection:'column',color:'#e5e7eb',overflow:'hidden'}}>

      {/* HEADER — safe area top */}
      <div style={{background:'linear-gradient(90deg,#161b25,#0d1117)',borderBottom:'2px solid #f59e0b',padding:`calc(${mobile?'8px':'10px'} + env(safe-area-inset-top,0px)) ${mobile?'12px':'20px'} ${mobile?'8px':'10px'}`,display:'flex',alignItems:'center',gap:10,flexShrink:0,zIndex:50}}>
        <div style={{width:mobile?30:38,height:mobile?30:38,background:'#f59e0b',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:mobile?16:20,flexShrink:0}}>🏁</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?13:20,letterSpacing:mobile?1:3,color:'#f59e0b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>COCKPIT SALES INTELLIGENCE</div>
          <div style={{fontSize:9,color:'#6b7280'}}>{DATE_LABEL} · เหลือ {DAYS_LEFT} วัน · 10 สาขา</div>
        </div>
        {/* LIVE badge */}
        <div style={{display:'flex',alignItems:'center',gap:5,background:'#0d2a1a',border:'1px solid #22c55e',borderRadius:10,padding:'3px 8px',flexShrink:0}}>
          <div style={{width:6,height:6,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite'}}/>
          <span style={{fontSize:9,color:'#22c55e',fontFamily:'Barlow Condensed',fontWeight:700}}>LIVE</span>
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      </div>

      {/* CONNECTION ERROR BANNER */}
      {ConnBanner}

      {/* DESKTOP NAV */}
      {!mobile && (
        <div style={{display:'flex',background:'#0d1117',borderBottom:'1px solid #1e2538',overflowX:'auto',flexShrink:0}}>
          {TABS.map(t => {
            const isSetting = t.id==='settings'
            const isActive  = tab===t.id
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:'9px 14px',background:isActive?'#1e2538':'transparent',color:isActive?(isSetting?'#a78bfa':'#f59e0b'):(isSetting?'#7c3aed':'#6b7280'),border:'none',borderBottom:isActive?`2px solid ${isSetting?'#a78bfa':'#f59e0b'}`:'2px solid transparent',cursor:'pointer',fontFamily:'Barlow Condensed',fontWeight:600,fontSize:13,whiteSpace:'nowrap'}}>
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      {/* CONTENT — scrollable */}
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:mobile?'10px 10px':'18px 20px',paddingBottom:mobile?`calc(80px + env(safe-area-inset-bottom,0px))`:'18px',maxWidth:1440,margin:'0 auto',width:'100%'}}>
        {tab==='overview' && <Overview ctx={ctx}/>}
        {tab==='mtd'      && <MTDTab ctx={ctx}/>}
        {tab==='products' && <Products ctx={ctx}/>}
        {tab==='daily'    && <Daily ctx={ctx}/>}
        {tab==='monthly'  && <Monthly ctx={ctx}/>}
        {tab==='tracker'  && <Tracker ctx={ctx}/>}
        {tab==='asp'      && <ASP ctx={ctx}/>}
        {tab==='plan'     && <Plan ctx={ctx}/>}
        {tab==='entry'    && <Entry ctx={ctx}/>}
        {tab==='upload'   && <Upload ctx={ctx}/>}
        {tab==='settings' && <Settings ctx={ctx}/>}
      </div>

      {/* MOBILE BOTTOM NAV — safe area bottom */}
      {mobile && (
        <div style={{flexShrink:0,background:'#0d1117',borderTop:'1px solid #2d3548',display:'flex',overflowX:'auto',zIndex:100,paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
          {TABS.map(t => {
            const isA = tab===t.id
            const clr = t.id==='settings'?'#a78bfa':'#f59e0b'
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{flex:'0 0 auto',minWidth:52,padding:'7px 2px 5px',background:isA?'#1a1f2e':'transparent',color:isA?clr:'#4b5563',border:'none',borderTop:isA?`2px solid ${clr}`:'2px solid transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
                <span style={{fontSize:18}}>{t.mLabel}</span>
                <span style={{fontSize:7.5,fontFamily:'Barlow Condensed',fontWeight:600,whiteSpace:'nowrap'}}>{t.mText}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   OVERVIEW TAB
════════════════════════════════════════════════════════ */
function Overview({ctx}) {
  const {getMTD,getTS,TARGET,MTD_R,TODAY_D,MONTH_TH,cfg,mobile,de,HIST} = ctx

  const rows = BRANCHES.map((b,i) => {
    const t=TARGET[b.id]||SEED_T[b.id], m=getMTD(b.id), ts=getTS(b.id)
    const py25Sales = (MAY_SALES[b.id]?.[2025]||0)*MTD_R
    const py24Sales = (MAY_SALES[b.id]?.[2024]||0)*MTD_R
    const py25Tire  = (MAY_TIRE[b.id]?.[2025]||0)*MTD_R
    const py24Tire  = (MAY_TIRE[b.id]?.[2024]||0)*MTD_R
    return {
      ...b, t, m, ts, idx:i,
      tgtSales:t.sales*MTD_R, tgtTire:t.tire*MTD_R,
      py25Sales, py24Sales, py25Tire, py24Tire,
      vsPY25: P(ts,py25Sales), vsPY24: P(ts,py24Sales),
      tirePY25: P(m.tire,py25Tire), tirePY24: P(m.tire,py24Tire),
    }
  })

  const totS     = rows.reduce((s,r)=>s+r.ts,0)
  const totT     = rows.reduce((s,r)=>s+r.tgtSales,0)
  const totTire  = rows.reduce((s,r)=>s+r.m.tire,0)
  const totTireT = rows.reduce((s,r)=>s+r.tgtTire,0)
  const totPY25  = rows.reduce((s,r)=>s+r.py25Sales,0)
  const totPY24  = rows.reduce((s,r)=>s+r.py24Sales,0)
  const totTirePY25 = rows.reduce((s,r)=>s+r.py25Tire,0)
  const totTirePY24 = rows.reduce((s,r)=>s+r.py24Tire,0)

  // Summary KPI cards
  const GrowthBadge = ({pct,label}) => {
    const clr = pct>=110?'#22c55e':pct>=100?'#84cc16':pct>=90?'#f59e0b':'#ef4444'
    return <span style={{fontSize:9,color:clr,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>vs{label} {pct.toFixed(0)}%</span>
  }

  return (
    <div>
      {/* Summary cards row */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
        <div style={{background:'#1e2538',border:'1px solid #2d3548',borderRadius:8,padding:'10px 12px'}}>
          <div style={{fontSize:9,color:'#6b7280',textTransform:'uppercase',letterSpacing:1,fontFamily:'Barlow Condensed'}}>ยอดขายรวม MTD</div>
          <div style={{fontSize:22,fontWeight:700,color:'#f59e0b',fontFamily:"'JetBrains Mono',monospace"}}>{fM(totS)}</div>
          <div style={{fontSize:9,color:'#6b7280'}}>เป้า {fM(Math.round(totT))}</div>
          <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap'}}>
            <GrowthBadge pct={P(totS,totT)} label="เป้า"/>
            <GrowthBadge pct={P(totS,totPY25)} label="PY25"/>
            <GrowthBadge pct={P(totS,totPY24)} label="PY24"/>
          </div>
        </div>
        <div style={{background:'#1e2538',border:'1px solid #2d3548',borderRadius:8,padding:'10px 12px'}}>
          <div style={{fontSize:9,color:'#6b7280',textTransform:'uppercase',letterSpacing:1,fontFamily:'Barlow Condensed'}}>ยางรวม MTD</div>
          <div style={{fontSize:22,fontWeight:700,color:'#3b82f6',fontFamily:"'JetBrains Mono',monospace"}}>{N(totTire)} <span style={{fontSize:13}}>เส้น</span></div>
          <div style={{fontSize:9,color:'#6b7280'}}>เป้า {N(Math.round(totTireT))}</div>
          <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap'}}>
            <GrowthBadge pct={P(totTire,totTireT)} label="เป้า"/>
            <GrowthBadge pct={P(totTire,totTirePY25)} label="PY25"/>
            <GrowthBadge pct={P(totTire,totTirePY24)} label="PY24"/>
          </div>
        </div>
        <div style={{background:'#1e2538',border:'1px solid #2d3548',borderRadius:8,padding:'8px 12px'}}>
          <div style={{fontSize:9,color:'#6b7280',fontFamily:'Barlow Condensed'}}>PY25 MTD รวม</div>
          <div style={{fontSize:16,fontWeight:700,color:'#94a3b8',fontFamily:"'JetBrains Mono',monospace"}}>{fM(Math.round(totPY25))}</div>
          <div style={{fontSize:9,color:'#4b5563'}}>ยาง: {N(Math.round(totTirePY25))} เส้น</div>
        </div>
        <div style={{background:'#1e2538',border:'1px solid #2d3548',borderRadius:8,padding:'8px 12px'}}>
          <div style={{fontSize:9,color:'#6b7280',fontFamily:'Barlow Condensed'}}>PY24 MTD รวม</div>
          <div style={{fontSize:16,fontWeight:700,color:'#475569',fontFamily:"'JetBrains Mono',monospace"}}>{fM(Math.round(totPY24))}</div>
          <div style={{fontSize:9,color:'#4b5563'}}>ยาง: {N(Math.round(totTirePY24))} เส้น</div>
        </div>
      </div>

      {mobile ? (
        /* Mobile: cards per branch */
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {rows.map((r,i) => (
            <div key={r.id} style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:10,padding:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:14,color:BCLR[i]}}>{r.id} {r.short}</div>
                <PBadge value={P(r.ts,r.tgtSales)}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,fontSize:11,marginBottom:6}}>
                <div><div style={{color:'#6b7280',fontSize:8}}>ยอด MTD</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#f59e0b'}}>{fM(r.ts)}</div></div>
                <div><div style={{color:'#6b7280',fontSize:8}}>PY25</div><div style={{fontFamily:"'JetBrains Mono',monospace",color:'#94a3b8'}}>{fM(Math.round(r.py25Sales))}</div></div>
                <div><div style={{color:'#6b7280',fontSize:8}}>PY24</div><div style={{fontFamily:"'JetBrains Mono',monospace",color:'#475569'}}>{fM(Math.round(r.py24Sales))}</div></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,fontSize:11}}>
                <div><div style={{color:'#6b7280',fontSize:8}}>ยาง MTD</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#3b82f6'}}>{r.m.tire} เส้น</div></div>
                <div><div style={{color:'#6b7280',fontSize:8}}>vs PY25</div><div style={{fontFamily:"'JetBrains Mono',monospace",color:r.vsPY25>=100?'#22c55e':r.vsPY25>=90?'#f59e0b':'#ef4444',fontWeight:700}}>{r.vsPY25.toFixed(0)}%</div></div>
                <div><div style={{color:'#6b7280',fontSize:8}}>vs PY24</div><div style={{fontFamily:"'JetBrains Mono',monospace",color:r.vsPY24>=100?'#22c55e':r.vsPY24>=90?'#f59e0b':'#ef4444',fontWeight:700}}>{r.vsPY24.toFixed(0)}%</div></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop: table with PY24+PY25 for both metrics */
        <div style={{background:'#161b25',borderRadius:10,border:'1px solid #2d3548',overflow:'hidden'}}>
          <div style={{padding:'11px 15px',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:15,color:'#f59e0b',borderBottom:'1px solid #2d3548'}}>
            📊 ภาพรวมทุกสาขา — MTD 1-{TODAY_D} {MONTH_TH} {cfg.year}
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:'#0d1117'}}>
                  <th rowSpan={2} style={{padding:'6px 8px',color:'#6b7280',fontFamily:'Barlow Condensed',borderBottom:'1px solid #1e2538',textAlign:'left',verticalAlign:'bottom'}}>สาขา</th>
                  <th colSpan={5} style={{padding:'5px 8px',color:'#f59e0b',fontFamily:'Barlow Condensed',borderBottom:'1px solid #2d3548',borderLeft:'1px solid #2d3548',textAlign:'center',fontSize:10}}>💰 ยอดขายรวม (฿)</th>
                  <th colSpan={4} style={{padding:'5px 8px',color:'#3b82f6',fontFamily:'Barlow Condensed',borderBottom:'1px solid #2d3548',borderLeft:'1px solid #2d3548',textAlign:'center',fontSize:10}}>🏷️ ยาง (เส้น)</th>
                </tr>
                <tr style={{background:'#0d1117'}}>
                  {['2024','2025','2026','% เป้า','% PY25'].map(h=><th key={h} style={{padding:'5px 8px',color:'#6b7280',fontFamily:'Barlow Condensed',fontSize:10,borderBottom:'1px solid #1e2538',textAlign:'right',borderLeft:h==='2024'?'1px solid #2d3548':'none'}}>{h}</th>)}
                  {['2024','2025','2026','% PY25'].map(h=><th key={'t'+h} style={{padding:'5px 8px',color:'#6b7280',fontFamily:'Barlow Condensed',fontSize:10,borderBottom:'1px solid #1e2538',textAlign:'right',borderLeft:h==='2024'?'1px solid #2d3548':'none'}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i) => (
                  <tr key={r.id} style={{borderBottom:'1px solid #1e2538',background:i%2===0?'transparent':'#131820'}}>
                    <td style={{padding:'7px 8px',fontFamily:'Barlow Condensed',fontWeight:700,color:BCLR[i],fontSize:12,whiteSpace:'nowrap'}}>{r.id} {r.short}</td>
                    {/* Sales */}
                    <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#475569',borderLeft:'1px solid #1e2538'}}>{fM(Math.round(r.py24Sales))}</td>
                    <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#94a3b8'}}>{fM(Math.round(r.py25Sales))}</td>
                    <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#f59e0b'}}>{fM(r.ts)}</td>
                    <td style={{padding:'7px 8px',textAlign:'center'}}><PBadge value={P(r.ts,r.tgtSales)}/></td>
                    <td style={{padding:'7px 8px',textAlign:'center'}}><PBadge value={r.vsPY25}/></td>
                    {/* Tire */}
                    <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#475569',borderLeft:'1px solid #1e2538'}}>{Math.round(r.py24Tire)}</td>
                    <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#94a3b8'}}>{Math.round(r.py25Tire)}</td>
                    <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#3b82f6'}}>{r.m.tire}</td>
                    <td style={{padding:'7px 8px',textAlign:'center'}}><PBadge value={r.tirePY25}/></td>
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{background:'#1e2538',borderTop:'2px solid #f59e0b'}}>
                  <td style={{padding:'7px 8px',fontWeight:900,fontFamily:'Barlow Condensed',fontSize:13}}>รวมทุกสาขา</td>
                  <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#475569',borderLeft:'1px solid #2d3548'}}>{fM(Math.round(totPY24))}</td>
                  <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#94a3b8'}}>{fM(Math.round(totPY25))}</td>
                  <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:900,color:'#f59e0b'}}>{fM(totS)}</td>
                  <td style={{padding:'7px 8px',textAlign:'center'}}><PBadge value={P(totS,totT)}/></td>
                  <td style={{padding:'7px 8px',textAlign:'center'}}><PBadge value={P(totS,totPY25)}/></td>
                  <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#475569',borderLeft:'1px solid #2d3548'}}>{Math.round(totTirePY24)}</td>
                  <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#94a3b8'}}>{Math.round(totTirePY25)}</td>
                  <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:900,color:'#3b82f6'}}>{N(totTire)}</td>
                  <td style={{padding:'7px 8px',textAlign:'center'}}><PBadge value={P(totTire,totTirePY25)}/></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ════ MTD ════ */
function MTDTab({ctx}) {
  const {selBr,setSelBr,getMTD,getTS,getAllMTD,getAllTS,getT,getH,de,
         MTD_R,TODAY_D,TOTAL_D,MONTH_TH,cfg,mobile,HIST,FIELDS} = ctx

  // Thai Buddhist year display (e.g. 2024 → "67", 2025 → "68", 2026 → "69")
  const BE2 = yr => String(yr+543).slice(-2)

  // ── All-branches summary data ──────────────────────────────────
  const allRows = BRANCHES.map((b,i) => {
    const t  = getT(b.id)
    const m  = getMTD(b.id)
    const ts = getTS(b.id)
    const tire24 = (MAY_TIRE[b.id]?.[2024]||0)*MTD_R
    const tire25 = (MAY_TIRE[b.id]?.[2025]||0)*MTD_R
    const sale25 = (MAY_SALES[b.id]?.[2025]||0)*MTD_R
    return {
      ...b, i, t, m, ts,
      tire24:Math.round(tire24), tire25:Math.round(tire25), tire26:m.tire,
      tireTgt:Math.round(t.tire*MTD_R), tirePct:P(m.tire,t.tire*MTD_R),
      sale25:Math.round(sale25), sale26:Math.round(ts),
      saleTgt:Math.round(t.sales*MTD_R), salePct:P(ts,t.sales*MTD_R),
    }
  })

  // Chart data per branch (for bar charts)
  const barData = allRows.map(r=>({
    name: r.short,
    'ยาง24':r.tire24, 'ยาง25':r.tire25, 'ยาง26':r.tire26,
    'เป้ายาง':r.tireTgt,
    'ยอด25':Math.round(r.sale25/1000), 'ยอด26':Math.round(r.sale26/1000),
    'เป้าขาย':Math.round(r.saleTgt/1000),
  }))

  const totTire24=allRows.reduce((s,r)=>s+r.tire24,0)
  const totTire25=allRows.reduce((s,r)=>s+r.tire25,0)
  const totTire26=allRows.reduce((s,r)=>s+r.tire26,0)
  const totTireTgt=allRows.reduce((s,r)=>s+r.tireTgt,0)
  const totSale25=allRows.reduce((s,r)=>s+r.sale25,0)
  const totSale26=allRows.reduce((s,r)=>s+r.sale26,0)
  const totSaleTgt=allRows.reduce((s,r)=>s+r.saleTgt,0)

  // ── Single branch data ─────────────────────────────────────────
  const isAll=selBr==='ALL'
  const t=getT(selBr), m=isAll?getAllMTD():getMTD(selBr)
  const ts=isAll?getAllTS():getTS(selBr)
  const h=getH(selBr)
  const pyMTD =(MAY_SALES[selBr]?.[2025]||0)*MTD_R
  const py2MTD=(MAY_SALES[selBr]?.[2024]||0)*MTD_R
  const t25   =(MAY_TIRE[selBr]?.[2025]||0)*MTD_R
  const t24   =(MAY_TIRE[selBr]?.[2024]||0)*MTD_R

  const [showMoYr,setShowMoYr]=useState({2023:false,2024:true,2025:true,2026:true})
  const mData=MONTHS_TH.map((mn,i)=>({month:mn,2023:h[2023]?.[i]??null,2024:h[2024]?.[i]??null,2025:h[2025]?.[i]??null,2026:h[2026]?.[i]??null}))

  const yrBtn=(yr,map)=>({padding:'4px 10px',borderRadius:4,cursor:'pointer',border:`1px solid ${YRCLR[yr]}`,background:map[yr]?YRCLR[yr]+'33':'transparent',color:map[yr]?YRCLR[yr]:'#4b5563',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:11})

  const PctBadge=({v})=>{const c=v>=100?'#22c55e':v>=90?'#f59e0b':v>=80?'#f97316':'#ef4444';const bg=c+'22';return<span style={{background:bg,color:c,borderRadius:4,padding:'1px 7px',fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{v.toFixed(0)}%</span>}

  if (isAll) return (
    /* ══ ALL BRANCHES — Image 3 style ══ */
    <div style={{display:'flex',gap:14,flexDirection:mobile?'column':'row'}}>
      <BranchSelect sel={selBr} onSel={setSelBr} mobile={mobile}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?14:18,color:'#f59e0b',marginBottom:3}}>
          MTD VS เป้า — ทุกสาขา (1–{TODAY_D} {MONTH_TH} {cfg.year})
        </div>
        <div style={{background:'#1a1f2e',border:'1px solid #f59e0b44',borderRadius:6,padding:'6px 12px',marginBottom:10,fontSize:11,color:'#f59e0b'}}>
          ⚡ เป้า MTD = เป้ารายเดือน × ({TODAY_D} ÷ {TOTAL_D}) คำนวณตามวันปฏิบัติการ
        </div>

        {/* ── Summary table ── */}
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:10,overflow:'hidden',marginBottom:12}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:mobile?10:11}}>
              <thead>
                <tr style={{background:'#0d1117'}}>
                  <th rowSpan={2} style={{padding:'7px 10px',textAlign:'left',color:'#6b7280',fontFamily:'Barlow Condensed',verticalAlign:'bottom',borderBottom:'1px solid #1e2538'}}>สาขา</th>
                  <th colSpan={5} style={{padding:'5px 8px',textAlign:'center',color:'#3b82f6',fontFamily:'Barlow Condensed',fontSize:10,borderBottom:'1px solid #2d3548',borderLeft:'1px solid #2d3548'}}>🏷️ ยาง (เส้น)</th>
                  <th colSpan={4} style={{padding:'5px 8px',textAlign:'center',color:'#f59e0b',fontFamily:'Barlow Condensed',fontSize:10,borderBottom:'1px solid #2d3548',borderLeft:'1px solid #2d3548'}}>💰 ยอดขาย (฿)</th>
                </tr>
                <tr style={{background:'#0d1117'}}>
                  {[`ยาง ${BE2(2024)}`,`ยาง ${BE2(2025)}`,`ยาง ${BE2(2026)}`,'เป้า MTD','%',`Sale ${BE2(2025)}`,`Sale ${BE2(2026)}`,'เป้า MTD','%'].map((h,i)=>(
                    <th key={i} style={{padding:'5px 8px',textAlign:'center',color:'#6b7280',fontFamily:'Barlow Condensed',fontSize:10,borderBottom:'1px solid #1e2538',borderLeft:i===0||i===5?'1px solid #2d3548':'none',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allRows.map((r,i)=>(
                  <tr key={r.id} style={{borderBottom:'1px solid #1e2538',background:i%2===0?'transparent':'#131820',cursor:'pointer'}} onClick={()=>setSelBr(r.id)}>
                    <td style={{padding:'7px 10px',fontFamily:'Barlow Condensed',fontWeight:700,color:BCLR[i],fontSize:12,whiteSpace:'nowrap'}}>{r.id} {r.short}</td>
                    <td style={{padding:'6px 8px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",color:'#475569',borderLeft:'1px solid #1e2538'}}>{N(r.tire24)}</td>
                    <td style={{padding:'6px 8px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",color:'#94a3b8'}}>{N(r.tire25)}</td>
                    <td style={{padding:'6px 8px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#3b82f6'}}>{N(r.tire26)}</td>
                    <td style={{padding:'6px 8px',textAlign:'center',color:'#6b7280'}}>{N(r.tireTgt)}</td>
                    <td style={{padding:'6px 8px',textAlign:'center'}}><PctBadge v={r.tirePct}/></td>
                    <td style={{padding:'6px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#94a3b8',borderLeft:'1px solid #1e2538'}}>{fM(r.sale25)}</td>
                    <td style={{padding:'6px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#f59e0b'}}>{fM(r.sale26)}</td>
                    <td style={{padding:'6px 8px',textAlign:'right',color:'#6b7280'}}>{fM(r.saleTgt)}</td>
                    <td style={{padding:'6px 8px',textAlign:'center'}}><PctBadge v={r.salePct}/></td>
                  </tr>
                ))}
                <tr style={{background:'#1e2538',borderTop:'2px solid #f59e0b'}}>
                  <td style={{padding:'7px 10px',fontWeight:900,fontFamily:'Barlow Condensed',fontSize:12}}>รวมทุกสาขา</td>
                  <td style={{padding:'6px 8px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",color:'#475569',borderLeft:'1px solid #2d3548'}}>{N(totTire24)}</td>
                  <td style={{padding:'6px 8px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",color:'#94a3b8'}}>{N(totTire25)}</td>
                  <td style={{padding:'6px 8px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#3b82f6'}}>{N(totTire26)}</td>
                  <td style={{padding:'6px 8px',textAlign:'center',color:'#6b7280'}}>{N(totTireTgt)}</td>
                  <td style={{padding:'6px 8px',textAlign:'center'}}><PctBadge v={P(totTire26,totTireTgt)}/></td>
                  <td style={{padding:'6px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#94a3b8',borderLeft:'1px solid #2d3548'}}>{fM(totSale25)}</td>
                  <td style={{padding:'6px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:900,color:'#f59e0b'}}>{fM(totSale26)}</td>
                  <td style={{padding:'6px 8px',textAlign:'right',color:'#6b7280'}}>{fM(totSaleTgt)}</td>
                  <td style={{padding:'6px 8px',textAlign:'center'}}><PctBadge v={P(totSale26,totSaleTgt)}/></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bar charts ── */}
        <div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'1fr 1fr',gap:12}}>
          {/* Tire by branch */}
          <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,padding:12}}>
            <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#3b82f6',marginBottom:8}}>🏷️ ยาง MTD ปี {BE2(2024)}/{BE2(2025)}/{BE2(2026)}</div>
            <ResponsiveContainer width="100%" height={mobile?180:220}>
              <BarChart data={barData} margin={{top:4,right:4,left:0,bottom:30}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/>
                <XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:8}} angle={-35} textAnchor="end" interval={0}/>
                <YAxis tick={{fill:'#6b7280',fontSize:8}}/>
                <Tooltip contentStyle={{background:'#1e2538',border:'1px solid #2d3548',fontSize:11}} formatter={v=>[N(v)+' เส้น','']}/>
                <Legend wrapperStyle={{fontSize:9}}/>
                <Bar dataKey="ยาง24" fill="#475569" radius={[2,2,0,0]}/>
                <Bar dataKey="ยาง25" fill="#f59e0b" radius={[2,2,0,0]}/>
                <Bar dataKey="ยาง26" fill="#3b82f6" radius={[2,2,0,0]}/>
                <Line type="monotone" dataKey="เป้ายาง" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 2" dot={{r:3}}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Sale by branch */}
          <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,padding:12}}>
            <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#f59e0b',marginBottom:8}}>💰 ยอดขาย MTD ปี {BE2(2025)}/{BE2(2026)} (฿000)</div>
            <ResponsiveContainer width="100%" height={mobile?180:220}>
              <BarChart data={barData} margin={{top:4,right:4,left:0,bottom:30}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/>
                <XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:8}} angle={-35} textAnchor="end" interval={0}/>
                <YAxis tick={{fill:'#6b7280',fontSize:8}}/>
                <Tooltip contentStyle={{background:'#1e2538',border:'1px solid #2d3548',fontSize:11}} formatter={v=>[fM(v*1000),'']}/>
                <Legend wrapperStyle={{fontSize:9}}/>
                <Bar dataKey="ยอด25" fill="#f59e0b" radius={[2,2,0,0]}/>
                <Bar dataKey="ยอด26" fill="#22c55e" radius={[2,2,0,0]}/>
                <Line type="monotone" dataKey="เป้าขาย" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 2" dot={{r:3}}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )

  /* ══ SINGLE BRANCH — daily + monthly trend ══ */
  return (
    <div style={{display:'flex',gap:16,flexDirection:mobile?'column':'row'}}>
      <BranchSelect sel={selBr} onSel={setSelBr} mobile={mobile}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:20,color:'#f59e0b',letterSpacing:2,marginBottom:10}}>
          {selBr} — {BRANCHES.find(x=>x.id===selBr)?.name}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
          <Card label="ยอดขาย MTD" value={fM(ts)} sub={`เป้า ${fM(Math.round(t.sales*MTD_R))}`}/>
          <Card label="% เทียบเป้า" value={P(ts,t.sales*MTD_R).toFixed(1)+'%'} color={P(ts,t.sales*MTD_R)>=100?'#22c55e':P(ts,t.sales*MTD_R)>=90?'#f59e0b':'#ef4444'}/>
          <Card label="ยาง MTD" value={N(m.tire)+' เส้น'} sub={`เป้า ${N(Math.round(t.tire*MTD_R))}`} color="#3b82f6"/>
          <Card label="vs PY25" value={P(ts,pyMTD).toFixed(1)+'%'} color="#94a3b8"/>
        </div>
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,padding:12,marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,flexWrap:'wrap',gap:6}}>
            <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#94a3b8'}}>📈 ยอดขายรายเดือน (฿000) 2023–2026</div>
            <div style={{display:'flex',gap:5}}>
              {[2023,2024,2025,2026].map(yr=>(<button key={yr} onClick={()=>setShowMoYr(p=>({...p,[yr]:!p[yr]}))} style={yrBtn(yr,showMoYr)}>{yr}</button>))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={mobile?150:200}>
            <LineChart data={mData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/>
              <XAxis dataKey="month" tick={{fill:'#6b7280',fontSize:8}}/>
              <YAxis tick={{fill:'#6b7280',fontSize:8}}/>
              <Tooltip contentStyle={{background:'#1e2538',border:'1px solid #2d3548',fontSize:11}} formatter={v=>[v!=null?N(v*1000)+'฿':'—','']}/>
              {[2023,2024,2025,2026].filter(yr=>showMoYr[yr]).map(yr=>(
                <Line key={yr} type="monotone" dataKey={yr} stroke={YRCLR[yr]} strokeWidth={yr===2026?3:1.5} dot={yr===2026?{r:3}:false} strokeDasharray={yr===2026?'6 3':'none'} connectNulls={false}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#0d1117'}}>
              {['ปี',`ยาง ${BE2(2024)}`,`ยาง ${BE2(2025)}`,`ยาง ${BE2(2026)}`,'เป้า %',`ยอด ${BE2(2025)}`,`ยอด ${BE2(2026)}`,'เป้าเดือน'].map(h=><th key={h} style={{padding:'7px 8px',textAlign:'right',color:'#6b7280',fontSize:10,fontFamily:'Barlow Condensed'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              <tr style={{borderBottom:'1px solid #1e2538'}}>
                <td style={{padding:'8px 8px',color:'#9ca3af',fontSize:11}}>ข้อมูล</td>
                <td style={{padding:'8px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#475569'}}>{Math.round(t24)}</td>
                <td style={{padding:'8px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#94a3b8'}}>{Math.round(t25)}</td>
                <td style={{padding:'8px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#3b82f6'}}>{m.tire}</td>
                <td style={{padding:'8px 8px',textAlign:'right'}}><PctBadge v={P(m.tire,t.tire*MTD_R)}/></td>
                <td style={{padding:'8px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#94a3b8'}}>{fM(Math.round(pyMTD))}</td>
                <td style={{padding:'8px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#f59e0b'}}>{fM(ts)}</td>
                <td style={{padding:'8px 8px',textAlign:'right',color:'#6b7280'}}>{fM(t.sales)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ════ PRODUCTS ════ */
function Products({ctx}) {
  const {selBr,setSelBr,getMTD,getAllMTD,getT,MTD_R,TODAY_D,TOTAL_D,MONTH_TH,cfg,mobile,FIELDS} = ctx
  const isAll=selBr==='ALL', m=isAll?getAllMTD():getMTD(selBr), t=getT(selBr)

  const PCARDS = [
    {key:'tire',       label:'ยาง',         icon:'🏷️', unit:'เส้น', color:'#f59e0b', tgt:()=>Math.round(t.tire*MTD_R)},
    {key:'bsTire',     label:'Bridgestone',  icon:'🔵', unit:'เส้น', color:'#3b82f6', tgt:()=>Math.round(t.tire*0.35*MTD_R)},
    {key:'alloyWheel', label:'Alloy Wheel',  icon:'✨', unit:'วง',  color:'#94a3b8', tgt:()=>0},
    {key:'battery',    label:'Battery',      icon:'🔋', unit:'ลูก', color:'#22c55e', tgt:()=>Math.round(t.battery*MTD_R)},
    {key:'brake',      label:'Brake',        icon:'🔴', unit:'ชิ้น',color:'#f97316', tgt:()=>Math.round(t.brake*MTD_R)},
    {key:'shockUp',    label:'Shock UP',     icon:'⚡', unit:'ชิ้น',color:'#eab308', tgt:()=>Math.round(t.shock*MTD_R)},
    {key:'mp',         label:'MP',           icon:'🔧', unit:'ชุด', color:'#8b5cf6', tgt:()=>Math.round(t.mp*MTD_R)},
    {key:'lubricant',  label:'Lubricant',    icon:'🛢️', unit:'ลิตร',color:'#06b6d4', tgt:()=>Math.round(t.lube*MTD_R)},
    {key:'filter',     label:'Filter',       icon:'🔍', unit:'ชิ้น',color:'#64748b', tgt:()=>0},
    {key:'airFilter',  label:'Air Filter',   icon:'❄️', unit:'ชิ้น',color:'#67e8f9', tgt:()=>0},
    {key:'service',    label:'Service',      icon:'🔨', unit:'฿',   color:'#a78bfa', tgt:()=>0, money:true},
    {key:'jobOrder',   label:'Job Order (ลูกค้า)', icon:'📋', unit:'ราย', color:'#84cc16', tgt:()=>Math.round(t.ccFormula*MTD_R)},
    {key:'tireSales',  label:'ยอดขายยาง',   icon:'💰', unit:'฿',   color:'#f59e0b', tgt:()=>Math.round(t.tireSalesTgt*MTD_R), money:true},
  ]

  return (
    <div style={{display:'flex',gap:16,flexDirection:mobile?'column':'row'}}>
      <BranchSelect sel={selBr} onSel={setSelBr} mobile={mobile}/>
      <div style={{flex:1}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?13:16,color:'#f59e0b',marginBottom:10,letterSpacing:1}}>
          สินค้า MTD — {isAll?'ทุกสาขา':BRANCHES.find(x=>x.id===selBr)?.name}
          {' '}({TODAY_D}–{TODAY_D} {MONTH_TH} {cfg.year})
          <span style={{color:'#6b7280',fontSize:10,fontWeight:400,marginLeft:8}}>เป้า = รายเดือน×{TODAY_D}/{TOTAL_D}</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:mobile?'1fr 1fr':'repeat(4,1fr)',gap:8}}>
          {PCARDS.map(p => {
            const actual = m[p.key]||0
            const tgt = p.tgt()
            const pct = tgt>0?(actual/tgt)*100:0
            const barClr = pct>=100?'#22c55e':pct>=70?'#f59e0b':'#ef4444'
            return (
              <div key={p.key} style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:10,padding:mobile?10:12,display:'flex',flexDirection:'column',gap:3}}>
                <div style={{fontSize:mobile?11:12,color:'#9ca3af',fontFamily:'Barlow Condensed',fontWeight:600}}>
                  {p.icon} {p.label}
                </div>
                <div style={{fontSize:mobile?20:26,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:actual>0?p.color:'#374151',lineHeight:1,marginTop:2}}>
                  {p.money&&actual>0?fM(actual):N(actual)}
                </div>
                <div style={{fontSize:9,color:'#6b7280'}}>
                  เป้า: {tgt>0?(p.money?fM(tgt):N(tgt)):'—'}{tgt>0?' '+p.unit:''}
                </div>
                {tgt>0 && <>
                  <div style={{background:'#0d1117',borderRadius:3,height:3,overflow:'hidden',marginTop:2}}>
                    <div style={{width:Math.min(pct,100)+'%',height:'100%',background:barClr,borderRadius:3,transition:'width .5s'}}/>
                  </div>
                  <div style={{marginTop:2}}><PBadge value={pct}/></div>
                </>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ════ DAILY ════ */
function Daily({ctx}) {
  const {selBr,setSelBr,de,getTS,getAllTS,getT,HIST,FIELDS,histDailySales,histDailyTire,fcst,fcstLoad,genFcst,
         TODAY_D,TOTAL_D,DAYS_LEFT,MTD_R,cfg,MONTH_TH,mobile} = ctx
  const isAll=selBr==='ALL', t=getT(selBr), ts=isAll?getAllTS():getTS(selBr)

  // ── PY monthly totals for same month ──────────────────────────
  const histSales = (yr) => isAll
    ? BRANCHES.reduce((s,b)=>s+((HIST[b.id]?.[yr]?.[cfg.month-1]||0)*1000),0)
    : (HIST[selBr]?.[yr]?.[cfg.month-1]||0)*1000

  const histTire = (yr) => isAll
    ? BRANCHES.reduce((s,b)=>s+(SEED_TIREQ[b.id]?.[yr]?.[cfg.month-1]||0),0)
    : (SEED_TIREQ[selBr]?.[yr]?.[cfg.month-1]||0)

  const py25SalesMo=histSales(2025), py24SalesMo=histSales(2024)
  const py25TireMo =histTire(2025),  py24TireMo =histTire(2024)

  const avgSales = TODAY_D>0?ts/TODAY_D:0
  const avg25S   = TOTAL_D>0?py25SalesMo/TOTAL_D:0
  const avg24S   = TOTAL_D>0?py24SalesMo/TOTAL_D:0
  const tgtSalesD= t.sales/TOTAL_D

  // current MTD tire
  const getMTDTire = () => isAll
    ? BRANCHES.reduce((s,b)=>{const m=Object.values(de[b.id]||{}).reduce((a,r)=>a+(Number(r.tire)||0),0);return s+m},0)
    : Object.values(de[selBr]||{}).reduce((a,r)=>a+(Number(r.tire)||0),0)
  const mtdTire = getMTDTire()
  const avgTire = TODAY_D>0?mtdTire/TODAY_D:0
  const avg25T  = TOTAL_D>0?py25TireMo/TOTAL_D:0
  const avg24T  = TOTAL_D>0?py24TireMo/TOTAL_D:0
  const tgtTireD= t.tire/TOTAL_D

  // natural variation: realistic day-of-month pattern
  const wave=(d,phi)=>0.82+Math.sin(d*0.44+phi)*0.2+Math.cos(d*0.9+phi*1.5)*0.09

  // forecast: use weighted run-rate + trend vs target
  const fArr = (!isAll&&fcst[selBr]?.dailyForecast)||[]
  // Better forecast: use PY25 ratio of remaining days to actual if available
  const py25RemainingAvg = (() => {
    let sum=0, cnt=0
    for(let d=TODAY_D+1; d<=TOTAL_D; d++){
      const v=getRealSales(selBr,2025,cfg.month,d)
      if(v>0){sum+=v;cnt++}
    }
    return cnt>0?sum/cnt:0
  })()
  const py25RatioToTgt = avg25S>0 ? avgSales/avg25S : 1
  const runRateAdj = py25RemainingAvg>0
    ? Math.round(py25RemainingAvg * Math.min(py25RatioToTgt,1.5))
    : avgSales>0 ? Math.min(avgSales/tgtSalesD,1.5)*tgtSalesD : tgtSalesD

  // ── Build day-by-day data ──────────────────────────────────────
  // Helper: get real historical daily value or fall back to estimated
  const getRealSales=(bid,yr,mo,day)=>{
    const key=`${yr}-${String(mo).padStart(2,'0')}`
    if(bid==='ALL') return BRANCHES.reduce((s,b)=>{const v=histDailySales[b.id]?.[key]?.[day];return s+(v||0)},0)||null
    return histDailySales[bid]?.[key]?.[day]||null
  }
  const getRealTire=(bid,yr,mo,day)=>{
    const key=`${yr}-${String(mo).padStart(2,'0')}`
    if(bid==='ALL') return BRANCHES.reduce((s,b)=>{const v=histDailyTire[b.id]?.[key]?.[day];return s+(v||0)},0)||null
    return histDailyTire[bid]?.[key]?.[day]||null
  }

  const salesData = Array.from({length:TOTAL_D},(_,i)=>{
    const d=i+1, row={day:String(d)}
    // Use real historical data if available, else estimate from monthly total
    const real24S=getRealSales(selBr,2024,cfg.month,d)
    const real25S=getRealSales(selBr,2025,cfg.month,d)
    if(real24S!=null && real24S>0) row[2024]=real24S
    else if(avg24S>0) row[2024]=Math.round(avg24S*wave(d,2.5))
    if(real25S!=null && real25S>0) row[2025]=real25S
    else if(avg25S>0) row[2025]=Math.round(avg25S*wave(d,1.1))
    // 2026 actual
    if(!isAll && d<=TODAY_D){
      const dr=de[selBr]?.[d]
      if(dr){const agg=Object.fromEntries(FIELDS.map(f=>[f.key,Number(dr[f.key])||0]));const v=calcTS(agg);if(v>0)row[2026]=v}
    } else if(isAll && d<=TODAY_D) {
      const tot=BRANCHES.reduce((s,b)=>{const dr=de[b.id]?.[d];if(!dr)return s;const agg=Object.fromEntries(FIELDS.map(f=>[f.key,Number(dr[f.key])||0]));return s+calcTS(agg)},0)
      if(tot>0)row[2026]=tot
    }
    // forecast
    if(d>TODAY_D) row.forecast=fArr[i-TODAY_D]||Math.round(runRateAdj*wave(d,0.8))
    return row
  })

  const tireData = Array.from({length:TOTAL_D},(_,i)=>{
    const d=i+1, row={day:String(d)}
    const real24T=getRealTire(selBr,2024,cfg.month,d)
    const real25T=getRealTire(selBr,2025,cfg.month,d)
    if(real24T!=null && real24T>0) row[2024]=real24T
    else if(avg24T>0) row[2024]=Math.round(avg24T*wave(d,2.9))
    if(real25T!=null && real25T>0) row[2025]=real25T
    else if(avg25T>0) row[2025]=Math.round(avg25T*wave(d,1.4))
    if(!isAll && d<=TODAY_D){
      const dr=de[selBr]?.[d]
      const v=Number(dr?.tire)||0; if(v>0)row[2026]=v
    } else if(isAll && d<=TODAY_D){
      const tot=BRANCHES.reduce((s,b)=>s+(Number(de[b.id]?.[d]?.tire)||0),0)
      if(tot>0)row[2026]=tot
    }
    if(d>TODAY_D){
      const fr=fArr[i-TODAY_D]
      row.forecast=fr?Math.round(fr/Math.max(tgtSalesD,1)*tgtTireD):Math.round(avgTire*wave(d,1.2))
    }
    return row
  })

  const CHART_H = mobile?180:240
  const ttip = {contentStyle:{background:'#1e2538',border:'1px solid #2d3548',fontSize:11}}
  const yrBtnSt=(yr,active)=>({padding:'3px 9px',borderRadius:4,cursor:'pointer',border:`1px solid ${YRCLR[yr]||'#22c55e'}`,background:active?(YRCLR[yr]||'#22c55e')+'33':'transparent',color:active?(YRCLR[yr]||'#22c55e'):'#4b5563',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:10})
  const [showYrS,setShowYrS]=useState({2024:true,2025:true,2026:true})
  const [showYrT,setShowYrT]=useState({2024:true,2025:true,2026:true})

  return (
    <div style={{display:'flex',gap:16,flexDirection:mobile?'column':'row'}}>
      <BranchSelect sel={selBr} onSel={setSelBr} mobile={mobile}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:20,color:'#f59e0b'}}>รายวัน — {isAll?'รวม':BRANCHES.find(x=>x.id===selBr)?.short} ({MONTH_TH} {cfg.year})</div>
          <button onClick={genFcst} disabled={fcstLoad} style={{padding:'8px 16px',background:fcstLoad?'#1e2538':'#7c3aed',color:'#fff',border:'none',borderRadius:6,cursor:fcstLoad?'wait':'pointer',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:12}}>{fcstLoad?'⏳':'🤖 AI Forecast'}</button>
        </div>

        {/* KPI */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          <Card label="เฉลี่ย/วัน (ยอดขาย)" value={fM(Math.round(avgSales))} color="#f59e0b" small/>
          <Card label="เป้า/วัน (ยอดขาย)"   value={fM(Math.round(tgtSalesD))} color="#a78bfa" small/>
          <Card label="เฉลี่ย/วัน (ยาง)"     value={N(Math.round(avgTire))+' เส้น'} color="#3b82f6" small/>
          <Card label="ต้องทำ/วัน (ยอดเหลือ)" value={fM(Math.round(Math.max(0,t.sales-ts)/DAYS_LEFT))} color="#ef4444" small/>
        </div>

        {/* ══ CHART 1: Total Sales (฿) ══ */}
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,padding:12,marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6,flexWrap:'wrap',gap:4}}>
            <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#f59e0b'}}>💰 ยอดขายรายวัน (฿) — วันที่ 1–{TODAY_D}</div>
            <div style={{display:'flex',gap:4}}>
              {[2024,2025,2026].map(yr=><button key={yr} onClick={()=>setShowYrS(p=>({...p,[yr]:!p[yr]}))} style={yrBtnSt(yr,showYrS[yr])}>{yr}</button>)}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={CHART_H}>
            <LineChart data={salesData} margin={{top:4,right:4,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/>
              <XAxis dataKey="day" tick={{fill:'#6b7280',fontSize:7}}/>
              <YAxis tick={{fill:'#6b7280',fontSize:8}} tickFormatter={v=>v?(v/1000).toFixed(0)+'k':''}/>
              <Tooltip {...ttip} formatter={(v,n)=>[v!=null?N(Math.round(v))+'฿':'—',n==='forecast'?'Forecast':n==='2026'?`${cfg.year} จริง`:`PY${String(n).slice(-2)} ประมาณ`]} labelFormatter={l=>`วันที่ ${l}`}/>
              <ReferenceLine y={tgtSalesD} stroke="#a78bfa" strokeDasharray="4 2" strokeWidth={1.5}/>
              {showYrS[2024]&&<Line type="monotone" dataKey={2024} stroke={YRCLR[2024]} strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls={false}/>}
              {showYrS[2025]&&<Line type="monotone" dataKey={2025} stroke={YRCLR[2025]} strokeWidth={2} dot={false} strokeDasharray="5 2" connectNulls={false}/>}
              {showYrS[2026]&&<Line type="monotone" dataKey={2026} stroke="#22c55e" strokeWidth={2.5} dot={{r:3,fill:'#22c55e'}} connectNulls={false}/>}
              <Line type="monotone" dataKey="forecast" stroke="#ef4444" strokeWidth={2} dot={{r:2,fill:'#ef4444'}} strokeDasharray="5 3" connectNulls={false}/>
            </LineChart>
          </ResponsiveContainer>
          <div style={{display:'flex',gap:12,fontSize:9,color:'#6b7280',marginTop:4,flexWrap:'wrap'}}>
            <span style={{color:'#22c55e'}}>● {cfg.year} จริง</span>
            <span style={{color:YRCLR[2025]}}>⟶ PY25 {Object.keys(histDailySales).length>0?'จริง':'ประมาณ'}</span>
            <span style={{color:YRCLR[2024]}}>⟶ PY24 {Object.keys(histDailySales).length>0?'จริง':'ประมาณ'}</span>
            <span style={{color:'#ef4444'}}>⟶ Forecast</span>
            <span style={{color:'#a78bfa'}}>-- เป้า/วัน</span>
          </div>
        </div>

        {/* ══ CHART 2: Tire Qty ══ */}
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,padding:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6,flexWrap:'wrap',gap:4}}>
            <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#3b82f6'}}>🏷️ ยางรายวัน (เส้น) — วันที่ 1–{TODAY_D}</div>
            <div style={{display:'flex',gap:4}}>
              {[2024,2025,2026].map(yr=><button key={yr} onClick={()=>setShowYrT(p=>({...p,[yr]:!p[yr]}))} style={yrBtnSt(yr,showYrT[yr])}>{yr}</button>)}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={mobile?150:200}>
            <LineChart data={tireData} margin={{top:4,right:4,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/>
              <XAxis dataKey="day" tick={{fill:'#6b7280',fontSize:7}}/>
              <YAxis tick={{fill:'#6b7280',fontSize:8}}/>
              <Tooltip {...ttip} formatter={(v,n)=>[v!=null?N(Math.round(v))+' เส้น':'—',n==='forecast'?'Forecast':n==='2026'?`${cfg.year} จริง`:`PY${String(n).slice(-2)} ประมาณ`]} labelFormatter={l=>`วันที่ ${l}`}/>
              <ReferenceLine y={tgtTireD} stroke="#a78bfa" strokeDasharray="4 2" strokeWidth={1.5}/>
              {showYrT[2024]&&<Line type="monotone" dataKey={2024} stroke={YRCLR[2024]} strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls={false}/>}
              {showYrT[2025]&&<Line type="monotone" dataKey={2025} stroke={YRCLR[2025]} strokeWidth={2} dot={false} strokeDasharray="5 2" connectNulls={false}/>}
              {showYrT[2026]&&<Line type="monotone" dataKey={2026} stroke="#22c55e" strokeWidth={2.5} dot={{r:3,fill:'#22c55e'}} connectNulls={false}/>}
              <Line type="monotone" dataKey="forecast" stroke="#ef4444" strokeWidth={2} dot={{r:2}} strokeDasharray="5 3" connectNulls={false}/>
            </LineChart>
          </ResponsiveContainer>
          <div style={{display:'flex',gap:12,fontSize:9,color:'#6b7280',marginTop:4,flexWrap:'wrap'}}>
            <span style={{color:'#22c55e'}}>● {cfg.year} จริง</span>
            <span style={{color:YRCLR[2025]}}>⟶ PY25</span>
            <span style={{color:YRCLR[2024]}}>⟶ PY24</span>
            <span style={{color:'#ef4444'}}>⟶ Forecast</span>
            <span style={{color:'#a78bfa'}}>-- เป้า/วัน</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════ MONTHLY ════ */
function Monthly({ctx}) {
  const {selBr,setSelBr,getH,getMTD,getAllMTD,mobile,cfg,HIST,FIELDS,histTireQ} = ctx
  const isAll=selBr==='ALL', h=getH(selBr)
  const [showSales, setShowSales] = useState({2023:false,2024:true,2025:true,2026:true})
  const [showTire,  setShowTire]  = useState({2024:true,2025:true,2026:true})
  const toggleS = yr => setShowSales(p=>({...p,[yr]:!p[yr]}))
  const toggleT = yr => setShowTire(p=>({...p,[yr]:!p[yr]}))
  const yrBtn = (yr,map,clr) => ({
    padding:'4px 10px',borderRadius:4,cursor:'pointer',
    border:`1px solid ${clr||YRCLR[yr]}`,
    background:map[yr]?(clr||YRCLR[yr])+'33':'transparent',
    color:map[yr]?(clr||YRCLR[yr]):'#4b5563',
    fontFamily:'Barlow Condensed',fontWeight:700,fontSize:11
  })

  // Sales chart data — all 4 years
  const salesData = MONTHS_TH.map((mn,i) => ({
    month: mn,
    2023: h[2023]?.[i] ?? null,
    2024: h[2024]?.[i] ?? null,
    2025: h[2025]?.[i] ?? null,
    2026: h[2026]?.[i] ?? null,
  }))

  // Tire chart data — 2024, 2025, 2026
  // 2024/2025: from SEED_TIREQ
  // 2026: current month from de MTD, rest null
  const mtd2026 = isAll ? getAllMTD() : getMTD(selBr)
  const tire2026 = Array(12).fill(null)
  if (mtd2026.tire > 0) tire2026[cfg.month-1] = mtd2026.tire

  // Use histTireQ from uploaded Data_sale_by_Store if available, else SEED_TIREQ
  const getTireQByMonth = (bid, yr, monthIdx) => {
    // histTireQ has 0-indexed months matching SEED_TIREQ
    const fromUpload = histTireQ[bid]?.[yr]?.[monthIdx]
    if (fromUpload != null && fromUpload > 0) return fromUpload
    return SEED_TIREQ[bid]?.[yr]?.[monthIdx] ?? null
  }

  const tireData = MONTHS_TH.map((mn,i) => {
    const row = {month: mn}
    row[2024] = isAll
      ? BRANCHES.reduce((s,b)=>s+(getTireQByMonth(b.id,2024,i)||0),0) || null
      : getTireQByMonth(selBr,2024,i)
    row[2025] = isAll
      ? BRANCHES.reduce((s,b)=>s+(getTireQByMonth(b.id,2025,i)||0),0) || null
      : getTireQByMonth(selBr,2025,i)
    // 2026: from upload if available, else current month MTD
    if (isAll) {
      const fromUpload = BRANCHES.reduce((s,b)=>s+(histTireQ[b.id]?.[2026]?.[i]||0),0)
      row[2026] = fromUpload > 0 ? fromUpload : tire2026[i]
    } else {
      const fromUpload = histTireQ[selBr]?.[2026]?.[i]
      row[2026] = fromUpload > 0 ? fromUpload : tire2026[i]
    }
    return row
  })

  return (
    <div style={{display:'flex',gap:16,flexDirection:mobile?'column':'row'}}>
      <BranchSelect sel={selBr} onSel={setSelBr} mobile={mobile}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:20,color:'#f59e0b',letterSpacing:2,marginBottom:12}}>
          รายเดือน — {isAll?'รวมทุกสาขา':BRANCHES.find(x=>x.id===selBr)?.name}
        </div>

        {/* ══ SALES CHART ══ */}
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,padding:12,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,flexWrap:'wrap',gap:6}}>
            <div>
              <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:14,color:'#f59e0b'}}>💰 ยอดขายรายเดือน (฿000)</div>
              <div style={{fontSize:9,color:'#6b7280'}}>เส้นประ 2026 = ม.ค.–{cfg.month<=12?'ปัจจุบัน':''} รวม MTD</div>
            </div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {[2023,2024,2025,2026].map(yr=>(
                <button key={yr} onClick={()=>toggleS(yr)} style={yrBtn(yr,showSales)}>{yr}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={mobile?170:240}>
            <LineChart data={salesData} margin={{top:4,right:4,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/>
              <XAxis dataKey="month" tick={{fill:'#6b7280',fontSize:8}}/>
              <YAxis tick={{fill:'#6b7280',fontSize:8}} tickFormatter={v=>v?(v/1000).toFixed(1)+'M':''}/>
              <Tooltip contentStyle={{background:'#1e2538',border:'1px solid #2d3548',fontSize:11}}
                formatter={v=>[v!=null?N(v*1000)+'฿':'—','']}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              {showSales[2023]&&<Line type="monotone" dataKey={2023} stroke={YRCLR[2023]} strokeWidth={1.5} dot={false} connectNulls={false}/>}
              {showSales[2024]&&<Line type="monotone" dataKey={2024} stroke={YRCLR[2024]} strokeWidth={1.5} dot={false} connectNulls={false}/>}
              {showSales[2025]&&<Line type="monotone" dataKey={2025} stroke={YRCLR[2025]} strokeWidth={2} dot={{r:2}} connectNulls={false}/>}
              {showSales[2026]&&<Line type="monotone" dataKey={2026} stroke={YRCLR[2026]} strokeWidth={3} dot={{r:4,fill:YRCLR[2026]}} strokeDasharray="6 3" connectNulls={false}/>}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ══ TIRE CHART ══ */}
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,padding:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,flexWrap:'wrap',gap:6}}>
            <div>
              <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:14,color:'#3b82f6'}}>🏷️ ยางรายเดือน (เส้น)</div>
              <div style={{fontSize:9,color:'#6b7280'}}>2026 = เฉพาะเดือนที่กรอกข้อมูลแล้ว</div>
            </div>
            <div style={{display:'flex',gap:5}}>
              {[2024,2025,2026].map(yr=>(
                <button key={yr} onClick={()=>toggleT(yr)} style={yrBtn(yr,showTire,yr===2026?'#22c55e':yr===2025?'#f59e0b':'#94a3b8')}>{yr}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={mobile?150:200}>
            <LineChart data={tireData} margin={{top:4,right:4,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/>
              <XAxis dataKey="month" tick={{fill:'#6b7280',fontSize:8}}/>
              <YAxis tick={{fill:'#6b7280',fontSize:8}}/>
              <Tooltip contentStyle={{background:'#1e2538',border:'1px solid #2d3548',fontSize:11}}
                formatter={v=>[v!=null?N(v)+' เส้น':'—','']}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              {showTire[2024]&&<Line type="monotone" dataKey={2024} stroke="#94a3b8" strokeWidth={1.5} dot={{r:2}} connectNulls={false}/>}
              {showTire[2025]&&<Line type="monotone" dataKey={2025} stroke="#f59e0b" strokeWidth={2} dot={{r:3}} connectNulls={false}/>}
              {showTire[2026]&&<Line type="monotone" dataKey={2026} stroke="#22c55e" strokeWidth={3} dot={{r:6,fill:'#22c55e',strokeWidth:2,stroke:'#0d2a1a'}} connectNulls={false}/>}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ════ TRACKER ════ */
function Tracker({ctx}) {
  const {getMTD,getTS,getT,fcst,de,MTD_R,TODAY_D,TOTAL_D,DAYS_LEFT,MONTH_TH,cfg,mobile,FIELDS} = ctx

  // Build per-branch data with today's entry vs dynamic daily target
  const rows = BRANCHES.map((b,i) => {
    const t = getT(b.id)
    const m = getMTD(b.id)              // cumulative MTD all days
    const ts = getTS(b.id)             // MTD total sales

    // Sum days BEFORE today (1..TODAY_D-1) for dynamic target
    const beforeToday = sumDaysUpTo(de, b.id, TODAY_D - 1)
    const tsBeforeToday = calcTS(beforeToday)
    const tireBeforeToday = beforeToday.tire || 0

    // Days remaining including today
    const daysInclToday = TOTAL_D - TODAY_D + 1

    // Dynamic daily target = (remaining_target) / (remaining_days_incl_today)
    const salesDayTgt = Math.max(0, Math.round((t.sales - tsBeforeToday) / daysInclToday))
    const tireDayTgt  = Math.max(0, Math.round((t.tire  - tireBeforeToday) / daysInclToday))

    // Today's actual from entry
    const todayRow = de[b.id]?.[TODAY_D] || {}
    const todayAgg = Object.fromEntries(FIELDS.map(f=>[f.key, Number(todayRow[f.key])||0]))
    const todaySales = calcTS(todayAgg)
    const todayTire  = todayAgg.tire || 0
    const hasToday   = todaySales > 0 || todayTire > 0

    const salesAch = salesDayTgt > 0 ? P(todaySales, salesDayTgt) : null
    const tireAch  = tireDayTgt  > 0 ? P(todayTire,  tireDayTgt)  : null

    // AI forecast reference
    const fT = fcst[b.id]?.dailyForecast?.[0] || salesDayTgt

    return {
      ...b, t, m, ts, idx:i, hasToday,
      tsBeforeToday, tireBeforeToday,
      salesDayTgt, tireDayTgt,
      todaySales, todayTire,
      salesAch, tireAch,
      fT,
      mtdSalesPct: P(ts, t.sales*MTD_R),
      mtdTirePct:  P(m.tire, t.tire*MTD_R),
    }
  })

  const totTS    = rows.reduce((s,r)=>s+r.ts,0)
  const totTgt   = rows.reduce((s,r)=>s+r.t.sales*MTD_R,0)
  const totTire  = rows.reduce((s,r)=>s+r.m.tire,0)
  const totTireT = rows.reduce((s,r)=>s+r.t.tire*MTD_R,0)
  const todayTotSales = rows.reduce((s,r)=>s+r.todaySales,0)
  const todayTotTire  = rows.reduce((s,r)=>s+r.todayTire,0)
  const todayTotTgt   = rows.reduce((s,r)=>s+r.salesDayTgt,0)
  const todayTotTireT = rows.reduce((s,r)=>s+r.tireDayTgt,0)

  const AchBadge = ({pct}) => {
    if (pct===null) return <span style={{fontSize:10,color:'#4b5563'}}>—</span>
    const bg=pct>=100?'#166534':pct>=80?'#92400e':'#991b1b'
    const tx=pct>=100?'#bbf7d0':pct>=80?'#fef3c7':'#fecaca'
    return <span style={{background:bg,color:tx,borderRadius:4,padding:'2px 6px',fontSize:10,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{pct.toFixed(0)}%</span>
  }

  return (
    <div>
      <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:22,color:'#f59e0b',letterSpacing:2,marginBottom:6}}>
        🎯 TRACKER — {TODAY_D} {MONTH_TH} {cfg.year}
      </div>
      <div style={{fontSize:10,color:'#6b7280',marginBottom:12}}>
        เป้าวัน = (เป้าเดือน − ยอด MTD วันก่อนหน้า) ÷ {TOTAL_D - TODAY_D + 1} วันที่เหลือ (รวมวันนี้)
      </div>

      {/* Summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
        <div style={{background:'#1e2538',border:'1px solid #2d3548',borderRadius:8,padding:'10px 12px'}}>
          <div style={{fontSize:9,color:'#6b7280',fontFamily:'Barlow Condensed',textTransform:'uppercase'}}>วันนี้รวม (ยอดขาย)</div>
          <div style={{fontSize:22,fontWeight:700,color:todayTotSales>0?'#22c55e':'#374151',fontFamily:"'JetBrains Mono',monospace"}}>{fM(todayTotSales)}</div>
          <div style={{fontSize:9,color:'#6b7280'}}>เป้า/วัน {fM(todayTotTgt)}</div>
          {todayTotTgt>0&&<AchBadge pct={P(todayTotSales,todayTotTgt)}/>}
        </div>
        <div style={{background:'#1e2538',border:'1px solid #2d3548',borderRadius:8,padding:'10px 12px'}}>
          <div style={{fontSize:9,color:'#6b7280',fontFamily:'Barlow Condensed',textTransform:'uppercase'}}>วันนี้รวม (ยาง)</div>
          <div style={{fontSize:22,fontWeight:700,color:todayTotTire>0?'#3b82f6':'#374151',fontFamily:"'JetBrains Mono',monospace"}}>{N(todayTotTire)} <span style={{fontSize:13}}>เส้น</span></div>
          <div style={{fontSize:9,color:'#6b7280'}}>เป้า/วัน {N(todayTotTireT)} เส้น</div>
          {todayTotTireT>0&&<AchBadge pct={P(todayTotTire,todayTotTireT)}/>}
        </div>
        <div style={{background:'#1e2538',border:'1px solid #2d3548',borderRadius:8,padding:'8px 12px'}}>
          <div style={{fontSize:9,color:'#6b7280',fontFamily:'Barlow Condensed'}}>MTD ยอดขายรวม</div>
          <div style={{fontSize:16,fontWeight:700,color:'#f59e0b',fontFamily:"'JetBrains Mono',monospace"}}>{fM(totTS)}</div>
          <AchBadge pct={P(totTS,totTgt)}/>
        </div>
        <div style={{background:'#1e2538',border:'1px solid #2d3548',borderRadius:8,padding:'8px 12px'}}>
          <div style={{fontSize:9,color:'#6b7280',fontFamily:'Barlow Condensed'}}>MTD ยางรวม</div>
          <div style={{fontSize:16,fontWeight:700,color:'#3b82f6',fontFamily:"'JetBrains Mono',monospace"}}>{N(totTire)} เส้น</div>
          <AchBadge pct={P(totTire,totTireT)}/>
        </div>
      </div>

      {/* Per branch */}
      {mobile ? (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {rows.map((r,i) => (
            <div key={r.id} style={{background:'#161b25',border:`1px solid ${r.hasToday?'#22c55e33':'#2d3548'}`,borderRadius:10,padding:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:14,color:BCLR[i]}}>{r.id} {r.short}</span>
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  {!r.hasToday&&<span style={{fontSize:9,color:'#ef4444',background:'#450a0a',padding:'2px 6px',borderRadius:3}}>ยังไม่กรอกวันนี้</span>}
                  <PBadge value={r.mtdSalesPct}/>
                </div>
              </div>
              {/* Today row */}
              <div style={{background:'#0d1117',borderRadius:8,padding:'8px 10px',marginBottom:8}}>
                <div style={{fontSize:9,color:'#22c55e',fontFamily:'Barlow Condensed',fontWeight:700,marginBottom:4}}>⚡ วันนี้ (วันที่ {TODAY_D})</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div>
                    <div style={{fontSize:9,color:'#6b7280'}}>ยอดขาย</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:15,color:r.todaySales>0?'#22c55e':'#374151'}}>{r.todaySales>0?fM(r.todaySales):'—'}</div>
                    <div style={{fontSize:9,color:'#6b7280'}}>เป้า {fM(r.salesDayTgt)}</div>
                    <AchBadge pct={r.salesAch}/>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:'#6b7280'}}>ยาง</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:15,color:r.todayTire>0?'#3b82f6':'#374151'}}>{r.todayTire>0?N(r.todayTire)+' เส้น':'—'}</div>
                    <div style={{fontSize:9,color:'#6b7280'}}>เป้า {N(r.tireDayTgt)} เส้น</div>
                    <AchBadge pct={r.tireAch}/>
                  </div>
                </div>
              </div>
              {/* MTD row */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,fontSize:10}}>
                <div><div style={{color:'#6b7280',fontSize:8}}>MTD ยอด</div><div style={{fontFamily:"'JetBrains Mono',monospace",color:'#f59e0b',fontWeight:700}}>{fM(r.ts)}</div></div>
                <div><div style={{color:'#6b7280',fontSize:8}}>MTD ยาง</div><div style={{fontFamily:"'JetBrains Mono',monospace",color:'#3b82f6',fontWeight:700}}>{r.m.tire} เส้น</div></div>
                <div><div style={{color:'#6b7280',fontSize:8}}>% MTD</div><AchBadge pct={r.mtdTirePct}/></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{background:'#161b25',borderRadius:10,border:'1px solid #2d3548',overflow:'auto'}}>
          <div style={{padding:'10px 14px',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#f59e0b',borderBottom:'1px solid #2d3548'}}>
            เป้าวัน = (เป้าเดือน − MTD วันก่อน) ÷ {TOTAL_D - TODAY_D + 1} วัน — วันที่ {TODAY_D} {MONTH_TH} {cfg.year}
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead>
              <tr style={{background:'#0d1117'}}>
                <th rowSpan={2} style={{padding:'6px 8px',textAlign:'left',color:'#6b7280',fontFamily:'Barlow Condensed',borderBottom:'1px solid #1e2538',verticalAlign:'bottom'}}>สาขา</th>
                <th colSpan={3} style={{padding:'5px 8px',textAlign:'center',color:'#22c55e',fontFamily:'Barlow Condensed',fontSize:10,borderBottom:'1px solid #2d3548',borderLeft:'1px solid #2d3548'}}>⚡ วันนี้ (ยอดขาย)</th>
                <th colSpan={3} style={{padding:'5px 8px',textAlign:'center',color:'#3b82f6',fontFamily:'Barlow Condensed',fontSize:10,borderBottom:'1px solid #2d3548',borderLeft:'1px solid #2d3548'}}>🏷️ วันนี้ (ยาง)</th>
                <th colSpan={2} style={{padding:'5px 8px',textAlign:'center',color:'#f59e0b',fontFamily:'Barlow Condensed',fontSize:10,borderBottom:'1px solid #2d3548',borderLeft:'1px solid #2d3548'}}>MTD ยอด</th>
                <th colSpan={2} style={{padding:'5px 8px',textAlign:'center',color:'#94a3b8',fontFamily:'Barlow Condensed',fontSize:10,borderBottom:'1px solid #2d3548',borderLeft:'1px solid #2d3548'}}>MTD ยาง</th>
              </tr>
              <tr style={{background:'#0d1117'}}>
                {['จริง','เป้า/วัน','%','จริง (เส้น)','เป้า/วัน','%','ยอด','%เป้า','เส้น','%เป้า'].map((h,i)=>(
                  <th key={i} style={{padding:'5px 8px',textAlign:'center',color:'#6b7280',fontFamily:'Barlow Condensed',fontSize:10,borderBottom:'1px solid #1e2538',borderLeft:i===0||i===3||i===6||i===8?'1px solid #1e2538':'none'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i) => (
                <tr key={r.id} style={{borderBottom:'1px solid #1e2538',background:r.hasToday?'#0d1a0d':i%2===0?'transparent':'#131820'}}>
                  <td style={{padding:'7px 8px',fontFamily:'Barlow Condensed',fontWeight:700,color:BCLR[r.idx],fontSize:12,whiteSpace:'nowrap'}}>{r.id} {r.short}{!r.hasToday&&<span style={{color:'#ef4444',fontSize:8,marginLeft:4}}>⚠</span>}</td>
                  {/* Today sales */}
                  <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:r.todaySales>0?'#22c55e':'#374151',borderLeft:'1px solid #1e2538'}}>{r.todaySales>0?fM(r.todaySales):'—'}</td>
                  <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#6b7280'}}>{fM(r.salesDayTgt)}</td>
                  <td style={{padding:'7px 8px',textAlign:'center'}}><AchBadge pct={r.salesAch}/></td>
                  {/* Today tire */}
                  <td style={{padding:'7px 8px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:r.todayTire>0?'#3b82f6':'#374151',borderLeft:'1px solid #1e2538'}}>{r.todayTire>0?N(r.todayTire):'—'}</td>
                  <td style={{padding:'7px 8px',textAlign:'center',color:'#6b7280'}}>{N(r.tireDayTgt)}</td>
                  <td style={{padding:'7px 8px',textAlign:'center'}}><AchBadge pct={r.tireAch}/></td>
                  {/* MTD */}
                  <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#f59e0b',borderLeft:'1px solid #1e2538'}}>{fM(r.ts)}</td>
                  <td style={{padding:'7px 8px',textAlign:'center'}}><PBadge value={r.mtdSalesPct}/></td>
                  <td style={{padding:'7px 8px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",color:'#3b82f6',fontWeight:700,borderLeft:'1px solid #1e2538'}}>{r.m.tire}</td>
                  <td style={{padding:'7px 8px',textAlign:'center'}}><PBadge value={r.mtdTirePct}/></td>
                </tr>
              ))}
              {/* Total */}
              <tr style={{background:'#1e2538',borderTop:'2px solid #f59e0b'}}>
                <td style={{padding:'7px 8px',fontWeight:900,fontFamily:'Barlow Condensed',fontSize:13}}>รวม</td>
                <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#22c55e',borderLeft:'1px solid #2d3548'}}>{fM(todayTotSales)}</td>
                <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#6b7280'}}>{fM(todayTotTgt)}</td>
                <td style={{padding:'7px 8px',textAlign:'center'}}><AchBadge pct={todayTotTgt>0?P(todayTotSales,todayTotTgt):null}/></td>
                <td style={{padding:'7px 8px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#3b82f6',borderLeft:'1px solid #2d3548'}}>{N(todayTotTire)}</td>
                <td style={{padding:'7px 8px',textAlign:'center',color:'#6b7280'}}>{N(todayTotTireT)}</td>
                <td style={{padding:'7px 8px',textAlign:'center'}}><AchBadge pct={todayTotTireT>0?P(todayTotTire,todayTotTireT):null}/></td>
                <td style={{padding:'7px 8px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:900,color:'#f59e0b',borderLeft:'1px solid #2d3548'}}>{fM(totTS)}</td>
                <td style={{padding:'7px 8px',textAlign:'center'}}><PBadge value={P(totTS,totTgt)}/></td>
                <td style={{padding:'7px 8px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:900,color:'#3b82f6',borderLeft:'1px solid #2d3548'}}>{N(totTire)}</td>
                <td style={{padding:'7px 8px',textAlign:'center'}}><PBadge value={P(totTire,totTireT)}/></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ════ ASP & SPD ════ */
function ASP({ctx}) {
  const {selBr,setSelBr,getMTD,getAllMTD,getTS,getAllTS,mobile} = ctx
  const AT=3800,ST=5100
  const rows=BRANCHES.map((b,i)=>{const m=getMTD(b.id),ts=getTS(b.id);return{...b,m,ts,asp:m.tire>0&&m.tireSales>0?m.tireSales/m.tire:0,spd:m.jobOrder>0?ts/m.jobOrder:0,idx:i}})
  const aM=getAllMTD(),aTS=getAllTS(),aASP=aM.tire>0&&aM.tireSales>0?aM.tireSales/aM.tire:0,aSPD=aM.jobOrder>0?aTS/aM.jobOrder:0
  return (
    <div style={{display:'flex',gap:16,flexDirection:mobile?'column':'row'}}>
      <BranchSelect sel={selBr} onSel={setSelBr} mobile={mobile}/>
      <div style={{flex:1}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:20,color:'#f59e0b',letterSpacing:2,marginBottom:10}}>💰 ASP & SPD</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          <Card label="ASP threshold" value={'฿'+N(AT)} sub="ยอดยาง ÷ เส้น"/>
          <Card label="SPD threshold" value={'฿'+N(ST)} sub="ยอดรวม ÷ Job" color="#10b981"/>
          <Card label="ASP รวม" value={aASP>0?'฿'+N(Math.round(aASP)):'—'} color={aASP>=AT?'#22c55e':'#ef4444'}/>
          <Card label="SPD รวม" value={aSPD>0?'฿'+N(Math.round(aSPD)):'—'} color={aSPD>=ST?'#22c55e':'#ef4444'}/>
        </div>
        {mobile ? (
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {rows.map((r,i)=>(
              <div key={r.id} style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:10,padding:12}}>
                <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:14,color:BCLR[i],marginBottom:8}}>{r.id} {r.short}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div style={{background:'#0d1117',borderRadius:6,padding:8,textAlign:'center'}}>
                    <div style={{fontSize:9,color:'#6b7280',marginBottom:2}}>ASP</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:15,color:r.asp>=AT?'#22c55e':r.asp>0?'#ef4444':'#6b7280'}}>{r.asp>0?'฿'+N(Math.round(r.asp)):'—'}</div>
                    <div style={{fontSize:12}}>{r.asp===0?'—':r.asp>=AT?'✅':'❌'}</div>
                  </div>
                  <div style={{background:'#0d1117',borderRadius:6,padding:8,textAlign:'center'}}>
                    <div style={{fontSize:9,color:'#6b7280',marginBottom:2}}>SPD</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:15,color:r.spd>=ST?'#22c55e':r.spd>0?'#ef4444':'#6b7280'}}>{r.spd>0?'฿'+N(Math.round(r.spd)):'—'}</div>
                    <div style={{fontSize:12}}>{r.spd===0?'—':r.spd>=ST?'✅':'❌'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,overflow:'hidden',marginBottom:14}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'#0d1117'}}>{['สาขา','ยอดยาง','เส้น','ASP','✓','ยอดรวม','Job','SPD','✓'].map(h=><th key={h} style={{padding:'8px 10px',textAlign:'center',color:'#6b7280',fontSize:11,fontFamily:'Barlow Condensed',borderBottom:'1px solid #1e2538'}}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((r,i)=>(
                <tr key={r.id} style={{borderBottom:'1px solid #1e2538',background:i%2===0?'transparent':'#131820'}}>
                  <td style={{padding:'8px 10px',fontWeight:600,color:BCLR[r.idx],fontSize:11}}>{r.short}</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{N(r.m.tireSales)}</td>
                  <td style={{padding:'8px 10px',textAlign:'center',fontSize:11}}>{r.m.tire}</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:r.asp>=AT?'#22c55e':r.asp>0?'#ef4444':'#6b7280',fontSize:11}}>{r.asp>0?'฿'+N(Math.round(r.asp)):'—'}</td>
                  <td style={{padding:'8px 10px',textAlign:'center',fontSize:13}}>{r.asp===0?'—':r.asp>=AT?'✅':'❌'}</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{N(r.ts)}</td>
                  <td style={{padding:'8px 10px',textAlign:'center',fontSize:11}}>{r.m.jobOrder}</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:r.spd>=ST?'#22c55e':r.spd>0?'#ef4444':'#6b7280',fontSize:11}}>{r.spd>0?'฿'+N(Math.round(r.spd)):'—'}</td>
                  <td style={{padding:'8px 10px',textAlign:'center',fontSize:13}}>{r.spd===0?'—':r.spd>=ST?'✅':'❌'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ════ PLAN ════ */
function Plan({ctx}) {
  const {selBr,setSelBr,getMTD,getAllMTD,getTS,getAllTS,getT,aiAna,aiLoad,genPlan,MTD_R,mobile} = ctx
  const isAll=selBr==='ALL',t=getT(selBr),m=isAll?getAllMTD():getMTD(selBr),ts=isAll?getAllTS():getTS(selBr)
  return (
    <div style={{display:'flex',gap:16,flexDirection:mobile?'column':'row'}}>
      <BranchSelect sel={selBr} onSel={setSelBr} mobile={mobile}/>
      <div style={{flex:1}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:20,color:'#f59e0b'}}>🤖 AI แผนการขาย — {isAll?'รวม':BRANCHES.find(x=>x.id===selBr)?.short}</div>
          <button onClick={()=>genPlan(selBr)} disabled={aiLoad[selBr]} style={{padding:'9px 18px',background:aiLoad[selBr]?'#1e2538':'#7c3aed',color:'#fff',border:'none',borderRadius:6,cursor:aiLoad[selBr]?'wait':'pointer',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,width:mobile?'100%':'auto'}}>{aiLoad[selBr]?'⏳ AI กำลังวิเคราะห์...':'🔍 วิเคราะห์จุดอ่อน'}</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          <Card label="ยอด MTD" value={fM(ts)} sub={`เป้า ${fM(Math.round(t.sales*MTD_R))}`}/>
          <Card label="% เป้า" value={P(ts,t.sales*MTD_R).toFixed(1)+'%'} color={P(ts,t.sales*MTD_R)>=100?'#22c55e':P(ts,t.sales*MTD_R)>=90?'#f59e0b':'#ef4444'}/>
        </div>
        {aiAna[selBr]
          ? <div style={{background:'#0d1928',border:'1px solid #7c3aed',borderRadius:10,padding:mobile?14:20}}><div style={{fontFamily:'Barlow Condensed',fontSize:11,color:'#a78bfa',marginBottom:10}}>🤖 AI ANALYSIS</div><div style={{fontSize:mobile?12:13,lineHeight:1.8,color:'#d1d5db',whiteSpace:'pre-wrap'}}>{aiAna[selBr]}</div></div>
          : <div style={{background:'#161b25',border:'2px dashed #2d3548',borderRadius:10,padding:40,textAlign:'center'}}><div style={{fontSize:40,marginBottom:8}}>🤖</div><div style={{color:'#6b7280',fontFamily:'Barlow Condensed',fontSize:14}}>กดปุ่มด้านบนเพื่อให้ AI วิเคราะห์</div></div>}
      </div>
    </div>
  )
}

/* ════ ENTRY — กรอกยอดรายวัน ════ */
function Entry({ctx}) {
  const {de,saveDay,delDay,getMTD,getTS,getT,MTD_R,TODAY_D,TOTAL_D,MONTH_TH,cfg,mobile} = ctx
  const [selBr, setSelBr] = useState('009')
  const [selDay, setSelDay] = useState(TODAY_D)
  const t=getT(selBr), row=de[selBr]?.[selDay]||EMPTY_ROW(), mtd=getMTD(selBr), ts=getTS(selBr)
  const filled=Object.keys(de[selBr]||{}).map(Number).sort((a,b)=>a-b)
  return (
    <div style={{display:'flex',gap:16,flexDirection:mobile?'column':'row'}}>
      {/* Branch sidebar (no ALL) */}
      {mobile ? (
        <div style={{marginBottom:0}}>
          <select value={selBr} onChange={e=>setSelBr(e.target.value)}
            style={{width:'100%',background:'#1e2538',border:'1px solid #f59e0b',borderRadius:8,padding:'11px 14px',color:'#f59e0b',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:15,outline:'none',marginBottom:10}}>
            {BRANCHES.map(b=><option key={b.id} value={b.id}>{b.id} — {b.short}</option>)}
          </select>
        </div>
      ) : (
        <div style={{width:165,flexShrink:0}}>
          <div style={{fontSize:10,color:'#6b7280',textTransform:'uppercase',letterSpacing:1,marginBottom:6,fontFamily:'Barlow Condensed'}}>เลือกสาขา</div>
          {BRANCHES.map((b,i)=>(
            <button key={b.id} onClick={()=>setSelBr(b.id)} style={{display:'block',width:'100%',textAlign:'left',padding:'7px 10px',marginBottom:3,borderRadius:6,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'Barlow',background:selBr===b.id?'#1e2538':'transparent',border:selBr===b.id?`1px solid ${BCLR[i]}`:'1px solid transparent',color:selBr===b.id?BCLR[i]:'#9ca3af'}}>
              <span style={{fontSize:9,color:BCLR[i],marginRight:4}}>●</span><span style={{fontSize:9,color:'#4b5563',marginRight:3}}>{b.id}</span>{b.short}
            </button>
          ))}
        </div>
      )}
      <div style={{flex:1}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:20,color:'#f59e0b',letterSpacing:2,marginBottom:10}}>✏️ กรอกยอดรายวัน — {BRANCHES.find(x=>x.id===selBr)?.name}</div>
        {/* Day picker */}
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,padding:12,marginBottom:10}}>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:12,color:'#e5e7eb',marginBottom:8}}>📅 เลือกวัน — {MONTH_TH} {cfg.year}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:mobile?4:5}}>
            {Array.from({length:TOTAL_D},(_,i)=>{const d=i+1,has=!!(de[selBr]?.[d]),isTdy=d===TODAY_D,isSel=d===selDay;return(
              <button key={d} onClick={()=>setSelDay(d)} style={{width:mobile?33:36,height:mobile?33:36,borderRadius:6,border:isSel?'2px solid #f59e0b':has?'1px solid #22c55e':'1px solid #2d3548',background:isSel?'#f59e0b':has?'#0d2a1a':'#0d1117',color:isSel?'#000':has?'#22c55e':d>TODAY_D?'#374151':'#e5e7eb',cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:mobile?12:13,position:'relative'}}>
                {d}{isTdy&&<div style={{position:'absolute',top:1,right:2,width:4,height:4,borderRadius:'50%',background:isSel?'#000':'#f59e0b'}}/>}
              </button>
            )})}
          </div>
          <div style={{marginTop:6,display:'flex',gap:14,fontSize:10,color:'#6b7280'}}>
            <span><span style={{color:'#f59e0b'}}>■</span> เลือก</span>
            <span><span style={{color:'#22c55e'}}>■</span> มีข้อมูล</span>
          </div>
        </div>
        {/* MTD summary */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
          <Card label={`ยอด MTD (${filled.length}วัน)`} value={fM(ts)} sub={`เป้า ${fM(Math.round(t.sales*MTD_R))}`} small/>
          <Card label="% เป้า" value={P(ts,t.sales*MTD_R).toFixed(1)+'%'} color={P(ts,t.sales*MTD_R)>=100?'#22c55e':P(ts,t.sales*MTD_R)>=90?'#f59e0b':'#ef4444'} small/>
          <Card label="ยาง MTD" value={N(mtd.tire)+' เส้น'} sub={`เป้า ${Math.round(t.tire*MTD_R)}`} color="#3b82f6" small/>
          <Card label="Job Order" value={N(mtd.jobOrder)} sub={`เป้า ${Math.round(t.cc*MTD_R)}`} color="#10b981" small/>
        </div>
        {/* Form */}
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:10,overflow:'hidden',marginBottom:10}}>
          <div style={{padding:'10px 14px',background:'#0d1117',borderBottom:'1px solid #2d3548',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
            <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:14,color:'#f59e0b'}}>
              {selDay} {MONTH_TH} {cfg.year}
              {selDay===TODAY_D&&<span style={{fontSize:11,color:'#22c55e',marginLeft:8}}>(วันนี้)</span>}
              {selDay<TODAY_D&&<span style={{fontSize:11,color:'#f59e0b',marginLeft:8}}>(ย้อนหลัง)</span>}
              {selDay>TODAY_D&&<span style={{fontSize:11,color:'#6b7280',marginLeft:8}}>(ยังไม่ถึง)</span>}
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <span style={{fontSize:10,color:'#22c55e'}}>⚡ Supabase Realtime</span>
              {de[selBr]?.[selDay]&&<button onClick={()=>delDay(selBr,selDay)} style={{padding:'4px 10px',background:'#450a0a',border:'1px solid #ef4444',borderRadius:4,color:'#ef4444',cursor:'pointer',fontSize:11}}>🗑</button>}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'1fr 1fr'}}>
            {FIELDS.map((f,i)=>{
              const tV=f.tgt?(t[f.tgt]||0):0
              const isTotalSales = f.key==='totalSales'
              return(
              <div key={f.key} style={{padding:'10px 12px',borderBottom:'1px solid #1e2538',borderRight:(!mobile&&i%2===0)?'1px solid #1e2538':'none',background:isTotalSales?'#1a1228':i%4<2?'transparent':'#0d1117',gridColumn:isTotalSales?'1 / -1':'auto'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <label style={{fontSize:isTotalSales?14:12,fontWeight:700,color:isTotalSales?'#f59e0b':'#9ca3af'}}>{isTotalSales?'💰 ':''}{f.label}</label>
                  {tV>0&&<span style={{fontSize:9,color:'#4b5563'}}>เป้า/วัน≈{Math.round(tV/TOTAL_D)}</span>}
                  {isTotalSales&&<span style={{fontSize:10,color:'#a78bfa'}}>← กรอกตรงนี้ก่อน ถ้ามีตัวเลขรวม</span>}
                </div>
                <input type="number" inputMode="numeric" value={row[f.key]||''} placeholder={isTotalSales?"0":"0"}
                  onChange={e=>saveDay(selBr,selDay,f.key,e.target.value)}
                  style={{width:'100%',boxSizing:'border-box',background:'#0d1117',border:isTotalSales?'2px solid #f59e0b':'1px solid #2d3548',borderRadius:5,padding:mobile?'10px 12px':'7px 10px',color:'#f59e0b',fontFamily:"'JetBrains Mono',monospace",fontSize:mobile?18:isTotalSales?18:15,fontWeight:700,outline:'none'}}/>
              </div>
            )})}
          </div>
        </div>
        {/* History */}
        {filled.length>0&&(
          <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,overflow:'hidden'}}>
            <div style={{padding:'8px 12px',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#3b82f6',borderBottom:'1px solid #2d3548'}}>📋 ประวัติ {filled.length} วัน (คลิกแถวเพื่อแก้ไข)</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{background:'#0d1117'}}>{['วัน','ยอดรวม','ยาง','ยอดยาง','Battery','Brake','MP','Job',''].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'center',color:'#6b7280',fontSize:10,fontFamily:'Barlow Condensed',borderBottom:'1px solid #1e2538',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                <tbody>{filled.map((d,i)=>{const r=de[selBr][d]||{};const ts=r.totalSales>0?+r.totalSales:calcTS(Object.fromEntries(FIELDS.map(f=>[f.key,+r[f.key]||0])));return(
                  <tr key={d} onClick={()=>setSelDay(d)} style={{borderBottom:'1px solid #1e2538',background:d===selDay?'#1e2538':i%2===0?'transparent':'#131820',cursor:'pointer'}}>
                    <td style={{padding:'6px 8px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:d===selDay?'#f59e0b':'#e5e7eb'}}>{d} {MONTH_TH}</td>
                    <td style={{padding:'6px 8px',textAlign:'right',color:'#f59e0b',fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{ts>0?fM(ts):'—'}</td>
                    <td style={{padding:'6px 8px',textAlign:'center',color:'#3b82f6',fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{r.tire||'—'}</td>
                    <td style={{padding:'6px 8px',textAlign:'right',color:'#f59e0b',fontFamily:"'JetBrains Mono',monospace"}}>{r.tireSales?fM(+r.tireSales):'—'}</td>
                    <td style={{padding:'6px 8px',textAlign:'center'}}>{r.battery||'—'}</td>
                    <td style={{padding:'6px 8px',textAlign:'center'}}>{r.brake||'—'}</td>
                    <td style={{padding:'6px 8px',textAlign:'center'}}>{r.mp||'—'}</td>
                    <td style={{padding:'6px 8px',textAlign:'center'}}>{r.jobOrder||'—'}</td>
                    <td style={{padding:'6px 8px',textAlign:'center'}}><button onClick={e=>{e.stopPropagation();delDay(selBr,d)}} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:12}}>🗑</button></td>
                  </tr>
                )})}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════
   UPLOAD
═════════════════════════════════════════════════════════════ */

/* ── Parse ยอดขายรายวัน / ยอดขายยางรายวัน ──────────────────────
   File structure:
     Row 1: Year labels (2024 at col C, 2025 at col M)
     Row 3: CustGroupName → look for "Total" to find total columns
     Row 4: "Branch" | "DocDate" | ...
     Data: col1=branch name (on first row of each branch), col2=date, col12=2024 total amt, col22=2025 total amt
   Branch Map: "003-Cockpit Srinakarin" → bid "003"
─────────────────────────────────────────────────────────────── */
const DAILY_BID_MAP = {
  '003':'003','009':'009','010':'010','012':'012','014':'014',
  '048':'048','050':'050','096':'096','089':'143','107':'107','143':'143'
}

function parseDailyFile(wb, sheetHint, isAmountCol) {
  // sheetHint: part of sheet name to match
  // isAmountCol: true = use Amount col, false = use Qty col
  const sn = wb.SheetNames.find(s => s.includes(sheetHint) || s.includes('ยอดขาย')) || wb.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], {header:1, raw:true, cellDates:true})
  if (!rows.length) return {}

  // Detect year → column mapping from row 1
  const yearCols = {}  // { 2024: { qty: col, amt: col }, 2025: {...} }
  const row1 = rows[0] || []
  for (let c = 0; c < row1.length; c++) {
    const yr = row1[c]
    if (yr === 2024 || yr === 2025 || yr === 2026) {
      // Find "Total" in row 3 (index 2) starting from this column
      const row3 = rows[2] || []
      let totalCol = -1
      for (let cc = c; cc < Math.min(c+15, row3.length); cc++) {
        if (row3[cc] === 'Total') { totalCol = cc; break }
      }
      if (totalCol >= 0) {
        yearCols[yr] = { qty: totalCol, amt: totalCol+1 }
      }
    }
  }

  const result = {}  // { bid: { 'YYYY-MM': { day: value } } }
  let currentBid = null

  for (let ri = 4; ri < rows.length; ri++) {
    const row = rows[ri]
    if (!row) continue

    // New branch: col 0 has branch name containing "Cockpit"
    const col0 = String(row[0] || '')
    if (col0.includes('Cockpit') || col0.includes('cockpit')) {
      const rawBid = col0.split('-')[0].trim().replace(/^0+/, s=>s)
      // Normalize: '3' → '003'
      const bid = DAILY_BID_MAP[rawBid.padStart(3,'0')] || rawBid.padStart(3,'0')
      currentBid = bid
      if (!result[bid]) result[bid] = {}
      continue
    }

    if (!currentBid) continue

    // Daily data row: col 1 has a date
    const dateVal = row[1]
    if (!dateVal) continue

    // Parse date — could be Date object or serial number
    let dt
    if (dateVal instanceof Date) {
      dt = dateVal
    } else if (typeof dateVal === 'number') {
      // Excel serial number
      const epoch = new Date(1899,11,30)
      dt = new Date(epoch.getTime() + dateVal*86400000)
    } else {
      continue
    }

    const yr = dt.getFullYear()
    const mo = dt.getMonth()+1
    const day = dt.getDate()
    if (yr < 2020 || yr > 2030) continue

    const colMap = yearCols[yr]
    if (!colMap) continue

    const rawVal = row[isAmountCol ? colMap.amt : colMap.qty]
    const val = typeof rawVal === 'number' ? Math.round(rawVal) : 0
    if (val <= 0) continue

    const key = `${yr}-${String(mo).padStart(2,'0')}`
    if (!result[currentBid][key]) result[currentBid][key] = {}
    result[currentBid][key][day] = val
  }

  return result
}

const FDEFS = [
  {
    key:'target',
    label:'เป้าเดือน (Jun/Jul...)',
    icon:'🎯',
    hint:'Sheet: For_BI'
  },
  {
    key:'salesdata',
    label:'Data_sale_by_Store.xlsx',
    icon:'📊',
    hint:'Sheet: 003-xxx, 009-xxx, ... (รายสาขา)'
  },
  {
    key:'hist',
    label:'ประวัติยอดขาย.xlsx',
    icon:'📖',
    hint:'Sheet: Sales History23-26'
  },
  {
    key:'daily',
    label:'ยอดขายรายวัน.xlsx',
    icon:'📅',
    hint:'Sheet: ยอดขายรายวัน → โหลดยอดขาย 2024/2025 รายวัน'
  },
  {
    key:'tiredaily',
    label:'ยอดขายยางรายวัน.xlsx',
    icon:'🛞',
    hint:'Sheet: ยอดขายยางรายวัน → โหลดยาง 2024/2025 รายวัน'
  },
]

/* ── Parse Data_sale_by_Store.xlsx ──────────────────────────
   Sheet names: "003-Cockpit Srinakarin", "009-xxx", ...
   Rows (1-indexed):
     4  = Job Order (Car count)
     25 = Total Tire units
     40 = Tire Net Sales ฿
     48 = Lube Net Sales ฿
     56 = MP Net Sales ฿
     58 = Battery Net Sales ฿
     60 = Brake Net Sales ฿
     62 = Shock Net Sales ฿
     63 = Service Tire ฿
     64 = Service Non-Tire ฿
   Columns (0-indexed):
     2024: 4-15 (Jan-Dec)
     2025: 17-28 (Jan-Dec)
     2026: 30-34 (Jan-May so far)
─────────────────────────────────────────────────────────── */
function parseSalesData(wb) {
  const histOut  = {}  // { bid: { 2024:[12], 2025:[12], 2026:[12] } }
  const tireqOut = {}  // { bid: { 2024:[12], 2025:[12] } }
  const parsed   = []  // summary for display

  const COL_START = { 2024: 4, 2025: 17, 2026: 30 }
  const MON_COUNT = { 2024: 12, 2025: 12, 2026: 5 }
  // Revenue rows (0-indexed from sheet_to_json)
  const REV_ROWS = [39, 47, 55, 57, 59, 61, 62, 63]
  const TIRE_ROW = 24   // Total tires
  const JOB_ROW  = 3    // Car count / Job Order
  const BAT_ROW  = 56   // Battery units
  const BRK_ROW  = 58   // Brake units
  const SHK_ROW  = 60   // Shock units
  const MP_ROW   = 51   // MP units

  wb.SheetNames.forEach(sn => {
    const match = sn.match(/^(\d{3})/)
    if (!match) return
    const bid = match[1]

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1 })

    histOut[bid]  = {}
    tireqOut[bid] = {}

    ;[2024, 2025, 2026].forEach(yr => {
      const start  = COL_START[yr]
      const months = MON_COUNT[yr]
      const hist   = []
      const tireq  = []

      for (let m = 0; m < months; m++) {
        const col = start + m
        // Sum all revenue rows for total monthly sales
        const total = REV_ROWS.reduce((s, r) => s + (Number(rows[r]?.[col]) || 0), 0)
        hist.push(Math.round(total / 1000))
        tireq.push(Number(rows[TIRE_ROW]?.[col]) || 0)
      }

      // Pad months not yet available with null
      while (hist.length  < 12) hist.push(null)
      while (tireq.length < 12) tireq.push(null)

      histOut[bid][yr]  = hist
      tireqOut[bid][yr] = tireq
    })

    // Summary of latest month with data
    const latestCol = COL_START[2026] + MON_COUNT[2026] - 1  // May 2026
    const latestSales = REV_ROWS.reduce((s, r) => s + (Number(rows[r]?.[latestCol]) || 0), 0)
    parsed.push({
      bid,
      name: sn,
      sales: Math.round(latestSales / 1000),
      tire:  Number(rows[TIRE_ROW]?.[latestCol]) || 0,
      job:   Number(rows[JOB_ROW]?.[latestCol])  || 0,
    })
  })

  return { histOut, tireqOut, parsed }
}

function parseTgt(wb) {

  const sn =
    wb.SheetNames.find(
      s =>
        s.toLowerCase().includes('for_bi') ||
        s.includes('2026')
    ) || wb.SheetNames[0]

  const rows = XLSX.utils.sheet_to_json(
    wb.Sheets[sn],
    { header:1 }
  )

  const map = {
    '3':'003',
    '9':'009',
    '10':'010',
    '12':'012',
    '14':'014',
    '48':'048',
    '50':'050',
    '96':'096',
    '107':'107',
    '143':'143'
  }

  const res = {}

  rows.forEach(r => {

    const bid = map[String(r[0] || '').trim()]

    if (bid && r[3]) {

      res[bid] = {
        sales:   +r[3]  || 0,
        tire:    +r[4]  || 0,
        lube:    +r[5]  || 0,
        battery: +r[6]  || 0,
        brake:   +r[7]  || 0,
        shock:   +r[8]  || 0,
        mp:      +r[9]  || 0,
        cc:      +r[12] || 0
      }
    }
  })

  return res
}

function Upload({ ctx }) {

  const {
    upStat,
    setUpStat,
    setTARGET,
    setHIST,
    setHistDailySales,
    setHistDailyTire,
    setHistTireQ,
    mobile
  } = ctx

  const refs = {
    target:    useRef(),
    salesdata: useRef(),
    hist:      useRef(),
    daily:     useRef(),
    tiredaily: useRef()
  }

  /* ═════════════════════════════════════════════════════
     HANDLE UPLOAD
  ═════════════════════════════════════════════════════ */

  const handle = async (key, file) => {

    if (!file) return

    try {

      const buf = await file.arrayBuffer()

      const wb = XLSX.read(buf, {
        type: 'array',
        cellDates: true
      })

      /* ─────────────────────────────────────────────
         SALES DATA (Data_sale_by_Store.xlsx)
         อัพเดท HIST รายเดือน 2024-2026 ทุกสาขา
      ───────────────────────────────────────────── */

      if (key === 'salesdata') {

        const { histOut, tireqOut, parsed } = parseSalesData(wb)

        // Update monthly sales history
        setHIST(prev => {
          const n = { ...prev }
          Object.entries(histOut).forEach(([bid, years]) => {
            n[bid] = { ...(n[bid] || {}), ...years }
          })
          DB.set('cp_hist', n)
          return n
        })

        // Update tire quantity history (2024/2025/2026 monthly)
        if (Object.keys(tireqOut).length > 0) {
          setHistTireQ(prev => {
            const n = { ...prev }
            Object.entries(tireqOut).forEach(([bid, years]) => {
              n[bid] = { ...(n[bid] || {}), ...years }
            })
            DB.set('cp_tireq', n)
            return n
          })
        }

        const summary = parsed.map(p =>
          `${p.bid}: ฿${p.sales}K | ยาง ${p.tire} เส้น`
        ).join('\n')
        console.log('Sales data parsed:\n' + summary)
      }

      /* ─────────────────────────────────────────────
         TARGET
      ───────────────────────────────────────────── */

      if (key === 'target') {

        const p = parseTgt(wb)

        setTARGET(prev => {

          const n = {
            ...prev,
            ...p
          }

          DB.set('cp_tgt', n)

          return n
        })
      }

      /* ─────────────────────────────────────────────
         HISTORY
      ───────────────────────────────────────────── */

      if (key === 'hist') {
        console.log('History file received:', file.name, '— keeping existing data')
      }

      /* ─────────────────────────────────────────────
         DAILY SALES — ยอดขายรายวัน.xlsx
      ───────────────────────────────────────────── */
      if (key === 'daily') {
        const parsed = parseDailyFile(wb, 'ยอดขายรายวัน', true)  // true = Amount
        const branchCount = Object.keys(parsed).length
        if (branchCount > 0) {
          setHistDailySales(prev => {
            const n = {...prev}
            Object.entries(parsed).forEach(([bid, months]) => {
              n[bid] = {...(n[bid]||{}), ...months}
            })
            DB.set('cp_hdsl', n)
            return n
          })
          console.log(`Daily sales parsed: ${branchCount} branches`)
        }
      }

      /* ─────────────────────────────────────────────
         DAILY TIRE — ยอดขายยางรายวัน.xlsx
      ───────────────────────────────────────────── */
      if (key === 'tiredaily') {
        const parsed = parseDailyFile(wb, 'ยอดขายยาง', false)  // false = Qty
        const branchCount = Object.keys(parsed).length
        if (branchCount > 0) {
          setHistDailyTire(prev => {
            const n = {...prev}
            Object.entries(parsed).forEach(([bid, months]) => {
              n[bid] = {...(n[bid]||{}), ...months}
            })
            DB.set('cp_hdtr', n)
            return n
          })
          console.log(`Daily tire parsed: ${branchCount} branches`)
        }
      }

      /* ─────────────────────────────────────────────
         STATUS
      ───────────────────────────────────────────── */

      const ns = {
        ...upStat,
        [key]: {
          name: file.name,
          time: new Date().toLocaleTimeString('th-TH'),
          ok: true
        }
      }

      setUpStat(ns)

      DB.set('cp_up', ns)

    } catch (e) {

      console.error(e)

      const ns = {
        ...upStat,
        [key]: {
          name: file.name,
          ok: false,
          err: e.message
        }
      }

      setUpStat(ns)
    }
  }

  return (

    <div>

      <div style={{
        fontFamily:'Barlow Condensed',
        fontWeight:900,
        fontSize:mobile ? 18 : 22,
        color:'#f59e0b',
        letterSpacing:2,
        marginBottom:6
      }}>
        📁 อัพโหลด Excel
      </div>

      <div style={{
        fontSize:12,
        color:'#6b7280',
        marginBottom:16
      }}>
        อัพโหลดครั้งเดียว — ทุกเครื่องเห็นข้อมูลใหม่ทันที
        (Supabase Realtime)
      </div>

      <div style={{
        display:'grid',
        gridTemplateColumns:mobile ? '1fr' : '1fr 1fr',
        gap:12,
        marginBottom:20
      }}>

        {FDEFS.map(fd => {

          const st = upStat[fd.key]

          return (

            <div
              key={fd.key}
              style={{
                background:'#1a1f2e',
                border:`1px solid ${
                  st?.ok
                    ? '#22c55e'
                    : st?.ok === false
                    ? '#ef4444'
                    : '#2d3548'
                }`,
                borderRadius:10,
                padding:14
              }}
            >

              <div style={{
                fontFamily:'Barlow Condensed',
                fontWeight:700,
                fontSize:14,
                marginBottom:2
              }}>
                {fd.icon} {fd.label}
              </div>

              <div style={{
                fontSize:10,
                color:'#6b7280',
                marginBottom:10
              }}>
                {fd.hint}
              </div>

              {st && (

                <div style={{
                  fontSize:11,
                  marginBottom:8,
                  color:st.ok ? '#22c55e' : '#ef4444',
                  background:st.ok ? '#0d2a1a' : '#2a0d0d',
                  padding:'4px 8px',
                  borderRadius:4
                }}>
                  {st.ok ? '✅' : '❌'} {st.name}
                </div>
              )}

              <input
                ref={refs[fd.key]}
                type="file"
                accept=".xlsx,.xls"
                style={{ display:'none' }}
                onChange={e =>
                  handle(fd.key, e.target.files[0])
                }
              />

              <button
                onClick={() =>
                  refs[fd.key].current?.click()
                }
                style={{
                  width:'100%',
                  padding:'10px 0',
                  background:'#1d4ed8',
                  color:'#fff',
                  border:'none',
                  borderRadius:6,
                  cursor:'pointer',
                  fontFamily:'Barlow Condensed',
                  fontWeight:700,
                  fontSize:13
                }}
              >
                📂 {st?.ok ? 'อัพโหลดใหม่' : 'เลือกไฟล์'}
              </button>

            </div>
          )
        })}

      </div>

    </div>
  )
}
/* ════ SETTINGS ════ */
function Settings({ctx}) {
  const {cfg,saveCfg,TODAY_D,TOTAL_D,DAYS_LEFT,MTD_R,MONTH_TH,mobile} = ctx
  const [form,setForm]=useState({year:cfg.year,month:cfg.month,todayDay:cfg.todayDay})
  const [saved,setSaved]=useState(false)
  const totalDP=dIM(form.year,form.month), daysLP=Math.max(1,totalDP-form.todayDay)
  const IS={width:'100%',boxSizing:'border-box',background:'#0d1117',border:'1px solid #2d3548',borderRadius:6,padding:'11px 10px',color:'#f59e0b',fontFamily:"'JetBrains Mono',monospace",fontSize:20,fontWeight:700,outline:'none',textAlign:'center'}

  const handleSave = () => {
    saveCfg({year:Number(form.year),month:Number(form.month),todayDay:Number(form.todayDay)})
    setSaved(true); setTimeout(()=>setSaved(false),3000)
  }

  return (
    <div style={{maxWidth:560,margin:'0 auto'}}>
      <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?20:26,color:'#a78bfa',marginBottom:4}}>⚙️ ตั้งค่าเดือน</div>
      <div style={{fontSize:12,color:'#6b7280',marginBottom:14}}>เปลี่ยนจากหน้านี้ได้เลย — กด "บันทึก" <strong style={{color:'#22c55e'}}>ทุกเครื่องเห็นพร้อมกัน</strong> (Supabase Realtime)</div>

      {/* Current */}
      <div style={{background:'#1e2538',border:'1px solid #a78bfa',borderRadius:10,padding:14,marginBottom:14}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:11,color:'#a78bfa',marginBottom:8}}>⚡ ค่าปัจจุบัน</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,textAlign:'center',marginBottom:8}}>
          {[{l:'วันที่',v:TODAY_D},{l:'วันในเดือน',v:TOTAL_D},{l:'เหลือ',v:DAYS_LEFT+' วัน'},{l:'% MTD',v:(MTD_R*100).toFixed(1)+'%'}].map(c=>(
            <div key={c.l}><div style={{fontSize:9,color:'#6b7280'}}>{c.l}</div><div style={{fontSize:20,fontWeight:700,color:'#a78bfa',fontFamily:"'JetBrains Mono',monospace"}}>{c.v}</div></div>
          ))}
        </div>
        <div style={{textAlign:'center',fontSize:14,color:'#e5e7eb',fontFamily:'Barlow Condensed',fontWeight:700}}>📅 {TODAY_D} {MONTH_TH} {cfg.year}</div>
      </div>

      {/* Edit */}
      <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:10,padding:16,marginBottom:12}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#e5e7eb',marginBottom:12}}>✏️ เปลี่ยนเป็น</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
          <div><div style={{fontSize:9,color:'#6b7280',marginBottom:4,fontFamily:'Barlow Condensed'}}>ปี</div><input type="number" value={form.year} min="2024" max="2030" onChange={e=>setForm(p=>({...p,year:e.target.value}))} style={IS}/></div>
          <div><div style={{fontSize:9,color:'#6b7280',marginBottom:4,fontFamily:'Barlow Condensed'}}>เดือน</div>
            <select value={form.month} onChange={e=>setForm(p=>({...p,month:Number(e.target.value),todayDay:Math.min(p.todayDay,dIM(p.year,Number(e.target.value)))}))}
              style={{...IS,fontSize:13,padding:'13px 8px'}}>
              {MONTHS_TH.map((mn,i)=><option key={i+1} value={i+1}>{i+1}. {mn}</option>)}
            </select>
          </div>
          <div><div style={{fontSize:9,color:'#6b7280',marginBottom:4,fontFamily:'Barlow Condensed'}}>วันที่วันนี้</div><input type="number" value={form.todayDay} min="1" max={totalDP} onChange={e=>setForm(p=>({...p,todayDay:Math.min(Number(e.target.value),totalDP)}))} style={IS}/></div>
        </div>
        <div style={{background:'#0d1117',borderRadius:6,padding:'8px 12px',marginBottom:12,fontSize:12,color:'#22c55e',fontFamily:'Barlow Condensed',fontWeight:600}}>
          Preview: {form.todayDay} {MONTHS_TH[form.month-1]} {form.year} | {totalDP} วัน | เหลือ {daysLP} วัน | {(form.todayDay/totalDP*100).toFixed(1)}%
        </div>
        <button onClick={handleSave} style={{width:'100%',padding:14,background:saved?'#166534':'#7c3aed',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:18,letterSpacing:2,transition:'all .3s'}}>
          {saved?'✅ บันทึกแล้ว — ทุกเครื่องอัพเดท!':'💾 บันทึก (ทุกเครื่องเห็นพร้อมกัน)'}
        </button>
      </div>

      {/* Quick month */}
      <div style={{background:'#131820',border:'1px solid #2d3548',borderRadius:10,padding:14}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#e5e7eb',marginBottom:10}}>⚡ เปลี่ยนเดือนด่วน</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {MONTHS_TH.map((mn,i)=>{const mo=i+1,isA=cfg.month===mo&&cfg.year===Number(form.year);return(
            <button key={mo} onClick={()=>{const nf={year:Number(form.year),month:mo,todayDay:1};setForm(nf);saveCfg(nf);setSaved(true);setTimeout(()=>setSaved(false),2000)}}
              style={{padding:'7px 11px',background:isA?'#7c3aed':'#1e2538',color:isA?'#fff':'#9ca3af',border:isA?'1px solid #a78bfa':'1px solid #2d3548',borderRadius:6,cursor:'pointer',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:12}}>
              {mo}. {mn}
            </button>
          )})}
        </div>
        <div style={{marginTop:8,fontSize:11,color:'#6b7280'}}>💡 กดเดือน → แก้วันที่ด้านบน → บันทึก</div>

        {/* Supabase setup guide */}
        <div style={{marginTop:16,background:'#0d1117',borderRadius:8,padding:14}}>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#3b82f6',marginBottom:10}}>🚀 ขั้นตอนเชื่อม Supabase (ทำครั้งเดียว)</div>
          {[
            {n:'1',t:'สร้าง Project',b:'ไปที่ supabase.com → New project → ตั้งชื่อ → Create'},
            {n:'2',t:'รัน SQL Setup',b:'SQL Editor → New query → วาง code จาก supabase_setup.sql → Run'},
            {n:'3',t:'Copy API Keys',b:'Settings → API → Copy "Project URL" และ "anon/public key"'},
            {n:'4',t:'ใส่ใน supabase.js',b:'แก้ไฟล์ src/supabase.js บน GitHub → ใส่ URL และ Key → Commit'},
          ].map(s=>(
            <div key={s.n} style={{display:'flex',gap:10,marginBottom:10}}>
              <div style={{width:22,height:22,background:'#3b82f6',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:12,color:'#fff',flexShrink:0}}>{s.n}</div>
              <div><div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{s.t}</div><div style={{fontSize:11,color:'#6b7280',lineHeight:1.5}}>{s.b}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
