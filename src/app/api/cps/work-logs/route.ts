import { createWorkLog, listWorkLogs } from '@/lib/cps/supabase';
import { ok, fail, handleError } from '@/lib/cps/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const processId = url.searchParams.get('process_id') ?? undefined;
    return ok(await listWorkLogs(processId));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.process_id) return fail('process_id is required');
    if (!body?.started_at) return fail('started_at is required');
    return ok(await createWorkLog(body), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
