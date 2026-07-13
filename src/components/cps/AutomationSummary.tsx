import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  automationDistribution,
  automationMeta,
  type DistItem,
} from '@/lib/cps/automation';
import type { CpsProcess } from '@/types/cps';
import { cn } from '@/lib/utils';
import { Circle } from 'lucide-react';

function Tile({ item }: { item: DistItem }) {
  const meta = item.isUnset ? null : automationMeta(item.label);
  const Icon = meta?.icon ?? Circle;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border bg-background p-3">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'rounded-md p-1',
            meta ? meta.solid : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="truncate text-xs font-medium">
          {item.label}
          {!item.isUnset && '率'}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold tabular-nums">
          {Math.round(item.rate * 100)}
          <span className="ml-0.5 text-sm">%</span>
        </span>
        <span className="text-[11px] text-muted-foreground">
          {item.count} 工程
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full',
            meta ? meta.solid : 'bg-muted-foreground/40'
          )}
          style={{ width: `${Math.min(100, item.rate * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function AutomationSummary({ processes }: { processes: CpsProcess[] }) {
  const { total, items } = automationDistribution(processes);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>自動化の内訳（合計100%）</span>
          <span className="text-xs font-normal text-muted-foreground">
            全 {total} 工程
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* 100% 積み上げバー */}
        <div className="flex h-4 w-full overflow-hidden rounded-full border">
          {items.map((it) => (
            <div
              key={it.label}
              className={
                it.isUnset ? 'bg-muted' : automationMeta(it.label).solid
              }
              style={{ width: `${it.rate * 100}%` }}
              title={`${it.label}: ${it.count}工程 (${Math.round(it.rate * 100)}%)`}
            />
          ))}
        </div>

        {/* 各区分のタイル（合計100%） */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((it) => (
            <Tile key={it.label} item={it} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
