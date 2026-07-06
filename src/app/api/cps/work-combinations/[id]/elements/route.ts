import { replaceWorkElements } from '@/lib/cps/supabase';
import type { WorkElementInput } from '@/lib/cps/supabase';
import { ok, fail, handleError } from '@/lib/cps/api';

export const dynamic = 'force-dynamic';

// 編集後の作業要素を総入れ替えする（差分ではなく全置換）。
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const raw = Array.isArray(body?.elements) ? body.elements : null;
    if (!raw) return fail('elements array is required');
    const elements: WorkElementInput[] = raw.map(
      (e: Partial<WorkElementInput>, i: number) => ({
        seq: Number(e.seq ?? i + 1),
        name: String(e.name ?? '').trim() || `作業${i + 1}`,
        manual_seconds: Math.max(0, Number(e.manual_seconds) || 0),
        auto_seconds: Math.max(0, Number(e.auto_seconds) || 0),
        walk_seconds: Math.max(0, Number(e.walk_seconds) || 0),
        sort_order: Number(e.sort_order ?? i + 1),
      })
    );
    return ok(await replaceWorkElements(id, elements));
  } catch (e) {
    return handleError(e);
  }
}
