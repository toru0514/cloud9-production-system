import { statusMeta } from '@/lib/cps/utils/status';
import type { ProcessStatus } from '@/types/cps';
import { cn } from '@/lib/utils';

export function StatusDot({
  status,
  withLabel = false,
  className,
}: {
  status: ProcessStatus;
  withLabel?: boolean;
  className?: string;
}) {
  const meta = statusMeta[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('size-2.5 rounded-full', meta.dot)} />
      {withLabel && (
        <span className={cn('text-xs font-medium', meta.color)}>
          {meta.label}
        </span>
      )}
    </span>
  );
}
