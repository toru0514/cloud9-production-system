import {
  createProcess,
  getProcessStatusItems,
  listProcesses,
} from '@/lib/cps/supabase';
import { ok, fail, handleError } from '@/lib/cps/api';

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.name) return fail('name is required');
    if (!body?.phase) return fail('phase is required');
    return ok(await createProcess(body), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
