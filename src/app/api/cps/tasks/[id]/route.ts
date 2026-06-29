import { updateTask } from '@/lib/cps/supabase';
import { ok, handleError } from '@/lib/cps/api';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patch = await req.json();
    return ok(await updateTask(id, patch));
  } catch (e) {
    return handleError(e);
  }
}
