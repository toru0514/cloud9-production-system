import { getProcess, listAutomationLogs, setAutomation } from '@/lib/cps/supabase';
import { ok, fail, handleError } from '@/lib/cps/api';
import { isValidAutomationLabel } from '@/lib/cps/automation';

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
    if (!isValidAutomationLabel(body?.label)) {
      return fail('label は1〜20文字で指定してください');
    }
    const label = (body.label as string).trim();
    const note =
      typeof body?.note === 'string' && body.note.trim()
        ? body.note.trim()
        : null;
    const process = await getProcess(id);
    if (!process) return fail('process not found', 404);
    const result = await setAutomation(id, label, note);
    return ok(result, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
