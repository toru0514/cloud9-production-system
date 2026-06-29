import { getProcessStatusItems, listProcesses } from '@/lib/cps/supabase';
import { ok, handleError } from '@/lib/cps/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get('with_status') === '1') {
      return ok(await getProcessStatusItems());
    }
    return ok(await listProcesses());
  } catch (e) {
    return handleError(e);
  }
}
