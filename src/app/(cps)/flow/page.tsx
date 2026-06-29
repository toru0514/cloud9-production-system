import { getProcessStatusItems } from '@/lib/cps/supabase';
import { FlowCanvas } from '@/components/cps/FlowCanvas';
import { StatusDot } from '@/components/cps/StatusDot';

export const dynamic = 'force-dynamic';

export default async function FlowPage() {
  const items = await getProcessStatusItems();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">工程マップ</h2>
          <p className="text-sm text-muted-foreground">
            企画 → 製造 → コンテンツ → 販売。ノードをクリックで工程詳細へ。
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <StatusDot status="normal" /> 正常
          </span>
          <span className="flex items-center gap-1.5">
            <StatusDot status="caution" /> 改善候補
          </span>
          <span className="flex items-center gap-1.5">
            <StatusDot status="stopped" /> 停止
          </span>
        </div>
      </div>
      <FlowCanvas items={items} />
    </div>
  );
}
