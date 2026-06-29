import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { listKpiDaily } from '@/lib/cps/supabase';
import {
  formatMinutes,
  formatYen,
  startOfMonth,
  startOfWeek,
  sumKpi,
} from '@/lib/cps/utils/kpi';

export const dynamic = 'force-dynamic';

export default async function KpiPage() {
  const rows = await listKpiDaily(30);
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const summary = [
    {
      label: '今週の制作時間',
      value: formatMinutes(sumKpi(rows, weekStart, 'total_work_minutes')),
    },
    {
      label: '今月の制作時間',
      value: formatMinutes(sumKpi(rows, monthStart, 'total_work_minutes')),
    },
    {
      label: '今月の売上',
      value: formatYen(sumKpi(rows, monthStart, 'revenue')),
    },
    {
      label: '今月の完成数',
      value: `${sumKpi(rows, monthStart, 'products_completed')} 個`,
    },
    {
      label: '今月の投稿数',
      value: `${sumKpi(rows, monthStart, 'posts_published')} 件`,
    },
    {
      label: '今月のAI利用',
      value: `${sumKpi(rows, monthStart, 'ai_usage_count')} 回`,
    },
  ];

  const maxWork = Math.max(1, ...rows.map((r) => r.total_work_minutes));
  const maxRev = Math.max(1, ...rows.map((r) => r.revenue));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">KPI 分析</h2>
        <p className="text-sm text-muted-foreground">直近30日の推移</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardContent className="px-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-xl font-bold tabular-nums">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">制作時間（分 / 日）</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            rows={rows.map((r) => ({
              date: r.date,
              value: r.total_work_minutes,
            }))}
            max={maxWork}
            color="bg-sky-500"
            unit="分"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">売上（円 / 日）</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            rows={rows.map((r) => ({ date: r.date, value: r.revenue }))}
            max={maxRev}
            color="bg-amber-500"
            unit="円"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function BarChart({
  rows,
  max,
  color,
  unit,
}: {
  rows: { date: string; value: number }[];
  max: number;
  color: string;
  unit: string;
}) {
  return (
    <div className="flex h-40 items-end gap-0.5">
      {rows.map((r) => (
        <div
          key={r.date}
          className="group relative flex flex-1 flex-col items-center justify-end"
          title={`${r.date}: ${r.value.toLocaleString()}${unit}`}
        >
          <div
            className={`w-full rounded-t ${color} transition-all`}
            style={{ height: `${(r.value / max) * 100}%` }}
          />
          <div className="pointer-events-none absolute -top-6 hidden whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
            {r.value.toLocaleString()}
            {unit}
          </div>
        </div>
      ))}
    </div>
  );
}
