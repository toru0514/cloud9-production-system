// Supabase クライアント生成（サーバーサイド用）
// ソロ運用のため、API ルートでは service role key を使用する。

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cpsConfig, isSupabaseConfigured } from '@/lib/cps/config';

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }
  if (cached) return cached;
  const key =
    cpsConfig.supabase.serviceRoleKey || cpsConfig.supabase.anonKey;
  cached = createClient(cpsConfig.supabase.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
