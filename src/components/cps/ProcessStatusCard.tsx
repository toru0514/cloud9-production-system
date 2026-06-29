import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { statusMeta } from '@/lib/cps/utils/status';
import { formatMinutes } from '@/lib/cps/utils/kpi';
import type { CpsProcessStatusItem } from '@/types/cps';
import { cn } from '@/lib/utils';

export function ProcessStatusCard({ item }: { item: CpsProcessStatusItem }) {
  const { process, recent_avg_minutes, status } = item;
  const meta = statusMeta[status];
  const ratio =
    process.standard_minutes && recent_avg_minutes
      ? recent_avg_minutes / process.standard_minutes
      : null;

  return (
    <Link
      href={`/process/${process.id}`}
      className={cn(
        'group flex items-center justify-between rounded-lg border bg-background p-3 transition-colors hover:bg-accent',
        status === 'stopped' && 'border-red-300 dark:border-red-900',
        status === 'caution' && 'border-amber-300 dark:border-amber-900'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn('size-3 shrink-0 rounded-full', meta.dot)} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{process.name}</div>
          <div className="text-xs text-muted-foreground">
            標準 {process.standard_minutes ? formatMinutes(process.standard_minutes) : '—'}
            {' / '}
            実績{' '}
            {recent_avg_minutes != null
              ? formatMinutes(recent_avg_minutes)
              : '—'}
            {ratio != null && (
              <span className={cn('ml-1 font-medium', meta.color)}>
                ({ratio.toFixed(2)}×)
              </span>
            )}
          </div>
        </div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
