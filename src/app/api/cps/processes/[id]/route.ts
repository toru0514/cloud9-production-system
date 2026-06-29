import { deleteProcess, getProcess, updateProcess } from '@/lib/cps/supabase';
import { ok, fail, handleError } from '@/lib/cps/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const process = await getProcess(id);
    if (!process) return fail('process not found', 404);
    return ok(process);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patch = await req.json();
    return ok(await updateProcess(id, patch));
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteProcess(id);
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
