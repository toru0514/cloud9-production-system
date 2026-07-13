import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  computeAutomationRates,
  automationMeta,
  BUILTIN_AUTOMATION_LABELS,
  type LabelRate,
} from '@/lib/cps/automation';
import type { CpsProcess } from '@/types/cps';
import { cn } from '@/lib/utils';

function RateTile({ title, rate }: { title: string; rate: LabelRate }) {
  const meta = automationMeta(rate.label);
  const Icon = meta.icon;
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-background p-4">
      <div className="flex items-center gap-2">
        <span className={cn('rounded-md p-1.5', meta.solid)}>
          <Icon className="size-4" />
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold tabular-nums">
          {Math.round(rate.rate * 100)}
          <span className="ml-0.5 text-lg">%</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {rate.count} 工程
        </span>
      </div>
      {/* バー（工程数ベース） */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', meta.solid)}
          style={{ width: `${Math.min(100, rate.rate * 100)}%` }}
        />
      </div>
      <div className="text-[11px] text-muted-foreground">
        工数ベース {Math.round(rate.timeRate * 100)}%
      </div>
    </div>
  );
}

export function AutomationSummary({ processes }: { processes: CpsProcess[] }) {
  const rates = computeAutomationRates(processes);

  // 全区分の内訳（工程数）
  const counts = new Map<string, number>();
  for (const p of processes) {
    if (!p.automation) continue;
    counts.set(p.automation, (counts.get(p.automation) ?? 0) + 1);
  }
  const unset = processes.filter((p) => !p.automation).length;
  const orderedLabels = [
    ...BUILTIN_AUTOMATION_LABELS.filter((l) => counts.has(l)),
    ...[...counts.keys()].filter((l) => !BUILTIN_AUTOMATION_LABELS.includes(l)),
  ];
  const total = processes.length || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>自動化の進捗（アプリ化率・AI率・外注率）</span>
          <span className="text-xs font-normal text-muted-foreground">
            全 {rates.totalProcesses} 工程
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <RateTile title="アプリ化率" rate={rates.app} />
          <RateTile title="AI率" rate={rates.ai} />
          <RateTile title="外注率" rate={rates.outsource} />
        </div>

        {/* 全区分の内訳バー */}
        {orderedLabels.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex h-3 w-full overflow-hidden rounded-full border">
              {orderedLabels.map((label) => {
                const c = counts.get(label) ?? 0;
                return (
                  <div
                    key={label}
                    className={automationMeta(label).solid}
                    style={{ width: `${(c / total) * 100}%` }}
                    title={`${label}: ${c}工程`}
                  />
                );
              })}
              {unset > 0 && (
                <div
                  className="bg-muted"
                  style={{ width: `${(unset / total) * 100}%` }}
                  title={`未設定: ${unset}工程`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
              {orderedLabels.map((label) => (
                <span key={label} className="flex items-center gap-1">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      automationMeta(label).solid
                    )}
                  />
                  {label} {counts.get(label)}
                </span>
              ))}
              {unset > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="size-2 rounded-full bg-muted" />
                  未設定 {unset}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
