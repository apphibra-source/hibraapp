import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── DB row types ───────────────────────────────────────────────────────────────

export interface UserScoreRow {
  address: string
  score: number
  swap_count: number
  volume_usd: number
  consecutive_days: number
  last_activity: string
}

export interface SwapRecordRow {
  id: string
  user_address: string
  token_in: string
  token_out: string
  amount_in: string
  amount_out: string
  dex: string
  tx_hash: string
  volume_usd: number
  score_earned: number
  created_at: string
}
