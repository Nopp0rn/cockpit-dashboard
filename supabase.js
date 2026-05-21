// ════════════════════════════════════════════════════════
//  SUPABASE CONFIG
//  Project: rslxffftnpmzyzssxqql
// ════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://rslxffftnpmzyzssxqql.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbHhmZmZ0bnBtenl6c3N4cXFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjUwNTQsImV4cCI6MjA5NDYwMTA1NH0.ke4Ft4cba7ujOrAQxos-JjdQwMzx1caF_R_3KxYnuEc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
