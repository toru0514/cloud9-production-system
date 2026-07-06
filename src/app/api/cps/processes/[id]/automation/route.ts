import { getProcess, listAutomationLogs, setAutomation } from '@/lib/cps/supabase';
import { ok, fail, handleError } from '@/lib/cps/api';
import { isAutomationLabel } from '@/lib/cps/automation';

export const dynamic = 'force-dynamic';

// 自動化区分の変更履歴（新しい順）
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const process = await getProcess(id);
    if (!process) return fail('process not found', 404);
    return ok(await listAutomationLogs(id));
  } catch (e) {
    return handleError(e);
  }
}

// 現状の区分を変更し、履歴を1行追加
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!isAutomationLabel(body?.label)) {
      return fail('label must be one of 手作業/治具化/自動化/外注');
    }
    const note =
      typeof body?.note === 'string' && body.note.trim()
        ? body.note.trim()
        : null;
    const process = await getProcess(id);
    if (!process) return fail('process not found', 404);
    const result = await setAutomation(id, body.label, note);
    return ok(result, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
