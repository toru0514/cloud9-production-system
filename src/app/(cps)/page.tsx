import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getDashboard } from '@/lib/cps/supabase';
import { KpiSummary } from '@/components/cps/KpiSummary';
import { TaskList } from '@/components/cps/TaskList';
import { ProcessStatusCard } from '@/components/cps/ProcessStatusCard';
import { StatusDot } from '@/components/cps/StatusDot';
import type { ProcessPhase } from '@/types/cps';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PHASE_ORDER: ProcessPhase[] = [
  '企画',
  '製造',
  'コンテンツ',
  '販売',
  '分析',
  '改善',
];

export default async function DashboardPage() {
  const dash = await getDashboard();

  // フェーズごとにグループ化
  const byPhase = PHASE_ORDER.map((phase) => ({
    phase,
    items: dash.process_statuses.filter((s) => s.process.phase === phase),
  })).filter((g) => g.items.length > 0);

  // フェーズの代表ステータス（最も悪いもの）
  const phaseStatus = (items: typeof dash.process_statuses) => {
    if (items.some((i) => i.status === 'stopped')) return 'stopped' as const;
    if (items.some((i) => i.status === 'caution')) return 'caution' as const;
    return 'normal' as const;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* KPI サマリ */}
      <KpiSummary summary={dash.kpi_summary} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        {/* 今日やること */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>今日やること</span>
              <span className="text-xs font-normal text-muted-foreground">
                未完了 {dash.kpi_summary.pending_tasks} 件
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TaskList initialTasks={dash.today_tasks} />
          </CardContent>
        </Card>

        {/* 工程ステータスマップ */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>工程ステータスマップ</span>
              <Link
                href="/flow"
                className="flex items-center gap-1 text-xs font-normal text-primary hover:underline"
              >
                工程マップ <ArrowRight className="size-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {byPhase.map(({ phase, items }) => (
              <div key={phase}>
                <div className="mb-2 flex items-center gap-2">
                  <StatusDot status={phaseStatus(items)} />
                  <h3 className="text-sm font-semibold">{phase}</h3>
                  <span className="text-xs text-muted-foreground">
                    {items.length} 工程
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((item) => (
                    <ProcessStatusCard key={item.process.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 改善候補（ボトルネック） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-500" />
            改善候補（ボトルネック）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dash.bottleneck_candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              標準時間を超過している工程はありません。
            </p>
          ) : (
            <div className="flex flex-col divide-y">
              {dash.bottleneck_candidates.map((b) => {
                const over = b.recent_avg_minutes - b.standard_minutes;
                return (
                  <Link
                    key={b.process_id}
                    href={`/process/${b.process_id}`}
                    className="flex items-center justify-between py-2.5 hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {b.process_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        標準 {b.standard_minutes}分 → 実績{' '}
                        {b.recent_avg_minutes}分
                      </span>
                    </div>
                    <span className="text-sm font-bold text-amber-600">
                      +{over}min（{b.over_ratio.toFixed(2)}×）
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
