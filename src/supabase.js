// ════════════════════════════════════════════════════════
//  SUPABASE CONFIG
//  Project: rslxffftnpmzyzssxqql
//
//  2026-07-12 — เปลี่ยนจาก legacy anon key (JWT) มาใช้ publishable key
//  เหตุผล: client เก่าที่ยังเปิดค้างอยู่ตามสาขา ฝัง anon key เดิมไว้ในโค้ดที่โหลดไปแล้ว
//          และยัง poll ข้อมูลรัวๆ ทุก 1-5 วินาที ทำให้ egress พุ่งจนเกินโควต้า
//          และ API ตอบ 503 — deploy โค้ดใหม่เฉยๆ ไม่ทำให้ client เก่าหยุด
//  วิธีแก้: ย้ายมาใช้ key ใหม่ตัวนี้ → deploy → แล้วปิด legacy anon key ทิ้ง
//          client เก่าจะยิงไม่เข้าทันที (401) และหยุดกวนเองทุกเครื่อง
//  หมายเหตุ: ทุกเครื่องต้องรีโหลดแอป 1 ครั้งเพื่อรับโค้ด+key ใหม่
// ════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rslxffftnpmzyzssxqql.supabase.co'
const SUPABASE_KEY = 'sb_publishable_DxaxdqMUjtIsW9TwhUHlyw_OTnhNT9y'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ════════════════════════════════════════════════════════
//  TireTrack (แอปจองยาง) — project แยกต่างหาก (yigveyqcfzkxjzsrlger)
//  ใช้ client อ่านอย่างเดียว (read-only) เพื่อดึงยอดจองยางมาโชว์ในแท็บ "จองยาง"
//  key นี้คือ anon key เดียวกับที่แอปจองยางใช้เชื่อมต่อโปรเจกต์ตัวเอง (public, อ่านได้ผ่าน RLS อยู่แล้ว)
// ════════════════════════════════════════════════════════
const TT_URL = 'https://yigveyqcfzkxjzsrlger.supabase.co'
const TT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZ3ZleXFjZnpreGp6c3JsZ2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjYzMjUsImV4cCI6MjA5NDYwMjMyNX0.5fkhW2ITHwuF2KCLcbY9Eo2E6-eTnuk8B-vTVSMRXbQ'

export const ttSupabase = createClient(TT_URL, TT_KEY, { auth: { persistSession: false } })
