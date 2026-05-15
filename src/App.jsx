import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

const _fl = document.createElement("link");
_fl.rel = "stylesheet";
_fl.href = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=JetBrains+Mono:wght@400;600;700&family=Barlow:wght@400;500;600&display=swap";
document.head.appendChild(_fl);

/* ─── localStorage wrapper (ใช้แทน window.storage) ─── */
const LS = {
  get: (key) => { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(key, val); } catch(e) { console.warn("localStorage full:", e); } },
};

/* ─── BRANCHES ─── */
const BRANCHES = [
  { id:"003", name:"Cockpit Srinakarin",          short:"003 ศรีนครินทร์"    },
  { id:"009", name:"Cockpit Nakorn Ratchasima",   short:"009 นครราชสีมา"    },
  { id:"010", name:"Cockpit Udonthani",            short:"010 อุดรธานี"      },
  { id:"012", name:"Cockpit Khonkaen",             short:"012 ขอนแก่น"      },
  { id:"014", name:"Cockpit Ubolratchathani",      short:"014 อุบลราชธานี"  },
  { id:"048", name:"Cockpit Surin",                short:"048 สุรินทร์"      },
  { id:"050", name:"Cockpit Lopburi",              short:"050 ลพบุรี"        },
  { id:"096", name:"Cockpit Nakorn Ratchasima 2",  short:"096 นครราชสีมา2"  },
  { id:"107", name:"Cockpit By Pass Udonthani",    short:"107 Bypass อุดรฯ" },
  { id:"143", name:"Cockpit Samut Prakarn",        short:"143 สมุทรปราการ"  },
];

/* ─── TARGETS May 2026 ─── */
const SEED_T = {
  "003":{ sales:2553704,tire:400,lube:650, battery:43,brake:36,shock:33,mp:150,cc:790  },
  "009":{ sales:2455797,tire:430,lube:514, battery:25,brake:37,shock:34,mp:154,cc:728  },
  "010":{ sales:2353415,tire:380,lube:447, battery:36,brake:34,shock:31,mp:142,cc:760  },
  "012":{ sales:2502610,tire:420,lube:862, battery:45,brake:37,shock:34,mp:155,cc:919  },
  "014":{ sales:2516970,tire:420,lube:726, battery:42,brake:38,shock:34,mp:156,cc:739  },
  "048":{ sales:1613513,tire:290,lube:273, battery:30,brake:26,shock:24,mp:107,cc:583  },
  "050":{ sales:2100540,tire:400,lube:726, battery:21,brake:35,shock:32,mp:146,cc:458  },
  "096":{ sales:1618298,tire:270,lube:301, battery:21,brake:24,shock:21,mp:98, cc:330  },
  "107":{ sales:1517936,tire:250,lube:344, battery:27,brake:23,shock:20,mp:92, cc:377  },
  "143":{ sales:903980, tire:150,lube:120, battery:10,brake:12,shock:11,mp:55, cc:200  },
};

/* ─── HISTORY ฿000 null = no data ─── */
const SEED_H = {
  "003":{ 2023:[2969,2212,2940,2555,2383,2419,2637,2271,2423,2551,2210,3240],2024:[3031,3082,2272,2313,2327,2219,2650,2400,2031,3198,2378,2878],2025:[2599,3142,2232,2680,2626,2363,3135,2710,2596,2917,2907,4215],2026:[3037,2405,2970,2580,null,null,null,null,null,null,null,null] },
  "009":{ 2023:[2235,1790,1586,1764,1369,1568,1824,1488,1021,1165,2163,1672],2024:[1786,1696,1773,1863,1741,1719,1855,1843,1741,2012,1569,2276],2025:[2071,2179,1798,1935,1891,1875,2093,2444,2343,2440,1940,2300],2026:[2134,2085,2529,2410,null,null,null,null,null,null,null,null] },
  "010":{ 2023:[2468,2209,2460,2675,2356,2374,2462,2111,2009,2335,1823,2433],2024:[2328,2429,2149,2262,2320,1955,2382,1909,1256,2253,1646,2270],2025:[2338,2199,2028,2191,2142,2126,2488,2458,2357,2639,2056,2636],2026:[2430,1890,2460,2258,null,null,null,null,null,null,null,null] },
  "012":{ 2023:[2121,1680,1922,1903,1660,2037,1868,1880,1583,1352,1805,2019],2024:[2056,1979,1703,1881,1948,2157,2038,1866,2014,2216,2342,2444],2025:[2269,1869,1955,2100,1831,2251,2013,2300,2434,2164,1996,2664],2026:[2518,2209,2718,2464,null,null,null,null,null,null,null,null] },
  "014":{ 2023:[2009,2048,2043,1755,2026,1678,2052,1619,1613,1948,1895,2265],2024:[2250,2136,1643,2047,2001,1988,2156,1621,1227,1910,1803,2016],2025:[2335,2045,2239,2136,1985,1923,2300,2081,2268,2878,2333,2693],2026:[2430,2272,2362,2501,null,null,null,null,null,null,null,null] },
  "048":{ 2023:[1335,1260,1197,1184,1066,1019,1178,1170,982,1238,984,1273],  2024:[1358,1165,1076,1066,1166,1054,1161,1339,1113,1270,1220,1647],2025:[1562,1138,1099,1527,1384,1334,1375,1428,1375,1726,1452,1505],2026:[1554,1373,1737,1788,null,null,null,null,null,null,null,null] },
  "050":{ 2023:[1268,1326,1119,1008,932,1117,1102,1026,987,1079,868,1480],   2024:[1471,1477,1140,1191,1158,1526,1124,1088,1069,1132,1017,1718],2025:[1266,1376,1416,1366,1210,1446,1982,1698,1713,1844,1713,2259],2026:[2202,1973,2527,2530,null,null,null,null,null,null,null,null] },
  "096":{ 2023:[1330,1036,1346,1211,1214,987,1293,1069,1085,1068,1059,1149], 2024:[1429,1416,1217,1027,1210,1082,1300,1346,1252,1643,1452,1303],2025:[1849,1757,1496,1802,1733,1556,1682,1433,1443,1535,1241,1581],2026:[1589,1470,1713,1533,null,null,null,null,null,null,null,null] },
  "107":{ 2023:[1223,939,1234,1560,1131,1427,1455,1262,1134,1517,1104,1333], 2024:[1267,1401,1076,1564,1396,1352,1457,1433,1305,1477,983,1058], 2025:[1184,1522,1322,1242,1538,1292,1520,1472,1299,1374,1536,1643],2026:[1745,1440,1450,1624,null,null,null,null,null,null,null,null] },
  "143":{ 2023:[1376,1042,992,1033,561,1009,1191,744,868,927,1137,1450],     2024:[1447,1265,1047,1110,1060,866,1018,805,594,702,586,857],      2025:[930,819,864,864,864,864,864,864,864,864,864,864],           2026:[null,null,null,987,null,null,null,null,null,null,null,null] },
};

const SEED_TIREQ = {
  "003":{ 2024:[310,295,270,290,258,270,300,275,250,330,290,380],2025:[340,380,310,340,301,310,355,320,305,375,340,450] },
  "009":{ 2024:[442,400,432,465,347,420,476,425,430,504,392,567],2025:[519,545,449,484,329,469,523,611,576,610,485,575] },
  "010":{ 2024:[545,560,502,528,425,442,561,446,293,526,384,531],2025:[546,514,473,511,374,496,581,574,550,616,480,615] },
  "012":{ 2024:[508,489,421,465,359,533,504,461,497,548,578,603],2025:[560,462,483,519,316,556,497,568,601,535,494,658] },
  "014":{ 2024:[556,528,407,506,359,490,533,401,303,472,446,499],2025:[578,506,554,528,342,475,569,515,561,712,577,666] },
  "048":{ 2024:[249,213,197,195,200,193,213,245,204,233,224,302],2025:[286,208,201,279,258,244,251,261,252,315,266,275] },
  "050":{ 2024:[215,220,200,215,232,255,220,210,200,225,200,310],2025:[245,255,260,255,273,290,370,335,320,360,325,420] },
  "096":{ 2024:[248,246,211,178,210,188,226,234,217,285,252,226],2025:[321,305,260,313,270,270,292,249,251,267,215,274] },
  "107":{ 2024:[219,243,187,271,214,234,253,249,227,256,171,184],2025:[205,264,229,215,241,224,264,256,225,238,266,285] },
  "143":{ 2024:[200,185,175,185,166,155,175,150,110,130,110,155],2025:[175,165,180,180,235,195,190,185,185,190,185,230] },
};

const MAY_TIRE={ "003":{2024:258,2025:301},"009":{2024:347,2025:329},"010":{2024:425,2025:374},"012":{2024:359,2025:316},"014":{2024:359,2025:342},"048":{2024:200,2025:258},"050":{2024:232,2025:273},"096":{2024:210,2025:270},"107":{2024:214,2025:241},"143":{2024:166,2025:235} };
const MAY_SALES={ "003":{2024:2342613,2025:2636276},"009":{2024:1752367,2025:1902681},"010":{2024:2335800,2025:2154803},"012":{2024:1963187,2025:1843356},"014":{2024:2010373,2025:1998710},"048":{2024:1171076,2025:1390155},"050":{2024:1167049,2025:1218827},"096":{2024:1210000,2025:1733000},"107":{2024:1403859,2025:1543090},"143":{2024:1055953,2025:1639561} };

const MONTHS_TH=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const BCLR=["#f59e0b","#3b82f6","#10b981","#ef4444","#8b5cf6","#f97316","#06b6d4","#e11d48","#84cc16","#ec4899"];
const YRCLR={ 2023:"#475569",2024:"#94a3b8",2025:"#f59e0b",2026:"#22c55e" };
const TODAY_D=15,TOTAL_D=31,DAYS_LEFT=16,MTD_R=15/31;

const N=(n,d=0)=>Number(n||0).toLocaleString("th-TH",{minimumFractionDigits:d,maximumFractionDigits:d});
const fM=(n)=>n>=1e6?(n/1e6).toFixed(2)+"M":n>=1e3?(n/1e3).toFixed(0)+"K":N(n);
const P=(a,b)=>b?(a/b)*100:0;

function PBadge({value}){
  const v=parseFloat(value)||0;
  const bg=v>=100?"#166534":v>=90?"#92400e":"#991b1b";
  const tx=v>=100?"#bbf7d0":v>=90?"#fef3c7":"#fecaca";
  return <span style={{background:bg,color:tx,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{v.toFixed(1)}%</span>;
}
function Card({label,value,sub,color="#f59e0b",small}){
  return(
    <div style={{background:"#1e2538",border:"1px solid #2d3548",borderRadius:8,padding:"12px 14px"}}>
      <div style={{fontSize:10,color:"#6b7280",textTransform:"uppercase",letterSpacing:1,marginBottom:3,fontFamily:"Barlow Condensed"}}>{label}</div>
      <div style={{fontSize:small?18:22,fontWeight:700,color,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#6b7280",marginTop:3}}>{sub}</div>}
    </div>
  );
}
function BSidebar({sel,onSel,showAll=true}){
  return(
    <div style={{width:165,flexShrink:0}}>
      <div style={{fontSize:10,color:"#6b7280",textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontFamily:"Barlow Condensed"}}>เลือกสาขา</div>
      {showAll&&<>
        <button onClick={()=>onSel("ALL")} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 10px",marginBottom:5,borderRadius:6,cursor:"pointer",fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13,background:sel==="ALL"?"#1e2538":"transparent",border:sel==="ALL"?"1px solid #f59e0b":"1px solid #2d3548",color:sel==="ALL"?"#f59e0b":"#9ca3af"}}>
          <span style={{marginRight:6}}>🌐</span>รวมทุกสาขา
        </button>
        <div style={{borderBottom:"1px solid #2d3548",marginBottom:5}}/>
      </>}
      {BRANCHES.map((b,i)=>(
        <button key={b.id} onClick={()=>onSel(b.id)} style={{display:"block",width:"100%",textAlign:"left",padding:"7px 10px",marginBottom:3,borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"Barlow",background:sel===b.id?"#1e2538":"transparent",border:sel===b.id?"1px solid "+BCLR[i]:"1px solid transparent",color:sel===b.id?BCLR[i]:"#9ca3af",transition:"all .15s"}}>
          {b.short}
        </button>
      ))}
    </div>
  );
}

const FIELDS=[
  {key:"tire",      label:"ยาง (เส้น)",             tgt:"tire"},
  {key:"tireSales", label:"ยอดขายยาง (฿)",          tgt:null},
  {key:"bsTire",    label:"ยาง Bridgestone (เส้น)",  tgt:null},
  {key:"alloyWheel",label:"Alloy Wheel (วง)",         tgt:null},
  {key:"battery",   label:"Battery (ลูก)",            tgt:"battery"},
  {key:"brake",     label:"Brake (ชิ้น)",             tgt:"brake"},
  {key:"shockUp",   label:"Shock Up (ชิ้น)",          tgt:"shock"},
  {key:"mp",        label:"MP (ชุด)",                 tgt:"mp"},
  {key:"lubricant", label:"Lubricant (ลิตร)",         tgt:"lube"},
  {key:"filter",    label:"Filter (ชิ้น)",            tgt:null},
  {key:"airFilter", label:"Air Filter (ชิ้น)",        tgt:null},
  {key:"service",   label:"Service (฿)",              tgt:null},
  {key:"jobOrder",  label:"Job Order (ราย)",          tgt:"cc"},
];
const EMPTY_ROW=()=>Object.fromEntries(FIELDS.map(f=>[f.key,""]));
function sumDays(de,bid){const agg=Object.fromEntries(FIELDS.map(f=>[f.key,0]));Object.values(de[bid]||{}).forEach(r=>FIELDS.forEach(f=>{agg[f.key]+=parseFloat(r[f.key])||0;}));return agg;}
function calcTS(agg){return(agg.tireSales||0)+(agg.service||0)+(agg.battery||0)*3500+(agg.brake||0)*800+(agg.shockUp||0)*800+(agg.mp||0)*2500+(agg.alloyWheel||0)*4500;}

/* ═══════════════════════════════════ ROOT ═══════════════════════════════════ */
const TABS=[
  {id:"overview",label:"🏠 ภาพรวม"},{id:"mtd",label:"📊 MTD"},{id:"products",label:"🛍 สินค้า"},
  {id:"daily",label:"📅 รายวัน"},{id:"monthly",label:"📈 รายเดือน"},{id:"tracker",label:"🎯 DailyTracker"},
  {id:"asp",label:"💰 ASP & SPD"},{id:"plan",label:"🤖 แผนการขาย"},{id:"entry",label:"✏️ กรอกยอด"},
  {id:"upload",label:"📁 อัพโหลด Excel"},
];

export default function App(){
  const [tab,setTab]=useState("overview");
  const [selBr,setSelBr]=useState("ALL");
  const [de,setDe]=useState(()=>{
    const r=LS.get("cp_de");return r?JSON.parse(r.value):Object.fromEntries(BRANCHES.map(b=>[b.id,{}]));
  });
  const [TARGET,setTARGET]=useState(()=>{const r=LS.get("cp_tgt");return r?JSON.parse(r.value):SEED_T;});
  const [HIST,setHIST]=useState(()=>{const r=LS.get("cp_hist");return r?JSON.parse(r.value):SEED_H;});
  const [upStat,setUpStat]=useState(()=>{const r=LS.get("cp_up");return r?JSON.parse(r.value):{};});
  const [aiAna,setAiAna]=useState(()=>{const r=LS.get("cp_ai");return r?JSON.parse(r.value):{};});
  const [aiLoad,setAiLoad]=useState({});
  const [fcst,setFcst]=useState(()=>{const r=LS.get("cp_fcst");return r?JSON.parse(r.value):{};});
  const [fcstLoad,setFcstLoad]=useState(false);

  const saveDay=useCallback((bid,day,field,val)=>{
    setDe(prev=>{const next={...prev,[bid]:{...prev[bid],[day]:{...(prev[bid]?.[day]||EMPTY_ROW()),[field]:val}}};LS.set("cp_de",JSON.stringify(next));return next;});
  },[]);
  const delDay=useCallback((bid,day)=>{
    setDe(prev=>{const b={...prev[bid]};delete b[day];const next={...prev,[bid]:b};LS.set("cp_de",JSON.stringify(next));return next;});
  },[]);

  const getMTD=(bid)=>sumDays(de,bid);
  const getTS=(bid)=>calcTS(getMTD(bid));
  const getAllMTD=()=>{const agg=Object.fromEntries(FIELDS.map(f=>[f.key,0]));BRANCHES.forEach(b=>{const m=getMTD(b.id);FIELDS.forEach(f=>{agg[f.key]+=m[f.key];});});return agg;};
  const getAllTS=()=>BRANCHES.reduce((s,b)=>s+getTS(b.id),0);
  const getT=(bid)=>bid==="ALL"?Object.values(TARGET).reduce((a,t)=>({sales:a.sales+t.sales,tire:a.tire+t.tire,lube:a.lube+t.lube,battery:a.battery+t.battery,brake:a.brake+t.brake,shock:a.shock+t.shock,mp:a.mp+t.mp,cc:a.cc+t.cc}),{sales:0,tire:0,lube:0,battery:0,brake:0,shock:0,mp:0,cc:0}):(TARGET[bid]||SEED_T[bid]);
  const getH26=(bid)=>{const base=[...((bid==="ALL"?Array(12).fill(null).map((_,i)=>BRANCHES.reduce((s,b)=>{const v=HIST[b.id]?.[2026]?.[i];return s+(v!=null?v:0);},0)):HIST[bid]?.[2026])||Array(12).fill(null))];const mayV=bid==="ALL"?getAllTS():getTS(bid);if(mayV>0)base[4]=Math.round(mayV/1000);return base;};
  const getH=(bid)=>{if(bid==="ALL"){const h={};[2023,2024,2025].forEach(yr=>{h[yr]=Array(12).fill(0).map((_,i)=>BRANCHES.reduce((s,b)=>s+(HIST[b.id]?.[yr]?.[i]||0),0));});h[2026]=getH26("ALL");return h;}return{...(HIST[bid]||{}),2026:getH26(bid)};};

  const genPlan=async(bid)=>{
    setAiLoad(p=>({...p,[bid]:true}));
    const br=bid==="ALL"?{name:"รวมทุกสาขา"}:BRANCHES.find(x=>x.id===bid);
    const t=getT(bid);const m=bid==="ALL"?getAllMTD():getMTD(bid);const ts=bid==="ALL"?getAllTS():getTS(bid);const h=getH(bid);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,messages:[{role:"user",content:`ที่ปรึกษาธุรกิจ Cockpit ร้านยางรถยนต์\nสาขา: ${br.name} | MTD ${TODAY_D} พ.ค. 2026\nเป้าเดือน: ${N(t.sales)}฿ | ยาง: ${t.tire} เส้น\nเป้า MTD: ${N(Math.round(t.sales*MTD_R))}฿\nยอด MTD: ${N(ts)}฿ (${P(ts,t.sales*MTD_R).toFixed(1)}%)\nยาง MTD: ${m.tire} เส้น vs เป้า ${Math.round(t.tire*MTD_R)} เส้น\n2025: ${(h[2025]||[]).join(",")}\n2026 ม.ค.-เม.ย.: ${(h[2026]||[]).slice(0,4).join(",")}\nวิเคราะห์จุดอ่อน 3-5 ข้อ พร้อมแนวทางระยะสั้น ภาษาไทย`}]})});
      const d=await res.json();
      setAiAna(p=>{const n={...p,[bid]:d.content[0].text};LS.set("cp_ai",JSON.stringify(n));return n;});
    }catch(e){console.error(e);}
    setAiLoad(p=>({...p,[bid]:false}));
  };

  const genFcst=async()=>{
    setFcstLoad(true);
    const s=BRANCHES.map(b=>`${b.short}: PY25=${N(Math.round((MAY_SALES[b.id]?.[2025]||0)*MTD_R))}฿ เป้า=${N(getT(b.id).sales)}฿`).join("\n");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,messages:[{role:"user",content:`Forecast ยอดขายรายวัน พ.ค. 2026 วันที่ ${TODAY_D+1}-31 (${DAYS_LEFT}ค่า)\n${s}\nJSON: {"003":{"dailyForecast":[${DAYS_LEFT}ค่า],"comment":""},...} ครบ 10 สาขา JSON เท่านั้น`}]})});
      const d=await res.json();
      const p=JSON.parse(d.content[0].text.replace(/```json|```/g,"").trim());
      setFcst(p);LS.set("cp_fcst",JSON.stringify(p));
    }catch(e){console.error(e);}
    setFcstLoad(false);
  };

  const ctx={selBr,setSelBr,de,saveDay,delDay,getMTD,getTS,getAllMTD,getAllTS,getT,getH,TARGET,HIST,aiAna,aiLoad,genPlan,fcst,fcstLoad,genFcst,upStat,setUpStat,setTARGET,setHIST};

  return(
    <div style={{fontFamily:"Barlow,sans-serif",background:"#0d1117",minHeight:"100vh",color:"#e5e7eb"}}>
      <div style={{background:"linear-gradient(90deg,#161b25,#0d1117)",borderBottom:"2px solid #f59e0b",padding:"10px 20px",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:34,height:34,background:"#f59e0b",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏁</div>
        <div>
          <div style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:20,letterSpacing:3,color:"#f59e0b"}}>COCKPIT SALES INTELLIGENCE</div>
          <div style={{fontSize:10,color:"#6b7280",letterSpacing:1}}>10 BRANCHES · MAY 2026 · DAY {TODAY_D}/{TOTAL_D}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:14,alignItems:"center"}}>
          {Object.keys(upStat).length>0&&<span style={{fontSize:10,color:"#22c55e"}}>✅ {Object.keys(upStat).length} ไฟล์</span>}
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#9ca3af"}}>15 พ.ค. 2026 | เหลือ {DAYS_LEFT} วัน</span>
        </div>
      </div>
      <div style={{display:"flex",background:"#0d1117",borderBottom:"1px solid #1e2538",overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 14px",background:tab===t.id?"#1e2538":"transparent",color:tab===t.id?"#f59e0b":"#6b7280",border:"none",borderBottom:tab===t.id?"2px solid #f59e0b":"2px solid transparent",cursor:"pointer",fontFamily:"Barlow Condensed",fontWeight:600,fontSize:13,whiteSpace:"nowrap",transition:"all .15s"}}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{padding:"18px 20px",maxWidth:1440,margin:"0 auto"}}>
        {tab==="overview"&&<Overview ctx={ctx}/>}
        {tab==="mtd"     &&<MTDTab ctx={ctx}/>}
        {tab==="products"&&<Products ctx={ctx}/>}
        {tab==="daily"   &&<Daily ctx={ctx}/>}
        {tab==="monthly" &&<Monthly ctx={ctx}/>}
        {tab==="tracker" &&<Tracker ctx={ctx}/>}
        {tab==="asp"     &&<ASP ctx={ctx}/>}
        {tab==="plan"    &&<Plan ctx={ctx}/>}
        {tab==="entry"   &&<Entry ctx={ctx}/>}
        {tab==="upload"  &&<Upload ctx={ctx}/>}
      </div>
    </div>
  );
}

/* ═══ OVERVIEW ═══ */
function Overview({ctx}){
  const {getMTD,getTS,TARGET}=ctx;
  const rows=BRANCHES.map((b,i)=>{const t=TARGET[b.id]||SEED_T[b.id];const m=getMTD(b.id);const ts=getTS(b.id);return{...b,t,m,ts,mtd:t.sales*MTD_R,py:(MAY_SALES[b.id]?.[2025]||0)*MTD_R,idx:i};});
  const totS=rows.reduce((s,r)=>s+r.ts,0),totT=rows.reduce((s,r)=>s+r.mtd,0);
  const totTire=rows.reduce((s,r)=>s+r.m.tire,0),totTT=rows.reduce((s,r)=>s+r.t.tire*MTD_R,0);
  const bar=rows.map(r=>({name:r.id,"ยอดจริง":Math.round(r.ts/1000),"เป้า MTD":Math.round(r.mtd/1000),"PY MTD":Math.round(r.py/1000),"ยาง":r.m.tire,"เป้ายาง":Math.round(r.t.tire*MTD_R)}));
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <Card label="ยอดขายรวม MTD" value={fM(totS)} sub={`เป้า ${fM(Math.round(totT))}`}/>
        <Card label="% เทียบเป้า MTD" value={P(totS,totT).toFixed(1)+"%"} color={P(totS,totT)>=100?"#22c55e":P(totS,totT)>=90?"#f59e0b":"#ef4444"}/>
        <Card label="ยางรวม MTD (เส้น)" value={N(totTire)} sub={`เป้า ${N(Math.round(totTT))}`} color="#3b82f6"/>
        <Card label="% ยางเทียบเป้า" value={P(totTire,totTT).toFixed(1)+"%"} color={P(totTire,totTT)>=100?"#22c55e":P(totTire,totTT)>=90?"#f59e0b":"#ef4444"}/>
      </div>
      <div style={{background:"#161b25",borderRadius:10,border:"1px solid #2d3548",overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"11px 15px",fontFamily:"Barlow Condensed",fontWeight:700,fontSize:15,color:"#f59e0b",borderBottom:"1px solid #2d3548",letterSpacing:1}}>📊 ภาพรวมทุกสาขา — MTD 1-15 พ.ค. 2026</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#0d1117"}}>{["รหัส","ชื่อสาขา","ยอดขาย MTD","เป้า MTD","% เป้า","PY พ.ค.25","% vs PY","ยาง MTD","เป้ายาง","% ยาง"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:h==="ชื่อสาขา"?"left":"center",color:"#6b7280",fontFamily:"Barlow Condensed",fontSize:11,borderBottom:"1px solid #1e2538"}}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={r.id} style={{borderBottom:"1px solid #1e2538",background:i%2===0?"transparent":"#131820"}}>
                  <td style={{padding:"8px 10px",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:BCLR[i],fontWeight:700}}>{r.id}</td>
                  <td style={{padding:"8px 10px",fontWeight:600}}>{r.name}</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:"#f59e0b"}}>{N(r.ts)}</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#6b7280"}}>{N(Math.round(r.mtd))}</td>
                  <td style={{padding:"8px 10px",textAlign:"center"}}><PBadge value={P(r.ts,r.mtd)}/></td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#6b7280"}}>{N(Math.round(r.py))}</td>
                  <td style={{padding:"8px 10px",textAlign:"center"}}><PBadge value={P(r.ts,r.py)}/></td>
                  <td style={{padding:"8px 10px",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:"#3b82f6"}}>{r.m.tire}</td>
                  <td style={{padding:"8px 10px",textAlign:"center",color:"#6b7280"}}>{Math.round(r.t.tire*MTD_R)}</td>
                  <td style={{padding:"8px 10px",textAlign:"center"}}><PBadge value={P(r.m.tire,r.t.tire*MTD_R)}/></td>
                </tr>
              ))}
              <tr style={{background:"#1e2538",borderTop:"2px solid #f59e0b"}}>
                <td colSpan={2} style={{padding:"8px 10px",fontWeight:900,fontFamily:"Barlow Condensed",fontSize:13}}>รวมทุกสาขา</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:900,color:"#f59e0b"}}>{N(totS)}</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#6b7280"}}>{N(Math.round(totT))}</td>
                <td style={{padding:"8px 10px",textAlign:"center"}}><PBadge value={P(totS,totT)}/></td>
                <td colSpan={2}/>
                <td style={{padding:"8px 10px",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontWeight:900,color:"#3b82f6"}}>{N(totTire)}</td>
                <td style={{padding:"8px 10px",textAlign:"center",color:"#6b7280"}}>{Math.round(totTT)}</td>
                <td style={{padding:"8px 10px",textAlign:"center"}}><PBadge value={P(totTire,totTT)}/></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:8,padding:14}}>
          <div style={{fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13,color:"#f59e0b",marginBottom:10}}>ยอดขาย MTD vs เป้า vs PY (฿000)</div>
          <ResponsiveContainer width="100%" height={210}><BarChart data={bar} margin={{top:0,right:6,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/><XAxis dataKey="name" tick={{fill:"#6b7280",fontSize:9}}/><YAxis tick={{fill:"#6b7280",fontSize:9}}/><Tooltip contentStyle={{background:"#1e2538",border:"1px solid #2d3548"}}/><Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="ยอดจริง" fill="#f59e0b" radius={[2,2,0,0]}/><Bar dataKey="เป้า MTD" fill="#2d3548" radius={[2,2,0,0]}/><Bar dataKey="PY MTD" fill="#475569" radius={[2,2,0,0]}/></BarChart></ResponsiveContainer>
        </div>
        <div style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:8,padding:14}}>
          <div style={{fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13,color:"#3b82f6",marginBottom:10}}>ยาง MTD vs เป้า (เส้น)</div>
          <ResponsiveContainer width="100%" height={210}><BarChart data={bar} margin={{top:0,right:6,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/><XAxis dataKey="name" tick={{fill:"#6b7280",fontSize:9}}/><YAxis tick={{fill:"#6b7280",fontSize:9}}/><Tooltip contentStyle={{background:"#1e2538",border:"1px solid #2d3548"}}/><Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="ยาง" fill="#3b82f6" radius={[2,2,0,0]}/><Bar dataKey="เป้ายาง" fill="#1e3a5f" radius={[2,2,0,0]}/></BarChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ═══ MTD ═══ */
function MTDTab({ctx}){
  const {selBr,setSelBr,getMTD,getTS,getAllMTD,getAllTS,getT,getH}=ctx;
  const isAll=selBr==="ALL";const t=getT(selBr);const m=isAll?getAllMTD():getMTD(selBr);const ts=isAll?getAllTS():getTS(selBr);const h=getH(selBr);
  const pyMTD=isAll?BRANCHES.reduce((s,b)=>s+(MAY_SALES[b.id]?.[2025]||0)*MTD_R,0):(MAY_SALES[selBr]?.[2025]||0)*MTD_R;
  const py2MTD=isAll?BRANCHES.reduce((s,b)=>s+(MAY_SALES[b.id]?.[2024]||0)*MTD_R,0):(MAY_SALES[selBr]?.[2024]||0)*MTD_R;
  const t25=isAll?BRANCHES.reduce((s,b)=>s+(MAY_TIRE[b.id]?.[2025]||0)*MTD_R,0):(MAY_TIRE[selBr]?.[2025]||0)*MTD_R;
  const t24=isAll?BRANCHES.reduce((s,b)=>s+(MAY_TIRE[b.id]?.[2024]||0)*MTD_R,0):(MAY_TIRE[selBr]?.[2024]||0)*MTD_R;
  const mData=MONTHS_TH.map((mn,i)=>({month:mn,2023:h[2023]?.[i]??null,2024:h[2024]?.[i]??null,2025:h[2025]?.[i]??null,2026:h[2026]?.[i]??null}));
  return(
    <div style={{display:"flex",gap:16}}>
      <BSidebar sel={selBr} onSel={setSelBr}/>
      <div style={{flex:1}}>
        <div style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:20,color:"#f59e0b",letterSpacing:2,marginBottom:12}}>{isAll?"🌐 รวมทุกสาขา":`${selBr} — ${BRANCHES.find(x=>x.id===selBr)?.name}`}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:10}}>
          <Card label="ยอดขาย MTD" value={fM(ts)} sub={`เป้า ${fM(Math.round(t.sales*MTD_R))}`}/>
          <Card label="% เทียบเป้า" value={P(ts,t.sales*MTD_R).toFixed(1)+"%"} color={P(ts,t.sales*MTD_R)>=100?"#22c55e":P(ts,t.sales*MTD_R)>=90?"#f59e0b":"#ef4444"}/>
          <Card label="vs PY May 25" value={P(ts,pyMTD).toFixed(1)+"%"} color="#94a3b8"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
          <Card label="ยาง MTD (เส้น)" value={N(m.tire)} sub={`เป้า ${N(Math.round(t.tire*MTD_R))}`} color="#3b82f6"/>
          <Card label="% ยางเทียบเป้า" value={P(m.tire,t.tire*MTD_R).toFixed(1)+"%"} color={P(m.tire,t.tire*MTD_R)>=100?"#22c55e":P(m.tire,t.tire*MTD_R)>=90?"#f59e0b":"#ef4444"}/>
          <Card label="vs PY Tire 25" value={P(m.tire,t25).toFixed(1)+"%"} color="#94a3b8"/>
        </div>
        <div style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:8,marginBottom:14}}>
          <div style={{padding:"10px 14px",fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13,color:"#f59e0b",borderBottom:"1px solid #2d3548"}}>เปรียบเทียบ MTD 15 วัน</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#0d1117"}}>{["ปี","ยอดขาย MTD","ยาง MTD","ยอดเต็มเดือน"].map(h=><th key={h} style={{padding:"8px 14px",textAlign:h==="ปี"?"left":"right",color:"#6b7280",fontSize:11,fontFamily:"Barlow Condensed"}}>{h}</th>)}</tr></thead>
            <tbody>{[
              {yr:"2024",sm:py2MTD,tire:t24,full:isAll?BRANCHES.reduce((s,b)=>s+(MAY_SALES[b.id]?.[2024]||0),0):(MAY_SALES[selBr]?.[2024]||0)},
              {yr:"2025",sm:pyMTD,tire:t25,full:isAll?BRANCHES.reduce((s,b)=>s+(MAY_SALES[b.id]?.[2025]||0),0):(MAY_SALES[selBr]?.[2025]||0)},
              {yr:"2026 (MTD จริง)",sm:ts,tire:m.tire,full:"—",hl:true},
              {yr:"2026 เป้า",sm:t.sales*MTD_R,tire:Math.round(t.tire*MTD_R),full:t.sales,tgt:true},
            ].map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #1e2538",background:r.hl?"#1e2538":r.tgt?"#131820":"transparent"}}>
                <td style={{padding:"9px 14px",fontWeight:700,color:r.hl?"#f59e0b":r.tgt?"#a78bfa":"#9ca3af"}}>{r.yr}</td>
                <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:r.hl?"#f59e0b":"#e5e7eb"}}>{N(Math.round(r.sm))}</td>
                <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:r.hl?"#3b82f6":"#9ca3af"}}>{Math.round(r.tire)}</td>
                <td style={{padding:"9px 14px",textAlign:"right",color:"#6b7280"}}>{typeof r.full==="number"?N(r.full):r.full}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:8,padding:14}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
            <div style={{fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13,color:"#f59e0b"}}>ยอดขายรายเดือน (฿000) 2023–2026</div>
            <span style={{fontSize:10,color:"#22c55e",background:"#0d2a1a",padding:"2px 8px",borderRadius:4}}>2026: ม.ค.-เม.ย.จริง + พ.ค.MTD</span>
          </div>
          <ResponsiveContainer width="100%" height={210}><LineChart data={mData}><CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/><XAxis dataKey="month" tick={{fill:"#6b7280",fontSize:9}}/><YAxis tick={{fill:"#6b7280",fontSize:9}}/><Tooltip contentStyle={{background:"#1e2538",border:"1px solid #2d3548"}} formatter={v=>[v!=null?N(v*1000)+"฿":"—",""]}/><Legend wrapperStyle={{fontSize:10}}/>{[2023,2024,2025,2026].map(yr=><Line key={yr} type="monotone" dataKey={yr} stroke={YRCLR[yr]} strokeWidth={yr===2026?3:1.5} dot={yr===2026?{r:4}:false} strokeDasharray={yr===2026?"6 3":"none"} connectNulls={false}/>)}</LineChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ═══ PRODUCTS ═══ */
function Products({ctx}){
  const {selBr,setSelBr,getMTD,getAllMTD,getT}=ctx;
  const isAll=selBr==="ALL";const m=isAll?getAllMTD():getMTD(selBr);const t=getT(selBr);
  const rows=[{label:"ยาง (เส้น)",a:m.tire,tgt:Math.round(t.tire*MTD_R)},{label:"ยอดขายยาง (฿)",a:m.tireSales,tgt:Math.round(t.sales*.55*MTD_R)},{label:"ยาง Bridgestone (เส้น)",a:m.bsTire,tgt:Math.round(t.tire*.35*MTD_R)},{label:"Alloy Wheel (วง)",a:m.alloyWheel,tgt:Math.round(10*MTD_R*(isAll?10:1))},{label:"Battery (ลูก)",a:m.battery,tgt:Math.round(t.battery*MTD_R)},{label:"Brake (ชิ้น)",a:m.brake,tgt:Math.round(t.brake*MTD_R)},{label:"Shock Up (ชิ้น)",a:m.shockUp,tgt:Math.round(t.shock*MTD_R)},{label:"MP (ชุด)",a:m.mp,tgt:Math.round(t.mp*MTD_R)},{label:"Lubricant (ลิตร)",a:m.lubricant,tgt:Math.round(t.lube*MTD_R)},{label:"Filter (ชิ้น)",a:m.filter,tgt:Math.round(t.lube*.2*MTD_R)},{label:"Air Filter (ชิ้น)",a:m.airFilter,tgt:Math.round(t.lube*.15*MTD_R)},{label:"Service (฿)",a:m.service,tgt:Math.round(t.sales*.05*MTD_R)},{label:"Job Order (ราย)",a:m.jobOrder,tgt:Math.round(t.cc*MTD_R)}];
  return(
    <div style={{display:"flex",gap:16}}>
      <BSidebar sel={selBr} onSel={setSelBr}/>
      <div style={{flex:1}}>
        <div style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:20,color:"#f59e0b",letterSpacing:2,marginBottom:12}}>สินค้า MTD — {isAll?"รวมทุกสาขา":BRANCHES.find(x=>x.id===selBr)?.name}</div>
        <div style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:8,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#0d1117"}}>{["สินค้า","ยอดจริง MTD","เป้า MTD","% เทียบเป้า","สถานะ"].map(h=><th key={h} style={{padding:"9px 14px",textAlign:h==="สินค้า"?"left":"center",color:"#6b7280",fontSize:11,fontFamily:"Barlow Condensed",borderBottom:"1px solid #1e2538"}}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r,i)=>{const p=P(r.a,r.tgt);return(<tr key={i} style={{borderBottom:"1px solid #1e2538",background:i%2===0?"transparent":"#131820"}}><td style={{padding:"9px 14px",fontWeight:600,fontSize:13}}>{r.label}</td><td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:"#f59e0b"}}>{N(r.a)}</td><td style={{padding:"9px 14px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#6b7280"}}>{N(r.tgt)}</td><td style={{padding:"9px 14px",textAlign:"center"}}><PBadge value={p}/></td><td style={{padding:"9px 14px",textAlign:"center",fontSize:15}}>{p>=100?"✅":p>=90?"⚠️":"❌"}</td></tr>);})}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══ DAILY ═══ */
function Daily({ctx}){
  const {selBr,setSelBr,getTS,getAllTS,getT,fcst,fcstLoad,genFcst}=ctx;
  const isAll=selBr==="ALL";const t=getT(selBr);const ts=isAll?getAllTS():getTS(selBr);
  const pyF=isAll?BRANCHES.reduce((s,b)=>s+(MAY_SALES[b.id]?.[2025]||0),0):(MAY_SALES[selBr]?.[2025]||0);
  const py4=isAll?BRANCHES.reduce((s,b)=>s+(MAY_SALES[b.id]?.[2024]||0),0):(MAY_SALES[selBr]?.[2024]||0);
  const avg=TODAY_D>0?ts/TODAY_D:0;const fArr=(!isAll&&fcst[selBr]?.dailyForecast)||[];
  const data=Array.from({length:31},(_,i)=>{const d=i+1;const row={day:`${d}`,"2025 PY":Math.round(pyF/31*(0.85+Math.sin(i*.4)*.2)),"2024 PY":Math.round(py4/31*(0.85+Math.sin(i*.35)*.2)),"เป้า/วัน":Math.round(t.sales/31)};if(d<=TODAY_D)row["ยอดจริง"]=Math.round(avg*(0.85+Math.sin(i*.5)*.3));if(d>TODAY_D)row["Forecast"]=fArr[i-TODAY_D]||Math.round(avg*1.05);return row;});
  return(
    <div style={{display:"flex",gap:16}}>
      <BSidebar sel={selBr} onSel={setSelBr}/>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:20,color:"#f59e0b",letterSpacing:2}}>รายวัน — {isAll?"รวมทุกสาขา":BRANCHES.find(x=>x.id===selBr)?.name}</div>
          <button onClick={genFcst} disabled={fcstLoad} style={{padding:"8px 16px",background:fcstLoad?"#1e2538":"#7c3aed",color:"#fff",border:"none",borderRadius:6,cursor:fcstLoad?"wait":"pointer",fontFamily:"Barlow Condensed",fontWeight:700,fontSize:12}}>{fcstLoad?"⏳ AI วิเคราะห์...":"🤖 AI Forecast"}</button>
        </div>
        {!isAll&&fcst[selBr]&&<div style={{background:"#1a1333",border:"1px solid #7c3aed",borderRadius:6,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#c4b5fd"}}>🤖 {fcst[selBr].comment}</div>}
        <div style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:8,padding:14,marginBottom:12}}>
          <ResponsiveContainer width="100%" height={260}><BarChart data={data} margin={{top:0,right:6,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/><XAxis dataKey="day" tick={{fill:"#6b7280",fontSize:8}}/><YAxis tick={{fill:"#6b7280",fontSize:9}} tickFormatter={v=>(v/1000).toFixed(0)+"k"}/><Tooltip contentStyle={{background:"#1e2538",border:"1px solid #2d3548"}} formatter={v=>[N(v)+"฿",""]}/><Legend wrapperStyle={{fontSize:10}}/><ReferenceLine y={t.sales/31} stroke="#a78bfa" strokeDasharray="4 2"/><Bar dataKey="2024 PY" fill="#374151" radius={[1,1,0,0]}/><Bar dataKey="2025 PY" fill="#4b5563" radius={[1,1,0,0]}/><Bar dataKey="ยอดจริง" fill="#f59e0b" radius={[2,2,0,0]}/><Bar dataKey="Forecast" fill="#ef444488" radius={[2,2,0,0]}/></BarChart></ResponsiveContainer>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          <Card label="เฉลี่ย/วัน" value={fM(Math.round(avg))} color="#f59e0b" small/>
          <Card label="เป้า/วัน" value={fM(Math.round(t.sales/31))} color="#a78bfa" small/>
          <Card label="PY25/วัน" value={fM(Math.round(pyF/31))} color="#94a3b8" small/>
          <Card label="ต้องทำ/วัน" value={fM(Math.round(Math.max(0,t.sales-ts)/DAYS_LEFT))} color="#ef4444" small/>
        </div>
      </div>
    </div>
  );
}

/* ═══ MONTHLY ═══ */
function Monthly({ctx}){
  const {selBr,setSelBr,getH}=ctx;
  const isAll=selBr==="ALL";const h=getH(selBr);
  const data=MONTHS_TH.map((m,i)=>({month:m,2023:h[2023]?.[i]??null,2024:h[2024]?.[i]??null,2025:h[2025]?.[i]??null,2026:h[2026]?.[i]??null}));
  const tData=MONTHS_TH.map((m,i)=>({month:m,"ยาง 2024":isAll?BRANCHES.reduce((s,b)=>s+(SEED_TIREQ[b.id]?.[2024]?.[i]||0),0):SEED_TIREQ[selBr]?.[2024]?.[i]||0,"ยาง 2025":isAll?BRANCHES.reduce((s,b)=>s+(SEED_TIREQ[b.id]?.[2025]?.[i]||0),0):SEED_TIREQ[selBr]?.[2025]?.[i]||0}));
  return(
    <div style={{display:"flex",gap:16}}>
      <BSidebar sel={selBr} onSel={setSelBr}/>
      <div style={{flex:1}}>
        <div style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:20,color:"#f59e0b",letterSpacing:2,marginBottom:14}}>รายเดือน — {isAll?"รวมทุกสาขา":BRANCHES.find(x=>x.id===selBr)?.name}</div>
        <div style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:8,padding:14,marginBottom:14}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}><div style={{fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13,color:"#f59e0b"}}>ยอดขายรายเดือน (฿000) 2023–2026</div><span style={{fontSize:10,color:"#22c55e",background:"#0d2a1a",padding:"2px 8px",borderRadius:4}}>2026: ม.ค.-เม.ย.จริง + พ.ค.MTD</span></div>
          <ResponsiveContainer width="100%" height={250}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/><XAxis dataKey="month" tick={{fill:"#6b7280",fontSize:9}}/><YAxis tick={{fill:"#6b7280",fontSize:9}}/><Tooltip contentStyle={{background:"#1e2538",border:"1px solid #2d3548"}} formatter={v=>[v!=null?N(v*1000)+"฿":"—",""]}/><Legend wrapperStyle={{fontSize:10}}/>{[2023,2024,2025,2026].map(yr=><Line key={yr} type="monotone" dataKey={yr} stroke={YRCLR[yr]} strokeWidth={yr===2026?3:1.5} dot={yr===2026?{r:4,fill:YRCLR[2026]}:false} strokeDasharray={yr===2026?"6 3":"none"} connectNulls={false}/>)}</LineChart></ResponsiveContainer>
        </div>
        <div style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:8,padding:14}}>
          <div style={{fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13,color:"#3b82f6",marginBottom:10}}>ยาง (เส้น) — 2024 vs 2025</div>
          <ResponsiveContainer width="100%" height={190}><BarChart data={tData}><CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/><XAxis dataKey="month" tick={{fill:"#6b7280",fontSize:9}}/><YAxis tick={{fill:"#6b7280",fontSize:9}}/><Tooltip contentStyle={{background:"#1e2538",border:"1px solid #2d3548"}}/><Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="ยาง 2024" fill="#475569" radius={[2,2,0,0]}/><Bar dataKey="ยาง 2025" fill="#3b82f6" radius={[2,2,0,0]}/></BarChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ═══ TRACKER ═══ */
function Tracker({ctx}){
  const {getMTD,getTS,getT,fcst}=ctx;
  const rows=BRANCHES.map((b,i)=>{const t=getT(b.id);const m=getMTD(b.id);const ts=getTS(b.id);const dT=Math.round(Math.max(0,t.sales-ts)/DAYS_LEFT);const fT=fcst[b.id]?.dailyForecast?.[0]||Math.round(t.sales/31);return{...b,t,m,ts,dT,fT,diff:fT-dT,idx:i};});
  const totS=rows.reduce((s,r)=>s+r.ts,0),totT=rows.reduce((s,r)=>s+r.t.sales*MTD_R,0);
  const totTire=rows.reduce((s,r)=>s+r.m.tire,0),totTT=rows.reduce((s,r)=>s+r.t.tire*MTD_R,0);
  return(
    <div>
      <div style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:22,color:"#f59e0b",letterSpacing:2,marginBottom:14}}>🎯 DAILY TRACKER — 15 พ.ค. 2026</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        <Card label="ยอด MTD รวม" value={fM(totS)} sub={`เป้า ${fM(Math.round(totT))}`}/>
        <Card label="% เป้า MTD" value={P(totS,totT).toFixed(1)+"%"} color={P(totS,totT)>=90?"#22c55e":"#ef4444"}/>
        <Card label="ยางรวม MTD" value={N(totTire)} sub={`เป้า ${N(Math.round(totTT))}`} color="#3b82f6"/>
        <Card label="% เป้ายาง" value={P(totTire,totTT).toFixed(1)+"%"} color={P(totTire,totTT)>=90?"#22c55e":"#ef4444"}/>
      </div>
      <div style={{background:"#161b25",borderRadius:10,border:"1px solid #2d3548",overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"10px 14px",fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13,color:"#f59e0b",borderBottom:"1px solid #2d3548"}}>เป้าวันที่เหลือ = (เป้า − MTD) ÷ {DAYS_LEFT} วัน</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#0d1117"}}>{["สาขา","ยอด MTD","เป้า MTD","% เป้า","ยาง","% ยาง","เป้า/วัน","AI Forecast","Diff"].map(h=><th key={h} style={{padding:"7px 10px",textAlign:"center",color:"#6b7280",fontSize:11,fontFamily:"Barlow Condensed",borderBottom:"1px solid #1e2538"}}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #1e2538",background:i%2===0?"transparent":"#131820"}}>
                <td style={{padding:"7px 10px",fontWeight:600,color:BCLR[r.idx],fontSize:11}}>{r.short}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:"#f59e0b"}}>{N(r.ts)}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#6b7280"}}>{N(Math.round(r.t.sales*MTD_R))}</td>
                <td style={{padding:"7px 10px",textAlign:"center"}}><PBadge value={P(r.ts,r.t.sales*MTD_R)}/></td>
                <td style={{padding:"7px 10px",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:"#3b82f6"}}>{r.m.tire}</td>
                <td style={{padding:"7px 10px",textAlign:"center"}}><PBadge value={P(r.m.tire,r.t.tire*MTD_R)}/></td>
                <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:"#a78bfa"}}>{N(r.dT)}</td>
                <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#ef4444"}}>{N(r.fT)}</td>
                <td style={{padding:"7px 10px",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:r.diff>=0?"#22c55e":"#ef4444"}}>{r.diff>=0?"+":""}{N(Math.round(r.diff))}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══ ASP & SPD ═══ */
function ASP({ctx}){
  const {selBr,setSelBr,getMTD,getAllMTD,getTS,getAllTS}=ctx;
  const AT=3800,ST=5100;
  const rows=BRANCHES.map((b,i)=>{const m=getMTD(b.id);const ts=getTS(b.id);return{...b,m,ts,asp:m.tire>0&&m.tireSales>0?m.tireSales/m.tire:0,spd:m.jobOrder>0?ts/m.jobOrder:0,idx:i};});
  const aM=getAllMTD();const aTS=getAllTS();const aASP=aM.tire>0&&aM.tireSales>0?aM.tireSales/aM.tire:0;const aSPD=aM.jobOrder>0?aTS/aM.jobOrder:0;
  return(
    <div style={{display:"flex",gap:16}}>
      <BSidebar sel={selBr} onSel={setSelBr}/>
      <div style={{flex:1}}>
        <div style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:20,color:"#f59e0b",letterSpacing:2,marginBottom:12}}>💰 ASP & SPD — {selBr==="ALL"?"รวมทุกสาขา":BRANCHES.find(x=>x.id===selBr)?.name}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
          <Card label="ASP Threshold" value={"฿"+N(AT)} sub="ยอดยาง ÷ เส้น"/>
          <Card label="SPD Threshold" value={"฿"+N(ST)} sub="ยอดรวม ÷ Job Order" color="#10b981"/>
          <Card label="ASP รวม" value={aASP>0?"฿"+N(Math.round(aASP)):"—"} color={aASP>=AT?"#22c55e":"#ef4444"}/>
          <Card label="SPD รวม" value={aSPD>0?"฿"+N(Math.round(aSPD)):"—"} color={aSPD>=ST?"#22c55e":"#ef4444"}/>
        </div>
        <div style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:8,overflow:"hidden",marginBottom:14}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#0d1117"}}>{["สาขา","ยอดขายยาง","เส้น","ASP","สถานะ","ยอดขายรวม","Job Order","SPD","สถานะ"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"center",color:"#6b7280",fontSize:11,fontFamily:"Barlow Condensed",borderBottom:"1px solid #1e2538"}}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #1e2538",background:i%2===0?"transparent":"#131820"}}>
                <td style={{padding:"8px 10px",fontWeight:600,color:BCLR[r.idx],fontSize:11}}>{r.short}</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{N(r.m.tireSales)}</td>
                <td style={{padding:"8px 10px",textAlign:"center"}}>{r.m.tire}</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:r.asp>=AT?"#22c55e":r.asp>0?"#ef4444":"#6b7280"}}>{r.asp>0?"฿"+N(Math.round(r.asp)):"—"}</td>
                <td style={{padding:"8px 10px",textAlign:"center",fontSize:15}}>{r.asp===0?"—":r.asp>=AT?"✅":"❌"}</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{N(r.ts)}</td>
                <td style={{padding:"8px 10px",textAlign:"center"}}>{r.m.jobOrder}</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:r.spd>=ST?"#22c55e":r.spd>0?"#ef4444":"#6b7280"}}>{r.spd>0?"฿"+N(Math.round(r.spd)):"—"}</td>
                <td style={{padding:"8px 10px",textAlign:"center",fontSize:15}}>{r.spd===0?"—":r.spd>=ST?"✅":"❌"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {[{k:"ASP",c:"#f59e0b",T:AT,max:7000},{k:"SPD",c:"#10b981",T:ST,max:9000}].map(cfg=>(
            <div key={cfg.k} style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:8,padding:14}}>
              <div style={{fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13,color:cfg.c,marginBottom:10}}>{cfg.k} รายสาขา</div>
              <ResponsiveContainer width="100%" height={190}><BarChart data={rows.map(r=>({name:r.id,[cfg.k]:Math.round(cfg.k==="ASP"?r.asp:r.spd)}))}><CartesianGrid strokeDasharray="3 3" stroke="#2d3548"/><XAxis dataKey="name" tick={{fill:"#6b7280",fontSize:9}}/><YAxis tick={{fill:"#6b7280",fontSize:9}} domain={[0,cfg.max]}/><Tooltip contentStyle={{background:"#1e2538",border:"1px solid #2d3548"}} formatter={v=>["฿"+N(v),cfg.k]}/><ReferenceLine y={cfg.T} stroke="#ef4444" strokeDasharray="4 2" label={{value:"≥"+N(cfg.T),fill:"#ef4444",fontSize:9}}/><Bar dataKey={cfg.k} fill={cfg.c} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ PLAN ═══ */
function Plan({ctx}){
  const {selBr,setSelBr,getMTD,getAllMTD,getTS,getAllTS,getT,aiAna,aiLoad,genPlan}=ctx;
  const isAll=selBr==="ALL";const t=getT(selBr);const m=isAll?getAllMTD():getMTD(selBr);const ts=isAll?getAllTS():getTS(selBr);
  return(
    <div style={{display:"flex",gap:16}}>
      <BSidebar sel={selBr} onSel={setSelBr}/>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:20,color:"#f59e0b",letterSpacing:2}}>🤖 แผนการขาย AI — {isAll?"รวมทุกสาขา":BRANCHES.find(x=>x.id===selBr)?.name}</div>
          <button onClick={()=>genPlan(selBr)} disabled={aiLoad[selBr]} style={{padding:"9px 18px",background:aiLoad[selBr]?"#1e2538":"#7c3aed",color:"#fff",border:"none",borderRadius:6,cursor:aiLoad[selBr]?"wait":"pointer",fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13}}>{aiLoad[selBr]?"⏳ AI กำลังวิเคราะห์...":"🔍 วิเคราะห์จุดอ่อน & แผน"}</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
          <Card label="ยอด MTD" value={fM(ts)} sub={`เป้า ${fM(Math.round(t.sales*MTD_R))}`}/>
          <Card label="% เป้า MTD" value={P(ts,t.sales*MTD_R).toFixed(1)+"%"} color={P(ts,t.sales*MTD_R)>=100?"#22c55e":P(ts,t.sales*MTD_R)>=90?"#f59e0b":"#ef4444"}/>
          <Card label="ยาง MTD" value={N(m.tire)+" เส้น"} sub={`เป้า ${Math.round(t.tire*MTD_R)}`} color="#3b82f6"/>
        </div>
        {aiAna[selBr]?<div style={{background:"#0d1928",border:"1px solid #7c3aed",borderRadius:10,padding:20}}><div style={{fontFamily:"Barlow Condensed",fontSize:12,color:"#a78bfa",marginBottom:10}}>🤖 AI ANALYSIS</div><div style={{fontSize:13,lineHeight:1.8,color:"#d1d5db",whiteSpace:"pre-wrap"}}>{aiAna[selBr]}</div></div>
        :<div style={{background:"#161b25",border:"2px dashed #2d3548",borderRadius:10,padding:48,textAlign:"center"}}><div style={{fontSize:48,marginBottom:10}}>🤖</div><div style={{color:"#6b7280",fontFamily:"Barlow Condensed",fontSize:16}}>กดปุ่ม "วิเคราะห์จุดอ่อน & แผน"</div></div>}
      </div>
    </div>
  );
}

/* ═══ ENTRY ═══ */
function Entry({ctx}){
  const {de,saveDay,delDay,getMTD,getTS,getT}=ctx;
  const [selBr,setSelBr]=useState("009");
  const [selDay,setSelDay]=useState(TODAY_D);
  const t=getT(selBr);const row=de[selBr]?.[selDay]||EMPTY_ROW();
  const mtd=getMTD(selBr);const ts=getTS(selBr);
  const filled=Object.keys(de[selBr]||{}).map(Number).sort((a,b)=>a-b);
  return(
    <div style={{display:"flex",gap:16}}>
      <BSidebar sel={selBr} onSel={b=>setSelBr(b)} showAll={false}/>
      <div style={{flex:1}}>
        <div style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:20,color:"#f59e0b",letterSpacing:2,marginBottom:12}}>✏️ กรอกยอดรายวัน — {BRANCHES.find(x=>x.id===selBr)?.name}</div>
        <div style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:8,padding:14,marginBottom:12}}>
          <div style={{fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13,color:"#e5e7eb",marginBottom:10}}>📅 เลือกวันที่ — พ.ค. 2026 (กรอกย้อนหลังได้ทุกวัน)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {Array.from({length:31},(_,i)=>{const d=i+1;const has=!!(de[selBr]?.[d]);const isTdy=d===TODAY_D;const isSel=d===selDay;return(
              <button key={d} onClick={()=>setSelDay(d)} style={{width:36,height:36,borderRadius:6,border:isSel?"2px solid #f59e0b":has?"1px solid #22c55e":"1px solid #2d3548",background:isSel?"#f59e0b":has?"#0d2a1a":"#0d1117",color:isSel?"#000":has?"#22c55e":d>TODAY_D?"#374151":"#e5e7eb",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:13,position:"relative"}}>
                {d}{isTdy&&<div style={{position:"absolute",top:1,right:2,width:5,height:5,borderRadius:"50%",background:isSel?"#000":"#f59e0b"}}/>}
              </button>
            );})}
          </div>
          <div style={{marginTop:8,display:"flex",gap:16,fontSize:11,color:"#6b7280"}}>
            <span><span style={{color:"#f59e0b"}}>■</span> วันที่เลือก</span><span><span style={{color:"#22c55e"}}>■</span> มีข้อมูล</span><span>⬛ ยังไม่ถึง</span>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
          <Card label={`ยอดขาย MTD (${filled.length}วัน)`} value={fM(ts)} sub={`เป้า ${fM(Math.round(t.sales*MTD_R))}`} small/>
          <Card label="% เทียบเป้า" value={P(ts,t.sales*MTD_R).toFixed(1)+"%"} color={P(ts,t.sales*MTD_R)>=100?"#22c55e":P(ts,t.sales*MTD_R)>=90?"#f59e0b":"#ef4444"} small/>
          <Card label="ยาง MTD" value={N(mtd.tire)+" เส้น"} sub={`เป้า ${Math.round(t.tire*MTD_R)}`} color="#3b82f6" small/>
          <Card label="Job Order MTD" value={N(mtd.jobOrder)} sub={`เป้า ${Math.round(t.cc*MTD_R)}`} color="#10b981" small/>
        </div>
        <div style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:10,overflow:"hidden",marginBottom:12}}>
          <div style={{padding:"10px 14px",background:"#0d1117",borderBottom:"1px solid #2d3548",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:"Barlow Condensed",fontWeight:700,fontSize:14,color:"#f59e0b"}}>📅 วันที่ {selDay} พ.ค. 2026{selDay===TODAY_D&&<span style={{fontSize:11,color:"#22c55e",marginLeft:8}}>(วันนี้)</span>}{selDay>TODAY_D&&<span style={{fontSize:11,color:"#6b7280",marginLeft:8}}>(ยังไม่ถึง)</span>}{selDay<TODAY_D&&<span style={{fontSize:11,color:"#f59e0b",marginLeft:8}}>(ย้อนหลัง)</span>}</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:11,color:"#22c55e"}}>💾 บันทึกอัตโนมัติ</span>{de[selBr]?.[selDay]&&<button onClick={()=>delDay(selBr,selDay)} style={{padding:"4px 10px",background:"#450a0a",border:"1px solid #ef4444",borderRadius:4,color:"#ef4444",cursor:"pointer",fontSize:11}}>🗑 ลบ</button>}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {FIELDS.map((f,i)=>{const tV=f.tgt?(t[f.tgt]||0):0;return(
              <div key={f.key} style={{padding:"11px 14px",borderBottom:"1px solid #1e2538",borderRight:i%2===0?"1px solid #1e2538":"none",background:i%4<2?"transparent":"#0d1117"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><label style={{fontSize:12,fontWeight:600,color:"#9ca3af"}}>{f.label}</label>{tV>0&&<span style={{fontSize:10,color:"#4b5563"}}>เป้า/วัน≈{Math.round(tV/31)}</span>}</div>
                <input type="number" value={row[f.key]} placeholder="0" onChange={e=>saveDay(selBr,selDay,f.key,e.target.value)} style={{width:"100%",boxSizing:"border-box",background:"#0d1117",border:"1px solid #2d3548",borderRadius:5,padding:"7px 10px",color:"#f59e0b",fontFamily:"'JetBrains Mono',monospace",fontSize:15,fontWeight:700,outline:"none"}}/>
              </div>
            );})}
          </div>
        </div>
        {filled.length>0&&(
          <div style={{background:"#161b25",border:"1px solid #2d3548",borderRadius:8,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13,color:"#3b82f6",borderBottom:"1px solid #2d3548"}}>📋 ประวัติที่กรอก — {filled.length} วัน (คลิกแถวเพื่อแก้ไข)</div>
            <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#0d1117"}}>{["วัน","ยาง","ยอดยาง","Battery","Brake","MP","Job Order",""].map(h=><th key={h} style={{padding:"7px 10px",textAlign:"center",color:"#6b7280",fontSize:11,fontFamily:"Barlow Condensed",borderBottom:"1px solid #1e2538"}}>{h}</th>)}</tr></thead>
              <tbody>{filled.map((d,i)=>{const r=de[selBr][d]||{};return(
                <tr key={d} onClick={()=>setSelDay(d)} style={{borderBottom:"1px solid #1e2538",background:d===selDay?"#1e2538":i%2===0?"transparent":"#131820",cursor:"pointer"}}>
                  <td style={{padding:"7px 10px",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:d===selDay?"#f59e0b":"#e5e7eb"}}>{d} พ.ค.</td>
                  <td style={{padding:"7px 10px",textAlign:"center",color:"#3b82f6",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{r.tire||"—"}</td>
                  <td style={{padding:"7px 10px",textAlign:"right",color:"#f59e0b",fontFamily:"'JetBrains Mono',monospace"}}>{r.tireSales?N(+r.tireSales):"—"}</td>
                  <td style={{padding:"7px 10px",textAlign:"center"}}>{r.battery||"—"}</td>
                  <td style={{padding:"7px 10px",textAlign:"center"}}>{r.brake||"—"}</td>
                  <td style={{padding:"7px 10px",textAlign:"center"}}>{r.mp||"—"}</td>
                  <td style={{padding:"7px 10px",textAlign:"center"}}>{r.jobOrder||"—"}</td>
                  <td style={{padding:"7px 10px",textAlign:"center"}}><button onClick={e=>{e.stopPropagation();delDay(selBr,d);}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:13}}>🗑</button></td>
                </tr>
              );})}</tbody>
            </table></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ UPLOAD ═══ */
const FDEFS=[
  {key:"target",  label:"เป้าเดือน (เช่น เป้าเดือน_Jun_2026.xlsx)",icon:"🎯",hint:"Sheet: For_BI — อัพโหลดต้นเดือน"},
  {key:"hist",    label:"ประวัติยอดขาย.xlsx",                        icon:"📖",hint:"Sheet: Sales History23-26"},
  {key:"daily",   label:"ยอดขายรายวัน.xlsx",                         icon:"📅",hint:"Sheet: ยอดขายรายวัน"},
  {key:"tiredaily",label:"ยอดขายยางรายวัน.xlsx",                     icon:"🛞",hint:"Sheet: ยอดขายยางรายวัน"},
];
function parseTgt(wb){const sn=wb.SheetNames.find(s=>s.toLowerCase().includes("for_bi")||s.includes("2026"))||wb.SheetNames[0];const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1});const map={"3":"003","9":"009","10":"010","12":"012","14":"014","48":"048","50":"050","96":"096","107":"107","143":"143"};const res={};rows.forEach(r=>{const bid=map[String(r[0]||"").trim()];if(bid&&r[3])res[bid]={sales:+r[3]||0,tire:+r[4]||0,lube:+r[5]||0,battery:+r[6]||0,brake:+r[7]||0,shock:+r[8]||0,mp:+r[9]||0,cc:+r[12]||0};});return res;}
function parseHist(wb){const sn=wb.SheetNames.find(s=>s.includes("History")||s.includes("23"))||wb.SheetNames[0];const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1});const bMap={"003-Cockpit Srinakarin":"003","009-Cockpit Nakhonratchasima":"009","010-Cockpit Udon Thani":"010","012-Cockpit Khon Kaen":"012","014-Cockpit Ubon Ratchathani":"014","048-Cockpit Surin":"048","050-Cockpit Lopburi":"050","096-Cockpit Nakhonratchasima 2":"096","107-Cockpit Bypass Udonthani":"107","143-Cockpit Samut Prakarn":"143"};const res={};const G=15;for(let c=0;c<(rows[0]||[]).length;c+=G){rows.slice(2).forEach(row=>{const br=String(row[c]||"").trim();const yr=row[c+1];const bid=bMap[br];if(bid&&yr&&!isNaN(yr)){if(!res[bid])res[bid]={};const m=[];for(let i=2;i<14;i++)m.push(Math.round((+row[c+i]||0)/1000));res[bid][String(Math.round(yr))]=m;}});}return res;}

function Upload({ctx}){
  const {upStat,setUpStat,setTARGET,setHIST}=ctx;
  const refs={target:useRef(),hist:useRef(),daily:useRef(),tiredaily:useRef()};
  const handle=async(key,file)=>{
    if(!file)return;
    try{
      const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:"array",cellDates:true});
      if(key==="target"){const p=parseTgt(wb);setTARGET(prev=>{const n={...prev,...p};LS.set("cp_tgt",JSON.stringify(n));return n;});}
      if(key==="hist"){const p=parseHist(wb);setHIST(prev=>{const n={...prev,...p};LS.set("cp_hist",JSON.stringify(n));return n;});}
      const ns={...upStat,[key]:{name:file.name,time:new Date().toLocaleTimeString("th-TH"),ok:true}};setUpStat(ns);LS.set("cp_up",JSON.stringify(ns));
    }catch(e){const ns={...upStat,[key]:{name:file.name,ok:false,err:e.message}};setUpStat(ns);}
  };
  return(
    <div>
      <div style={{fontFamily:"Barlow Condensed",fontWeight:900,fontSize:22,color:"#f59e0b",letterSpacing:2,marginBottom:6}}>📁 อัพโหลด Excel — อัพเดทข้อมูลทุกเดือน</div>
      <div style={{fontSize:13,color:"#6b7280",marginBottom:18}}>อัพโหลด Excel ได้เลย ระบบอ่านและอัพเดทแดชบอร์ดทันที — <strong style={{color:"#22c55e"}}>ข้อมูลบันทึกถาวรใน browser (localStorage)</strong></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:22}}>
        {FDEFS.map(fd=>{const st=upStat[fd.key];return(
          <div key={fd.key} style={{background:"#1a1f2e",border:`1px solid ${st?.ok?"#22c55e":st?.ok===false?"#ef4444":"#2d3548"}`,borderRadius:10,padding:18}}>
            <div style={{fontFamily:"Barlow Condensed",fontWeight:700,fontSize:15,marginBottom:3}}>{fd.icon} {fd.label}</div>
            <div style={{fontSize:11,color:"#6b7280",marginBottom:12}}>{fd.hint}</div>
            {st&&<div style={{fontSize:12,marginBottom:10,color:st.ok?"#22c55e":"#ef4444",background:st.ok?"#0d2a1a":"#2a0d0d",padding:"5px 10px",borderRadius:5}}>{st.ok?"✅":"❌"} {st.name} {st.time||""}</div>}
            <input ref={refs[fd.key]} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>handle(fd.key,e.target.files[0])}/>
            <button onClick={()=>refs[fd.key].current?.click()} style={{width:"100%",padding:"9px 0",background:"#1d4ed8",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontFamily:"Barlow Condensed",fontWeight:700,fontSize:13}}>📂 {st?.ok?"อัพโหลดใหม่":"เลือกไฟล์"}</button>
          </div>
        );})}
      </div>
      <div style={{background:"#131820",border:"1px solid #2d3548",borderRadius:10,padding:20}}>
        <div style={{fontFamily:"Barlow Condensed",fontWeight:700,fontSize:16,color:"#f59e0b",marginBottom:14}}>📋 ขั้นตอนอัพเดทข้อมูลทุกเดือน</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {[{n:"1",t:"ต้นเดือน — อัพโหลดเป้าใหม่",b:"อัพโหลด 'เป้าเดือน_Jun_2026.xlsx' ระบบอ่าน Sheet For_BI อัพเดทเป้าทันที"},
            {n:"2",t:"อัพเดทประวัติยอดขาย",b:"อัพโหลด 'ประวัติยอดขาย.xlsx' ที่มีข้อมูลเดือนก่อนเพิ่มเข้ามา"},
            {n:"3",t:"อัพโหลดยอดขายรายวัน",b:"อัพโหลด 'ยอดขายรายวัน.xlsx' และ 'ยอดขายยางรายวัน.xlsx'"},
            {n:"4",t:"กรอกยอดรายวัน Real-time",b:"เมนู ✏️ กรอกยอด → เลือกสาขา → เลือกวัน → กรอก แดชบอร์ดอัพเดททันที"},
          ].map(s=>(
            <div key={s.n} style={{display:"flex",gap:12}}>
              <div style={{width:28,height:28,background:"#f59e0b",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#000",flexShrink:0}}>{s.n}</div>
              <div><div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{s.t}</div><div style={{fontSize:12,color:"#6b7280",lineHeight:1.5}}>{s.b}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
