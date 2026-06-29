import { Card, CardContent } from '@/components/ui/card';
import { formatMinutes, formatYen } from '@/lib/cps/utils/kpi';
import type { CpsDashboard } from '@/types/cps';
import { Clock, JapaneseYen, Package, Send } from 'lucide-react';

export function KpiSummary({
  summary,
}: {
  summary: CpsDashboard['kpi_summary'];
}) {
  const cards = [
    {
      label: '今週の制作時間',
      value: formatMinutes(summary.this_week_work_minutes),
      icon: Clock,
      tint: 'text-sky-600',
    },
    {
      label: '今月の投稿数',
      value: `${summary.this_month_posts_published} 件`,
      icon: Send,
      tint: 'text-violet-600',
    },
    {
      label: '今月の完成数',
      value: `${summary.this_month_products_completed} 個`,
      icon: Package,
      tint: 'text-emerald-600',
    },
    {
      label: '今月の売上',
      value: formatYen(summary.this_month_revenue),
      icon: JapaneseYen,
      tint: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="flex items-center gap-3 px-4">
            <div className="rounded-md bg-muted p-2">
              <c.icon className={`size-5 ${c.tint}`} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs text-muted-foreground">
                {c.label}
              </div>
              <div className="truncate text-lg font-bold tabular-nums">
                {c.value}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
