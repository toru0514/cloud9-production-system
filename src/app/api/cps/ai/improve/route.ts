import { generateText } from '@/lib/cps/gemini';
import { buildImprovePrompt } from '@/lib/cps/prompts/improve';
import {
  createImprovement,
  getProcess,
  getProcessStatusItems,
  listImprovements,
} from '@/lib/cps/supabase';
import { ok, fail, handleError } from '@/lib/cps/api';

export const dynamic = 'force-dynamic';

interface ImproveRequest {
  process_id: string;
  context?: {
    process_name?: string;
    standard_minutes?: number | null;
    recent_avg_minutes?: number | null;
    tools?: string[];
    past_improvements?: string[];
  };
  save?: boolean; // 既定 true: 結果を改善記録(proposed)として保存
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ImproveRequest;
    if (!body?.process_id) return fail('process_id is required');

    const process = await getProcess(body.process_id);
    if (!process) return fail('process not found', 404);

    // context が無ければサーバー側で補完
    let recentAvg = body.context?.recent_avg_minutes ?? null;
    if (recentAvg == null) {
      const items = await getProcessStatusItems();
      recentAvg =
        items.find((i) => i.process.id === process.id)?.recent_avg_minutes ??
        null;
    }
    const pastImprovements =
      body.context?.past_improvements ??
      (await listImprovements(process.id)).map((i) => i.title);

    const prompt = buildImprovePrompt({
      process_name: body.context?.process_name ?? process.name,
      standard_minutes:
        body.context?.standard_minutes ?? process.standard_minutes,
      recent_avg_minutes: recentAvg,
      tools: body.context?.tools ?? process.tools ?? [],
      past_improvements: pastImprovements,
    });

    const result = await generateText(prompt);

    let savedTo: string | null = null;
    if (body.save !== false) {
      const saved = await createImprovement({
        process_id: process.id,
        title: `AI改善案 (${process.name})`,
        status: 'proposed',
        ai_suggestion: result.text,
        before_desc: recentAvg
          ? `実績平均 ${recentAvg}分 / 標準 ${process.standard_minutes ?? '未設定'}分`
          : null,
      });
      savedTo = saved.id;
    }

    return ok({
      suggestion: result.text,
      mocked: result.mocked,
      saved_to: savedTo,
    });
  } catch (e) {
    return handleError(e);
  }
}
