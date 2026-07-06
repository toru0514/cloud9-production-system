import {
  deleteAutomationLabel,
  listAutomationLabelUsage,
  renameAutomationLabel,
} from '@/lib/cps/supabase';
import { ok, fail, handleError } from '@/lib/cps/api';
import {
  isBuiltinAutomationLabel,
  isValidAutomationLabel,
} from '@/lib/cps/automation';

export const dynamic = 'force-dynamic';

// 全区分の使用状況（管理UI用）
export async function GET() {
  try {
    return ok(await listAutomationLabelUsage());
  } catch (e) {
    return handleError(e);
  }
}

// カスタム区分のリネーム { from, to }
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const from = typeof body?.from === 'string' ? body.from.trim() : '';
    if (!from) return fail('from is required');
    if (isBuiltinAutomationLabel(from)) {
      return fail('組込みの区分は変更できません');
    }
    if (!isValidAutomationLabel(body?.to)) {
      return fail('新しい区分名は1〜20文字で指定してください');
    }
    const to = (body.to as string).trim();
    if (to === from) return ok({ processes: 0, logs: 0 });
    return ok(await renameAutomationLabel(from, to));
  } catch (e) {
    return handleError(e);
  }
}

// カスタム区分の削除 { label }
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const label = typeof body?.label === 'string' ? body.label.trim() : '';
    if (!label) return fail('label is required');
    if (isBuiltinAutomationLabel(label)) {
      return fail('組込みの区分は削除できません');
    }
    return ok(await deleteAutomationLabel(label));
  } catch (e) {
    return handleError(e);
  }
}
