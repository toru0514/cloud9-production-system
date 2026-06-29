import { listKpiDaily } from '@/lib/cps/supabase';
import { ok, handleError } from '@/lib/cps/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const days = Number(url.searchParams.get('days') ?? '30');
    return ok(await listKpiDaily(Number.isFinite(days) ? days : 30));
  } catch (e) {
    return handleError(e);
  }
}
