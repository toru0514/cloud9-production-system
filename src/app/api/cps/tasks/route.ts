import { createTask, listTasks } from '@/lib/cps/supabase';
import { ok, fail, handleError } from '@/lib/cps/api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const today = url.searchParams.get('today') === '1';
    return ok(await listTasks({ today }));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.title) return fail('title is required');
    return ok(await createTask(body), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
