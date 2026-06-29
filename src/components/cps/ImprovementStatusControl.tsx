'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiSend } from '@/lib/cps/client';
import type { ImprovementStatus } from '@/types/cps';
import { toast } from 'sonner';

export const improvementStatusLabel: Record<ImprovementStatus, string> = {
  proposed: '提案',
  in_progress: '実施中',
  done: '完了',
};

export function ImprovementStatusControl({
  id,
  status,
}: {
  id: string;
  status: ImprovementStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<ImprovementStatus>(status);
  const [, startTransition] = useTransition();

  const change = (next: ImprovementStatus) => {
    setValue(next);
    startTransition(async () => {
      try {
        const patch: Record<string, unknown> = { status: next };
        if (next === 'done') {
          patch.implemented_at = new Date().toISOString().slice(0, 10);
        }
        await apiSend(`/api/cps/improvements/${id}`, 'PATCH', patch);
        router.refresh();
      } catch (e) {
        toast.error((e as Error).message);
        setValue(status);
      }
    });
  };

  return (
    <Select value={value} onValueChange={(v) => change(v as ImprovementStatus)}>
      <SelectTrigger size="sm" className="h-7 w-24 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(
          ['proposed', 'in_progress', 'done'] as ImprovementStatus[]
        ).map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {improvementStatusLabel[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
