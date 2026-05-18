// ════════════════════════════════════════════════════════
//  SUPABASE CONFIG  —  ใส่ค่าจาก Supabase Dashboard
//  Settings → API → Project URL & anon/public key
//  ดูขั้นตอนได้ที่เมนู ⚙️ ตั้งค่า ในแดชบอร์ด
// ════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'PASTE_YOUR_PROJECT_URL_HERE'
const SUPABASE_ANON = 'PASTE_YOUR_ANON_KEY_HERE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
