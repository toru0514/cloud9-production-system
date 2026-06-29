import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getDashboard } from '@/lib/cps/supabase';
import { KpiSummary } from '@/components/cps/KpiSummary';
import { ProcessBoard } from '@/components/cps/ProcessBoard';
import { ProcessEditForm } from '@/components/cps/ProcessEditForm';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Flame, Plus, Workflow } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const dash = await getDashboard();
  const top = dash.bottleneck_candidates[0];

  return (
    <div className="flex flex-col gap-6">
      {/* 見出し */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">工程フローマップ</h2>
          <p className="text-sm text-muted-foreground">
            上流から下流へ。どの工程が・どんな流れで・どこが詰まっているかを把握し、ここから整理していく。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/flow">
            <Button variant="outline">
              <Workflow className="size-4" /> 図で見る
            </Button>
          </Link>
          <ProcessEditForm
            trigger={
              <Button>
                <Plus className="size-4" /> 工程を追加
              </Button>
            }
          />
        </div>
      </div>

      {/* ボトルネックの強調 */}
      {top ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/50">
              <Flame className="size-5 text-red-600" />
            </div>
            <div>
              <div className="text-xs font-medium text-red-600">
                いまのボトルネック
              </div>
              <Link
                href={`/process/${top.process_id}`}
                className="text-lg font-bold hover:underline"
              >
                {top.process_name}
              </Link>
              <span className="ml-2 text-sm text-muted-foreground">
                標準 {top.standard_minutes}分 → 実績 {top.recent_avg_minutes}分
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-red-600 tabular-nums">
              {top.over_ratio.toFixed(2)}×
            </div>
            <div className="text-xs text-muted-foreground">
              +{top.recent_avg_minutes - top.standard_minutes}分 / 標準比
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <AlertTriangle className="size-4" />
          標準時間を超過している工程はまだありません（または実績が未記録）。
        </div>
      )}

      {/* 工程フローボード（編集可能） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>工程フロー（クリックで詳細・ホバーで並べ替え/編集）</span>
            <span className="text-xs font-normal text-muted-foreground">
              {dash.process_statuses.length} 工程
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProcessBoard items={dash.process_statuses} />
        </CardContent>
      </Card>

      {/* ボトルネック候補一覧 */}
      {dash.bottleneck_candidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-amber-500" />
              ボトルネック候補（標準時間を超過している工程）
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                        標準 {b.standard_minutes}分 → 実績 {b.recent_avg_minutes}分
                      </span>
                    </div>
                    <span className="text-sm font-bold text-amber-600">
                      +{over}min（{b.over_ratio.toFixed(2)}×）
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI（参考） */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
          KPI（参考）
        </h3>
        <KpiSummary summary={dash.kpi_summary} />
      </div>
    </div>
  );
}
