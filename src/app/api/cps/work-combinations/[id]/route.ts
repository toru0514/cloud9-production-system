import {
  deleteWorkCombination,
  getWorkCombination,
  updateWorkCombination,
} from '@/lib/cps/supabase';
import { ok, fail, handleError } from '@/lib/cps/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detail = await getWorkCombination(id);
    if (!detail) return fail('work combination not found', 404);
    return ok(detail);
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
    return ok(await updateWorkCombination(id, patch));
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
    await deleteWorkCombination(id);
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
