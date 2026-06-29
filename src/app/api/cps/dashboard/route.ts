import { getDashboard } from '@/lib/cps/supabase';
import { ok, handleError } from '@/lib/cps/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok(await getDashboard());
  } catch (e) {
    return handleError(e);
  }
}
