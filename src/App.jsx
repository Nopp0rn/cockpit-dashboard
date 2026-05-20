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
  {key:'tire',       label:'ยาง (เส้น)',             tgt:'tire'},
  {key:'tireSales',  label:'ยอดขายยาง (฿)',          tgt:null},
  {key:'bsTire',     label:'ยาง Bridgestone (เส้น)',  tgt:null},
  {key:'alloyWheel', label:'Alloy Wheel (วง)',         tgt:null},
  {key:'battery',    label:'Battery (ลูก)',            tgt:'battery'},
  {key:'brake',      label:'Brake (ชิ้น)',             tgt:'brake'},
  {key:'shockUp',    label:'Shock Up (ชิ้น)',          tgt:'shock'},
  {key:'mp',         label:'MP (ชุด)',                 tgt:'mp'},
  {key:'lubricant',  label:'Lubricant (ลิตร)',         tgt:'lube'},
  {key:'filter',     label:'Filter (ชิ้น)',            tgt:null},
  {key:'airFilter',  label:'Air Filter (ชิ้น)',        tgt:null},
  {key:'service',    label:'Service (฿)',              tgt:null},
  {key:'jobOrder',   label:'Job Order (ราย)',          tgt:'cc'},
]
const EMPTY_ROW = () => Object.fromEntries(FIELDS.map(f=>[f.key,0]))

function sumDays(de, bid) {
  const agg = Object.fromEntries(FIELDS.map(f=>[f.key,0]))
  Object.values(de[bid]||{}).forEach(r => FIELDS.forEach(f => { agg[f.key] += parseFloat(r[f.key])||0 }))
  return agg
}
function calcTS(agg) {
  return (agg.tireSales||0)+(agg.service||0)+(agg.battery||0)*3500+(agg.brake||0)*800+(agg.shockUp||0)*800+(agg.mp||0)*2500+(agg.alloyWheel||0)*4500
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

  /* ── Load all data & subscribe to realtime changes ── */
  useEffect(() => {
    let done = 0
    const tick = () => { done++; if (done >= 3) setReady(true) }

    ;(async () => {
      try {
        const keys = ['cp_de','cp_tgt','cp_hist','cp_cfg','cp_ai','cp_fcst','cp_up']
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
          })
        }
        tick(); tick(); tick()
      } catch(e) {
        console.error('Supabase load error:', e)
        setConnErr(true)
        setReady(true)   // show app with default data even if offline
      }
    })()

    /* Realtime subscription — any change triggers state update */
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
    })

    // Fallback: show app after 3s regardless (handles Supabase pause/slow)
    const t = setTimeout(() => { setConnErr(true); setReady(true) }, 3000)
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
  const getT      = (bid) => bid==='ALL'?Object.values(TARGET).reduce((a,t)=>({sales:a.sales+t.sales,tire:a.tire+t.tire,lube:a.lube+t.lube,battery:a.battery+t.battery,brake:a.brake+t.brake,shock:a.shock+t.shock,mp:a.mp+t.mp,cc:a.cc+t.cc}),{sales:0,tire:0,lube:0,battery:0,brake:0,shock:0,mp:0,cc:0}):(TARGET[bid]||SEED_T[bid])

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
    try {
      const d = await callAI({
        model:'claude-sonnet-4-20250514', max_tokens:900,
        messages:[{role:'user', content:
          `ที่ปรึกษา Cockpit ร้านยาง\nสาขา: ${br.name} | MTD ${TODAY_D} ${MONTH_TH} ${cfg.year}\nเป้า: ${N(t.sales)}฿ | ยาง: ${t.tire} เส้น\nMTD: ${N(ts)}฿ (${P(ts,t.sales*MTD_R).toFixed(1)}%) | ยาง ${m.tire} เส้น\n2025: ${(h[2025]||[]).join(',')}\n2026 YTD: ${(h[2026]||[]).slice(0,cfg.month).join(',')}\nวิเคราะห์จุดอ่อน 3-5 ข้อ + แนวทาง ภาษาไทย`
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
          `Forecast วันที่ ${TODAY_D+1}-${TOTAL_D} (${DAYS_LEFT}ค่า)\n${s}\nJSON: {"003":{"dailyForecast":[${DAYS_LEFT}ค่า],"comment":""},...} ครบ 10 สาขา`
        }]
      })
      const p = JSON.parse(d.content[0].text.replace(/```json|```/g,'').trim())
      setFcst(p); DB.set('cp_fcst', p)
    } catch(e) { console.error('genFcst error:', e) }
    setFcstLoad(false)
  }

  const ctx = {selBr,setSelBr,de,saveDay,delDay,getMTD,getTS,getAllMTD,getAllTS,getT,getH,TARGET,HIST,aiAna,aiLoad,genPlan,fcst,fcstLoad,genFcst,upStat,setUpStat,setTARGET,setHIST,cfg,saveCfg,TODAY_D,TOTAL_D,DAYS_LEFT,MTD_R,MONTH_TH,DATE_LABEL,mobile}

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
    <div style={{fontFamily:'Barlow,sans-serif',background:'#0d1117',minHeight:'100vh',color:'#e5e7eb',paddingBottom:mobile?72:0}}>

      {/* HEADER */}
      <div style={{background:'linear-gradient(90deg,#161b25,#0d1117)',borderBottom:'2px solid #f59e0b',padding:mobile?'8px 12px':'10px 20px',display:'flex',alignItems:'center',gap:10,position:'sticky',top:0,zIndex:50}}>
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
        <div style={{display:'flex',background:'#0d1117',borderBottom:'1px solid #1e2538',overflowX:'auto'}}>
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

      {/* CONTENT */}
      <div style={{padding:mobile?'10px 10px':'18px 20px',maxWidth:1440,margin:'0 auto'}}>
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

      {/* MOBILE BOTTOM NAV */}
      {mobile && (
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#0d1117',borderTop:'1px solid #2d3548',display:'flex',overflowX:'auto',zIndex:100}}>
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
  const {getMTD,getTS,TARGET,MTD_R,TODAY_D,MONTH_TH,cfg,mobile} = ctx
  const rows = BRANCHES.map((b,i) => {
    const t=TARGET[b.id]||SEED_T[b.id], m=getMTD(b.id), ts=getTS(b.id)
    return {...b,t,m,ts,mtd:t.sales*MTD_R,py:(MAY_SALES[b.id]?.[2025]||0)*MTD_R,idx:i}
  })
  const totS=rows.reduce((s,r)=>s+r.ts,0), totT=rows.reduce((s,r)=>s+r.mtd,0)
  const totTire=rows.reduce((s,r)=>s+r.m.tire,0), totTT=rows.reduce((s,r)=>s+r.t.tire*MTD_R,0)
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
        <Card label="ยอดขายรวม MTD" value={fM(totS)} sub={`เป้า ${fM(Math.round(totT))}`}/>
        <Card label="% เทียบเป้า" value={P(totS,totT).toFixed(1)+'%'} color={P(totS,totT)>=100?'#22c55e':P(totS,totT)>=90?'#f59e0b':'#ef4444'}/>
        <Card label="ยางรวม MTD" value={N(totTire)+' เส้น'} sub={`เป้า ${N(Math.round(totTT))}`} color="#3b82f6"/>
        <Card label="% ยาง" value={P(totTire,totTT).toFixed(1)+'%'} color={P(totTire,totTT)>=100?'#22c55e':P(totTire,totTT)>=90?'#f59e0b':'#ef4444'}/>
      </div>
      {mobile ? (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {rows.map((r,i) => (
            <div key={r.id} style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:10,padding:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:14,color:BCLR[i]}}>{r.id} {r.short}</div>
                <PBadge value={P(r.ts,r.mtd)}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,fontSize:11}}>
                <div><div style={{color:'#6b7280',fontSize:9}}>ยอด MTD</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#f59e0b'}}>{fM(r.ts)}</div></div>
                <div><div style={{color:'#6b7280',fontSize:9}}>เป้า MTD</div><div style={{fontFamily:"'JetBrains Mono',monospace",color:'#6b7280'}}>{fM(Math.round(r.mtd))}</div></div>
                <div><div style={{color:'#6b7280',fontSize:9}}>ยาง/เป้า</div><div style={{fontFamily:"'JetBrains Mono',monospace",color:'#3b82f6'}}>{r.m.tire}/{Math.round(r.t.tire*MTD_R)}</div></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{background:'#161b25',borderRadius:10,border:'1px solid #2d3548',overflow:'hidden',marginBottom:16}}>
          <div style={{padding:'11px 15px',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:15,color:'#f59e0b',borderBottom:'1px solid #2d3548'}}>
            📊 ภาพรวมทุกสาขา — MTD 1-{TODAY_D} {MONTH_TH} {cfg.year}
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:'#0d1117'}}>
                {['รหัส','ชื่อสาขา','ยอด MTD','เป้า MTD','% เป้า','PY25 MTD','% vs PY','ยาง','เป้ายาง','% ยาง'].map(h=>(
                  <th key={h} style={{padding:'8px 10px',textAlign:h==='ชื่อสาขา'?'left':'center',color:'#6b7280',fontFamily:'Barlow Condensed',fontSize:11,borderBottom:'1px solid #1e2538'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((r,i) => (
                  <tr key={r.id} style={{borderBottom:'1px solid #1e2538',background:i%2===0?'transparent':'#131820'}}>
                    <td style={{padding:'8px 10px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",color:BCLR[i],fontWeight:700,fontSize:11}}>{r.id}</td>
                    <td style={{padding:'8px 10px',fontWeight:600}}>{r.name}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#f59e0b'}}>{N(r.ts)}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#6b7280'}}>{N(Math.round(r.mtd))}</td>
                    <td style={{padding:'8px 10px',textAlign:'center'}}><PBadge value={P(r.ts,r.mtd)}/></td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#6b7280'}}>{N(Math.round(r.py))}</td>
                    <td style={{padding:'8px 10px',textAlign:'center'}}><PBadge value={P(r.ts,r.py)}/></td>
                    <td style={{padding:'8px 10px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#3b82f6'}}>{r.m.tire}</td>
                    <td style={{padding:'8px 10px',textAlign:'center',color:'#6b7280'}}>{Math.round(r.t.tire*MTD_R)}</td>
                    <td style={{padding:'8px 10px',textAlign:'center'}}><PBadge value={P(r.m.tire,r.t.tire*MTD_R)}/></td>
                  </tr>
                ))}
                <tr style={{background:'#1e2538',borderTop:'2px solid #f59e0b'}}>
                  <td colSpan={2} style={{padding:'8px 10px',fontWeight:900,fontFamily:'Barlow Condensed',fontSize:13}}>รวมทุกสาขา</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:900,color:'#f59e0b'}}>{N(totS)}</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#6b7280'}}>{N(Math.round(totT))}</td>
                  <td style={{padding:'8px 10px',textAlign:'center'}}><PBadge value={P(totS,totT)}/></td>
                  <td colSpan={2}/>
                  <td style={{padding:'8px 10px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:900,color:'#3b82f6'}}>{N(totTire)}</td>
                  <td style={{padding:'8px 10px',textAlign:'center',color:'#6b7280'}}>{Math.round(totTT)}</td>
                  <td style={{padding:'8px 10px',textAlign:'center'}}><PBadge value={P(totTire,totTT)}/></td>
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
  const {selBr,setSelBr,getMTD,getTS,getAllMTD,getAllTS,getT,getH,MTD_R,TODAY_D,MONTH_TH,cfg,mobile} = ctx
  const isAll=selBr==='ALL', t=getT(selBr), m=isAll?getAllMTD():getMTD(selBr), ts=isAll?getAllTS():getTS(selBr), h=getH(selBr)
  const pyMTD  = isAll?BRANCHES.reduce((s,b)=>s+(MAY_SALES[b.id]?.[2025]||0)*MTD_R,0):(MAY_SALES[selBr]?.[2025]||0)*MTD_R
  const py2MTD = isAll?BRANCHES.reduce((s,b)=>s+(MAY_SALES[b.id]?.[2024]||0)*MTD_R,0):(MAY_SALES[selBr]?.[2024]||0)*MTD_R
  const t25    = isAll?BRANCHES.reduce((s,b)=>s+(MAY_TIRE[b.id]?.[2025]||0)*MTD_R,0):(MAY_TIRE[selBr]?.[2025]||0)*MTD_R
  const t24    = isAll?BRANCHES.reduce((s,b)=>s+(MAY_TIRE[b.id]?.[2024]||0)*MTD_R,0):(MAY_TIRE[selBr]?.[2024]||0)*MTD_R
  const mData  = MONTHS_TH.map((mn,i) => ({month:mn,2023:h[2023]?.[i]??null,2024:h[2024]?.[i]??null,2025:h[2025]?.[i]??null,2026:h[2026]?.[i]??null}))
  return (
    <div style={{display:'flex',gap:16,flexDirection:mobile?'column':'row'}}>
      <BranchSelect sel={selBr} onSel={setSelBr} mobile={mobile}/>
      <div style={{flex:1}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:20,color:'#f59e0b',letterSpacing:2,marginBottom:10}}>{isAll?'🌐 รวมทุกสาขา':`${selBr} — ${BRANCHES.find(x=>x.id===selBr)?.name}`}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
          <Card label="ยอดขาย MTD" value={fM(ts)} sub={`เป้า ${fM(Math.round(t.sales*MTD_R))}`}/>
          <Card label="% เทียบเป้า" value={P(ts,t.sales*MTD_R).toFixed(1)+'%'} color={P(ts,t.sales*MTD_R)>=100?'#22c55e':P(ts,t.sales*MTD_R)>=90?'#f59e0b':'#ef4444'}/>
          <Card label="ยาง MTD" value={N(m.tire)+' เส้น'} sub={`เป้า ${N(Math.round(t.tire*MTD_R))}`} color="#3b82f6"/>
          <Card label="vs PY May 25" value={P(ts,pyMTD).toFixed(1)+'%'} color="#94a3b8"/>
        </div>
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,padding:12,marginBottom:12}}>
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
            <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#f59e0b'}}>ยอดขายรายเดือน (฿000)</div>
            <span style={{fontSize:9,color:'#22c55e',background:'#0d2a1a',padding:'2px 6px',borderRadius:4}}>2026 = ม.ค.–{MONTH_TH} จริง</span>
          </div>
          <ResponsiveContainer width="100%" height={mobile?150:210}>
            <LineChart data={mData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/>
              <XAxis dataKey="month" tick={{fill:'#6b7280',fontSize:8}}/>
              <YAxis tick={{fill:'#6b7280',fontSize:8}}/>
              <Tooltip contentStyle={{background:'#1e2538',border:'1px solid #2d3548',fontSize:11}} formatter={v=>[v!=null?N(v*1000)+'฿':'—','']}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              {[2023,2024,2025,2026].map(yr=><Line key={yr} type="monotone" dataKey={yr} stroke={YRCLR[yr]} strokeWidth={yr===2026?3:1.5} dot={yr===2026?{r:3}:false} strokeDasharray={yr===2026?'6 3':'none'} connectNulls={false}/>)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#0d1117'}}>{['ปี','ยอด MTD','ยาง','เต็มเดือน'].map(h=><th key={h} style={{padding:'7px 10px',textAlign:h==='ปี'?'left':'right',color:'#6b7280',fontSize:10,fontFamily:'Barlow Condensed'}}>{h}</th>)}</tr></thead>
            <tbody>{[
              {yr:'2024',sm:py2MTD,tire:t24,full:isAll?BRANCHES.reduce((s,b)=>s+(MAY_SALES[b.id]?.[2024]||0),0):(MAY_SALES[selBr]?.[2024]||0)},
              {yr:'2025',sm:pyMTD,tire:t25,full:isAll?BRANCHES.reduce((s,b)=>s+(MAY_SALES[b.id]?.[2025]||0),0):(MAY_SALES[selBr]?.[2025]||0)},
              {yr:`${cfg.year} MTD`,sm:ts,tire:m.tire,full:'—',hl:true},
              {yr:`${cfg.year} เป้า`,sm:t.sales*MTD_R,tire:Math.round(t.tire*MTD_R),full:t.sales,tgt:true},
            ].map((r,i)=>(
              <tr key={i} style={{borderBottom:'1px solid #1e2538',background:r.hl?'#1e2538':r.tgt?'#131820':'transparent'}}>
                <td style={{padding:'8px 10px',fontWeight:700,color:r.hl?'#f59e0b':r.tgt?'#a78bfa':'#9ca3af',fontSize:12}}>{r.yr}</td>
                <td style={{padding:'8px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:r.hl?'#f59e0b':'#e5e7eb',fontSize:12}}>{N(Math.round(r.sm))}</td>
                <td style={{padding:'8px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:r.hl?'#3b82f6':'#9ca3af',fontSize:12}}>{Math.round(r.tire)}</td>
                <td style={{padding:'8px 10px',textAlign:'right',color:'#6b7280',fontSize:11}}>{typeof r.full==='number'?fM(r.full):r.full}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ════ PRODUCTS ════ */
function Products({ctx}) {
  const {selBr,setSelBr,getMTD,getAllMTD,getT,MTD_R,mobile} = ctx
  const isAll=selBr==='ALL', m=isAll?getAllMTD():getMTD(selBr), t=getT(selBr)
  const rows=[{label:'ยาง (เส้น)',a:m.tire,tgt:Math.round(t.tire*MTD_R)},{label:'ยอดขายยาง (฿)',a:m.tireSales,tgt:Math.round(t.sales*.55*MTD_R)},{label:'ยาง Bridgestone',a:m.bsTire,tgt:Math.round(t.tire*.35*MTD_R)},{label:'Alloy Wheel (วง)',a:m.alloyWheel,tgt:Math.round(10*MTD_R*(isAll?10:1))},{label:'Battery (ลูก)',a:m.battery,tgt:Math.round(t.battery*MTD_R)},{label:'Brake (ชิ้น)',a:m.brake,tgt:Math.round(t.brake*MTD_R)},{label:'Shock Up (ชิ้น)',a:m.shockUp,tgt:Math.round(t.shock*MTD_R)},{label:'MP (ชุด)',a:m.mp,tgt:Math.round(t.mp*MTD_R)},{label:'Lubricant (ลิตร)',a:m.lubricant,tgt:Math.round(t.lube*MTD_R)},{label:'Filter (ชิ้น)',a:m.filter,tgt:Math.round(t.lube*.2*MTD_R)},{label:'Air Filter (ชิ้น)',a:m.airFilter,tgt:Math.round(t.lube*.15*MTD_R)},{label:'Service (฿)',a:m.service,tgt:Math.round(t.sales*.05*MTD_R)},{label:'Job Order (ราย)',a:m.jobOrder,tgt:Math.round(t.cc*MTD_R)}]
  return (
    <div style={{display:'flex',gap:16,flexDirection:mobile?'column':'row'}}>
      <BranchSelect sel={selBr} onSel={setSelBr} mobile={mobile}/>
      <div style={{flex:1}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:20,color:'#f59e0b',letterSpacing:2,marginBottom:10}}>สินค้า MTD — {isAll?'รวมทุกสาขา':BRANCHES.find(x=>x.id===selBr)?.name}</div>
        {mobile ? (
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {rows.map((r,i) => { const p=P(r.a,r.tgt); return (
              <div key={i} style={{background:i%2===0?'#161b25':'#131820',border:'1px solid #2d3548',borderRadius:8,padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><div style={{fontSize:13,fontWeight:600}}>{r.label}</div><div style={{fontSize:10,color:'#6b7280'}}>เป้า {N(r.tgt)}</div></div>
                <div style={{textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:16,color:'#f59e0b'}}>{N(r.a)}</div>
                  <PBadge value={p}/>
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'#0d1117'}}>{['สินค้า','ยอดจริง','เป้า MTD','%','สถานะ'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:h==='สินค้า'?'left':'center',color:'#6b7280',fontSize:11,fontFamily:'Barlow Condensed',borderBottom:'1px solid #1e2538'}}>{h}</th>)}</tr></thead>
              <tbody>{rows.map((r,i) => { const p=P(r.a,r.tgt); return (
                <tr key={i} style={{borderBottom:'1px solid #1e2538',background:i%2===0?'transparent':'#131820'}}>
                  <td style={{padding:'9px 14px',fontWeight:600,fontSize:13}}>{r.label}</td>
                  <td style={{padding:'9px 14px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#f59e0b'}}>{N(r.a)}</td>
                  <td style={{padding:'9px 14px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#6b7280'}}>{N(r.tgt)}</td>
                  <td style={{padding:'9px 14px',textAlign:'center'}}><PBadge value={p}/></td>
                  <td style={{padding:'9px 14px',textAlign:'center',fontSize:15}}>{p>=100?'✅':p>=90?'⚠️':'❌'}</td>
                </tr>
              )})}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ════ DAILY ════ */
function Daily({ctx}) {
  const {selBr,setSelBr,getTS,getAllTS,getT,fcst,fcstLoad,genFcst,TODAY_D,TOTAL_D,DAYS_LEFT,MTD_R,mobile} = ctx
  const isAll=selBr==='ALL', t=getT(selBr), ts=isAll?getAllTS():getTS(selBr)
  const pyF=isAll?BRANCHES.reduce((s,b)=>s+(MAY_SALES[b.id]?.[2025]||0),0):(MAY_SALES[selBr]?.[2025]||0)
  const avg=TODAY_D>0?ts/TODAY_D:0
  const fArr=(!isAll&&fcst[selBr]?.dailyForecast)||[]
  const data=Array.from({length:TOTAL_D},(_,i)=>{const d=i+1;const row={day:`${d}`};if(d<=TODAY_D)row['ยอดจริง']=Math.round(avg*(0.85+Math.sin(i*.5)*.3));if(d>TODAY_D)row['Forecast']=fArr[i-TODAY_D]||Math.round(avg*1.05);return row})
  return (
    <div style={{display:'flex',gap:16,flexDirection:mobile?'column':'row'}}>
      <BranchSelect sel={selBr} onSel={setSelBr} mobile={mobile}/>
      <div style={{flex:1}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:20,color:'#f59e0b'}}>รายวัน — {isAll?'รวม':BRANCHES.find(x=>x.id===selBr)?.short}</div>
          <button onClick={genFcst} disabled={fcstLoad} style={{padding:'8px 16px',background:fcstLoad?'#1e2538':'#7c3aed',color:'#fff',border:'none',borderRadius:6,cursor:fcstLoad?'wait':'pointer',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:12,width:mobile?'100%':'auto'}}>{fcstLoad?'⏳ AI คำนวณ...':'🤖 AI Forecast'}</button>
        </div>
        {!isAll&&fcst[selBr]&&<div style={{background:'#1a1333',border:'1px solid #7c3aed',borderRadius:6,padding:'8px 12px',marginBottom:10,fontSize:11,color:'#c4b5fd'}}>🤖 {fcst[selBr].comment}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
          <Card label="เฉลี่ย/วัน" value={fM(Math.round(avg))} color="#f59e0b" small/>
          <Card label="เป้า/วัน" value={fM(Math.round(t.sales/TOTAL_D))} color="#a78bfa" small/>
          <Card label="PY25/วัน" value={fM(Math.round(pyF/TOTAL_D))} color="#94a3b8" small/>
          <Card label="ต้องทำ/วัน" value={fM(Math.round(Math.max(0,t.sales-ts)/DAYS_LEFT))} color="#ef4444" small/>
        </div>
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,padding:12}}>
          <ResponsiveContainer width="100%" height={mobile?170:250}>
            <BarChart data={data} margin={{top:0,right:4,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/>
              <XAxis dataKey="day" tick={{fill:'#6b7280',fontSize:7}}/>
              <YAxis tick={{fill:'#6b7280',fontSize:8}} tickFormatter={v=>(v/1000).toFixed(0)+'k'}/>
              <Tooltip contentStyle={{background:'#1e2538',border:'1px solid #2d3548',fontSize:11}} formatter={v=>[N(v)+'฿','']}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              <ReferenceLine y={t.sales/TOTAL_D} stroke="#a78bfa" strokeDasharray="4 2"/>
              <Bar dataKey="ยอดจริง" fill="#f59e0b" radius={[2,2,0,0]}/>
              <Bar dataKey="Forecast" fill="#ef444488" radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ════ MONTHLY ════ */
function Monthly({ctx}) {
  const {selBr,setSelBr,getH,mobile} = ctx
  const isAll=selBr==='ALL', h=getH(selBr)
  const data=MONTHS_TH.map((mn,i)=>({month:mn,2023:h[2023]?.[i]??null,2024:h[2024]?.[i]??null,2025:h[2025]?.[i]??null,2026:h[2026]?.[i]??null}))
  const tData=MONTHS_TH.map((mn,i)=>({month:mn,'ยาง 2024':isAll?BRANCHES.reduce((s,b)=>s+(SEED_TIREQ[b.id]?.[2024]?.[i]||0),0):SEED_TIREQ[selBr]?.[2024]?.[i]||0,'ยาง 2025':isAll?BRANCHES.reduce((s,b)=>s+(SEED_TIREQ[b.id]?.[2025]?.[i]||0),0):SEED_TIREQ[selBr]?.[2025]?.[i]||0}))
  return (
    <div style={{display:'flex',gap:16,flexDirection:mobile?'column':'row'}}>
      <BranchSelect sel={selBr} onSel={setSelBr} mobile={mobile}/>
      <div style={{flex:1}}>
        <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:20,color:'#f59e0b',letterSpacing:2,marginBottom:12}}>รายเดือน — {isAll?'รวมทุกสาขา':BRANCHES.find(x=>x.id===selBr)?.name}</div>
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,padding:12,marginBottom:12}}>
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}><div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#f59e0b'}}>ยอดขายรายเดือน (฿000) 2023–2026</div><span style={{fontSize:9,color:'#22c55e',background:'#0d2a1a',padding:'2px 6px',borderRadius:4}}>2026 รวม MTD</span></div>
          <ResponsiveContainer width="100%" height={mobile?150:240}>
            <LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/><XAxis dataKey="month" tick={{fill:'#6b7280',fontSize:8}}/><YAxis tick={{fill:'#6b7280',fontSize:8}}/><Tooltip contentStyle={{background:'#1e2538',border:'1px solid #2d3548',fontSize:11}} formatter={v=>[v!=null?N(v*1000)+'฿':'—','']}/><Legend wrapperStyle={{fontSize:9}}/>{[2023,2024,2025,2026].map(yr=><Line key={yr} type="monotone" dataKey={yr} stroke={YRCLR[yr]} strokeWidth={yr===2026?3:1.5} dot={yr===2026?{r:3}:false} strokeDasharray={yr===2026?'6 3':'none'} connectNulls={false}/>)}</LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:8,padding:12}}>
          <div style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#3b82f6',marginBottom:8}}>ยาง (เส้น) — 2024 vs 2025</div>
          <ResponsiveContainer width="100%" height={mobile?130:180}><BarChart data={tData}><CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/><XAxis dataKey="month" tick={{fill:'#6b7280',fontSize:8}}/><YAxis tick={{fill:'#6b7280',fontSize:8}}/><Tooltip contentStyle={{background:'#1e2538',border:'1px solid #2d3548',fontSize:11}}/><Legend wrapperStyle={{fontSize:9}}/><Bar dataKey="ยาง 2024" fill="#475569" radius={[2,2,0,0]}/><Bar dataKey="ยาง 2025" fill="#3b82f6" radius={[2,2,0,0]}/></BarChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ════ TRACKER ════ */
function Tracker({ctx}) {
  const {getMTD,getTS,getT,fcst,MTD_R,TODAY_D,DAYS_LEFT,MONTH_TH,cfg,mobile} = ctx
  const rows=BRANCHES.map((b,i)=>{const t=getT(b.id),m=getMTD(b.id),ts=getTS(b.id),dT=Math.round(Math.max(0,t.sales-ts)/DAYS_LEFT),fT=fcst[b.id]?.dailyForecast?.[0]||Math.round(t.sales/31);return{...b,t,m,ts,dT,fT,diff:fT-dT,idx:i}})
  const totS=rows.reduce((s,r)=>s+r.ts,0),totT=rows.reduce((s,r)=>s+r.t.sales*MTD_R,0)
  const totTire=rows.reduce((s,r)=>s+r.m.tire,0),totTT=rows.reduce((s,r)=>s+r.t.tire*MTD_R,0)
  return (
    <div>
      <div style={{fontFamily:'Barlow Condensed',fontWeight:900,fontSize:mobile?16:22,color:'#f59e0b',letterSpacing:2,marginBottom:12}}>🎯 TRACKER — {TODAY_D} {MONTH_TH} {cfg.year}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
        <Card label="ยอด MTD รวม" value={fM(totS)} sub={`เป้า ${fM(Math.round(totT))}`}/>
        <Card label="% เป้า" value={P(totS,totT).toFixed(1)+'%'} color={P(totS,totT)>=90?'#22c55e':'#ef4444'}/>
        <Card label="ยางรวม" value={N(totTire)+' เส้น'} sub={`เป้า ${N(Math.round(totTT))}`} color="#3b82f6"/>
        <Card label="% ยาง" value={P(totTire,totTT).toFixed(1)+'%'} color={P(totTire,totTT)>=90?'#22c55e':'#ef4444'}/>
      </div>
      {mobile ? (
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {rows.map((r,i)=>(
            <div key={r.id} style={{background:'#161b25',border:'1px solid #2d3548',borderRadius:10,padding:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontFamily:'Barlow Condensed',fontWeight:700,fontSize:14,color:BCLR[i]}}>{r.id} {r.short}</span>
                <PBadge value={P(r.ts,r.t.sales*MTD_R)}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,fontSize:11}}>
                <div><div style={{color:'#6b7280',fontSize:9}}>MTD</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#f59e0b'}}>{fM(r.ts)}</div></div>
                <div><div style={{color:'#6b7280',fontSize:9}}>เป้า/วัน</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#a78bfa'}}>{fM(r.dT)}</div></div>
                <div><div style={{color:'#6b7280',fontSize:9}}>ยาง/เป้า</div><div style={{fontFamily:"'JetBrains Mono',monospace",color:'#3b82f6'}}>{r.m.tire}/{Math.round(r.t.tire*MTD_R)}</div></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{background:'#161b25',borderRadius:10,border:'1px solid #2d3548',overflow:'auto'}}>
          <div style={{padding:'10px 14px',fontFamily:'Barlow Condensed',fontWeight:700,fontSize:13,color:'#f59e0b',borderBottom:'1px solid #2d3548'}}>เป้าวันที่เหลือ = (เป้า − MTD) ÷ {DAYS_LEFT} วัน</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:'#0d1117'}}>{['สาขา','ยอด MTD','เป้า MTD','% เป้า','ยาง','% ยาง','เป้า/วัน','AI Fcst','Diff'].map(h=><th key={h} style={{padding:'7px 10px',textAlign:'center',color:'#6b7280',fontSize:11,fontFamily:'Barlow Condensed',borderBottom:'1px solid #1e2538'}}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:'1px solid #1e2538',background:i%2===0?'transparent':'#131820'}}>
                <td style={{padding:'7px 10px',fontWeight:600,color:BCLR[r.idx],fontSize:11}}>{r.short}</td>
                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#f59e0b'}}>{N(r.ts)}</td>
                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#6b7280'}}>{N(Math.round(r.t.sales*MTD_R))}</td>
                <td style={{padding:'7px 10px',textAlign:'center'}}><PBadge value={P(r.ts,r.t.sales*MTD_R)}/></td>
                <td style={{padding:'7px 10px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#3b82f6'}}>{r.m.tire}</td>
                <td style={{padding:'7px 10px',textAlign:'center'}}><PBadge value={P(r.m.tire,r.t.tire*MTD_R)}/></td>
                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:'#a78bfa'}}>{N(r.dT)}</td>
                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:"'JetBrains Mono',monospace",color:'#ef4444'}}>{N(r.fT)}</td>
                <td style={{padding:'7px 10px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:r.diff>=0?'#22c55e':'#ef4444'}}>{r.diff>=0?'+':''}{N(Math.round(r.diff))}</td>
              </tr>
            ))}</tbody>
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
            {FIELDS.map((f,i)=>{const tV=f.tgt?(t[f.tgt]||0):0;return(
              <div key={f.key} style={{padding:'10px 12px',borderBottom:'1px solid #1e2538',borderRight:(!mobile&&i%2===0)?'1px solid #1e2538':'none',background:i%4<2?'transparent':'#0d1117'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <label style={{fontSize:12,fontWeight:600,color:'#9ca3af'}}>{f.label}</label>
                  {tV>0&&<span style={{fontSize:9,color:'#4b5563'}}>เป้า/วัน≈{Math.round(tV/TOTAL_D)}</span>}
                </div>
                <input type="number" inputMode="numeric" value={row[f.key]||''} placeholder="0"
                  onChange={e=>saveDay(selBr,selDay,f.key,e.target.value)}
                  style={{width:'100%',boxSizing:'border-box',background:'#0d1117',border:'1px solid #2d3548',borderRadius:5,padding:mobile?'10px 12px':'7px 10px',color:'#f59e0b',fontFamily:"'JetBrains Mono',monospace",fontSize:mobile?18:15,fontWeight:700,outline:'none'}}/>
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
                <thead><tr style={{background:'#0d1117'}}>{['วัน','ยาง','ยอดยาง','Battery','Brake','MP','Job',''].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'center',color:'#6b7280',fontSize:10,fontFamily:'Barlow Condensed',borderBottom:'1px solid #1e2538',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
                <tbody>{filled.map((d,i)=>{const r=de[selBr][d]||{};return(
                  <tr key={d} onClick={()=>setSelDay(d)} style={{borderBottom:'1px solid #1e2538',background:d===selDay?'#1e2538':i%2===0?'transparent':'#131820',cursor:'pointer'}}>
                    <td style={{padding:'6px 8px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:d===selDay?'#f59e0b':'#e5e7eb'}}>{d} {MONTH_TH}</td>
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
    hint:'Sheet: ยอดขายรายวัน'
  },
  {
    key:'tiredaily',
    label:'ยอดขายยางรายวัน.xlsx',
    icon:'🛞',
    hint:'Sheet: ยอดขายยางรายวัน'
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

        const { histOut, parsed } = parseSalesData(wb)

        setHIST(prev => {
          const n = { ...prev }
          Object.entries(histOut).forEach(([bid, years]) => {
            n[bid] = { ...(n[bid] || {}), ...years }
          })
          DB.set('cp_hist', n)
          return n
        })

        // Show parsed summary in status
        const summary = parsed.map(p =>
          `${p.bid}: ฿${p.sales}K | ยาง ${p.tire} เส้น | Job ${p.job}`
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
        // History parse placeholder - keeps existing HIST data
        // Full parser can be added later from Excel structure
        console.log('History file received:', file.name, '— keeping existing data')
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
