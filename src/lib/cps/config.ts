// CPS 設定 / 環境変数の集約

export const cpsConfig = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.CPS_AI_MODEL ?? 'gemini-1.5-flash-latest',
  },
  bottleneck: {
    cautionRatio: Number(process.env.CPS_BOTTLENECK_CAUTION_RATIO ?? '1.1'),
    stopDays: Number(process.env.CPS_BOTTLENECK_STOP_DAYS ?? '7'),
  },
};

/** Supabase が設定済みか（未設定ならアプリは内蔵モックデータで動作する） */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    cpsConfig.supabase.url &&
      (cpsConfig.supabase.serviceRoleKey || cpsConfig.supabase.anonKey)
  );
}

/** Gemini が設定済みか */
export function isGeminiConfigured(): boolean {
  return Boolean(cpsConfig.ai.geminiApiKey);
}
