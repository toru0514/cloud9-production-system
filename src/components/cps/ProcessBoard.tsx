'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ProcessEditForm } from '@/components/cps/ProcessEditForm';
import { apiSend } from '@/lib/cps/client';
import { PHASE_ORDER, PHASE_DESC } from '@/lib/cps/phases';
import { statusMeta } from '@/lib/cps/utils/status';
import { formatMinutes } from '@/lib/cps/utils/kpi';
import type { CpsProcessStatusItem, ProcessPhase } from '@/types/cps';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Pencil,
  Plus,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';

export function ProcessBoard({ items }: { items: CpsProcessStatusItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // ボトルネック工程（標準比が最大、かつ 1 超）
  const ranked = items
    .filter(
      (i) =>
        i.process.standard_minutes != null &&
        i.recent_avg_minutes != null &&
        i.recent_avg_minutes > i.process.standard_minutes
    )
    .map((i) => ({
      id: i.process.id,
      ratio: i.recent_avg_minutes! / i.process.standard_minutes!,
    }))
    .sort((a, b) => b.ratio - a.ratio);
  const bottleneckId = ranked[0]?.id;

  const byPhase = (phase: ProcessPhase) =>
    items
      .filter((i) => i.process.phase === phase)
      .sort((a, b) => a.process.sort_order - b.process.sort_order);

  const move = async (item: CpsProcessStatusItem, dir: 'up' | 'down') => {
    const list = byPhase(item.process.phase);
    const idx = list.findIndex((i) => i.process.id === item.process.id);
    const neighbor = list[dir === 'up' ? idx - 1 : idx + 1];
    if (!neighbor) return;
    setBusy(true);
    try {
      await Promise.all([
        apiSend(`/api/cps/processes/${item.process.id}`, 'PATCH', {
          sort_order: neighbor.process.sort_order,
        }),
        apiSend(`/api/cps/processes/${neighbor.process.id}`, 'PATCH', {
          sort_order: item.process.sort_order,
        }),
      ]);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {PHASE_ORDER.map((phase, pi) => {
        const list = byPhase(phase);
        return (
          <div key={phase} className="flex items-stretch gap-3">
            <div className="flex w-64 shrink-0 flex-col rounded-xl border bg-muted/30 p-2">
              {/* フェーズ見出し */}
              <div className="flex items-center justify-between px-1 py-1.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                      {pi + 1}
                    </span>
                    <span className="text-sm font-bold">{phase}</span>
                    <span className="text-xs text-muted-foreground">
                      {list.length}
                    </span>
                  </div>
                  <p className="pl-7 text-[11px] text-muted-foreground">
                    {PHASE_DESC[phase]}
                  </p>
                </div>
                <ProcessEditForm
                  presetPhase={phase}
                  trigger={
                    <button
                      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="工程を追加"
                    >
                      <Plus className="size-4" />
                    </button>
                  }
                />
              </div>

              {/* 工程カード */}
              <div className="flex flex-col gap-1.5">
                {list.length === 0 && (
                  <ProcessEditForm
                    presetPhase={phase}
                    trigger={
                      <button className="rounded-lg border border-dashed py-4 text-xs text-muted-foreground hover:bg-accent">
                        + 最初の工程を追加
                      </button>
                    }
                  />
                )}
                {list.map((item, idx) => {
                  const { process, recent_avg_minutes, status } = item;
                  const meta = statusMeta[status];
                  const ratio =
                    process.standard_minutes && recent_avg_minutes
                      ? recent_avg_minutes / process.standard_minutes
                      : null;
                  const isBottleneck = process.id === bottleneckId;
                  return (
                    <div key={process.id}>
                      <div
                        className={cn(
                          'group relative overflow-hidden rounded-lg border bg-background p-2 shadow-sm',
                          isBottleneck && 'ring-2 ring-red-400'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute left-0 top-0 h-full w-1',
                            meta.dot
                          )}
                        />
                        <div className="flex items-start justify-between gap-1 pl-1.5">
                          <Link
                            href={`/process/${process.id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {process.name}
                          </Link>
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              disabled={busy || idx === 0}
                              onClick={() => move(item, 'up')}
                              className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                              title="上へ"
                            >
                              <ChevronUp className="size-3.5" />
                            </button>
                            <button
                              disabled={busy || idx === list.length - 1}
                              onClick={() => move(item, 'down')}
                              className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                              title="下へ"
                            >
                              <ChevronDown className="size-3.5" />
                            </button>
                            <ProcessEditForm
                              process={process}
                              trigger={
                                <button
                                  className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                                  title="編集"
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                              }
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pl-1.5 pt-0.5">
                          <span className="text-[11px] text-muted-foreground">
                            標準{' '}
                            {process.standard_minutes
                              ? formatMinutes(process.standard_minutes)
                              : '—'}
                            {recent_avg_minutes != null && (
                              <> / 実績 {formatMinutes(recent_avg_minutes)}</>
                            )}
                          </span>
                          {ratio != null && (
                            <span
                              className={cn(
                                'text-[11px] font-bold tabular-nums',
                                meta.color
                              )}
                            >
                              {ratio.toFixed(2)}×
                            </span>
                          )}
                        </div>
                        {isBottleneck && (
                          <div className="mt-1 flex items-center gap-1 pl-1.5 text-[10px] font-bold text-red-600">
                            <Flame className="size-3" /> ボトルネック
                          </div>
                        )}
                      </div>
                      {idx < list.length - 1 && (
                        <div className="flex justify-center py-0.5 text-muted-foreground/50">
                          <ArrowDown className="size-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* フェーズ間の流れ矢印 */}
            {pi < PHASE_ORDER.length - 1 && (
              <div className="flex items-center self-center text-muted-foreground">
                <ArrowRight className="size-6" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
