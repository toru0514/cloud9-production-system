'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProcessEditForm } from '@/components/cps/ProcessEditForm';
import { apiSend } from '@/lib/cps/client';
import { PHASE_ORDER, PHASE_DESC } from '@/lib/cps/phases';
import { statusMeta } from '@/lib/cps/utils/status';
import { formatMinutes } from '@/lib/cps/utils/kpi';
import type { CpsProcessStatusItem, ProcessPhase } from '@/types/cps';
import { cn } from '@/lib/utils';
import { ArrowRight, Pencil, Plus, Flame, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

type Item = CpsProcessStatusItem;
interface Step {
  sortOrder: number;
  items: Item[];
}

export function ProcessBoard({ items }: { items: Item[] }) {
  const router = useRouter();
  const [local, setLocal] = useState<Item[]>(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sig = items
    .map(
      (i) =>
        `${i.process.id}:${i.process.phase}:${i.process.sort_order}:${i.process.route ?? ''}`
    )
    .join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setLocal(items), [sig]);

  const knownRoutes = [
    ...new Set(
      items.map((i) => i.process.route).filter((r): r is string => Boolean(r))
    ),
  ];

  const bottleneckId = useMemo(() => {
    const r = items
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
    return r[0]?.id;
  }, [items]);

  // フェーズをステップ（縦の段）に分解。同じ sort_order = 並行ノード
  const stepsOf = (arr: Item[], phase: string): Step[] => {
    const map = new Map<number, Item[]>();
    arr
      .filter((i) => i.process.phase === phase)
      .forEach((i) => {
        const k = i.process.sort_order;
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(i);
      });
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([sortOrder, list]) => ({
        sortOrder,
        items: list.sort(
          (a, b) =>
            (a.process.route ?? '').localeCompare(b.process.route ?? '') ||
            a.process.name.localeCompare(b.process.name)
        ),
      }));
  };

  // ステップ番号を base+idx*10 にきれいに振り直す（並行は同値を共有）
  const renumber = (arr: Item[], phase: string) => {
    const base = (PHASE_ORDER.indexOf(phase as ProcessPhase) + 1) * 1000;
    stepsOf(arr, phase).forEach((step, idx) =>
      step.items.forEach((i) => {
        i.process.sort_order = base + idx * 10;
      })
    );
  };

  const persist = async (next: Item[]) => {
    const orig = new Map(items.map((i) => [i.process.id, i.process]));
    const changed = next.filter((i) => {
      const o = orig.get(i.process.id);
      if (!o) return false;
      return o.phase !== i.process.phase || o.sort_order !== i.process.sort_order;
    });
    if (!changed.length) return;
    setBusy(true);
    try {
      await Promise.all(
        changed.map((i) =>
          apiSend(`/api/cps/processes/${i.process.id}`, 'PATCH', {
            phase: i.process.phase,
            sort_order: i.process.sort_order,
          })
        )
      );
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const clone = () => local.map((i) => ({ ...i, process: { ...i.process } }));

  // 既存ステップに合流（並行ノード化）
  const joinStep = (phase: string, stepSortOrder: number) => {
    const id = dragId;
    reset();
    if (!id) return;
    const next = clone();
    const dragged = next.find((i) => i.process.id === id);
    if (!dragged) return;
    if (dragged.process.phase === phase && dragged.process.sort_order === stepSortOrder)
      return;
    const src = dragged.process.phase;
    dragged.process.phase = phase as ProcessPhase;
    dragged.process.sort_order = stepSortOrder;
    renumber(next, phase);
    if (src !== phase) renumber(next, src);
    setLocal(next);
    void persist(next);
  };

  // ステップ間に新しいステップとして挿入（gapIndex: 0..stepCount）
  const insertStep = (phase: string, gapIndex: number) => {
    const id = dragId;
    reset();
    if (!id) return;
    const next = clone();
    const dragged = next.find((i) => i.process.id === id);
    if (!dragged) return;
    const src = dragged.process.phase;
    const others = next.filter((i) => i.process.id !== id);
    const otherSteps = stepsOf(others, phase);
    let so: number;
    if (otherSteps.length === 0) so = 0;
    else if (gapIndex <= 0) so = otherSteps[0].sortOrder - 1;
    else if (gapIndex >= otherSteps.length)
      so = otherSteps[otherSteps.length - 1].sortOrder + 1;
    else so = (otherSteps[gapIndex - 1].sortOrder + otherSteps[gapIndex].sortOrder) / 2;
    dragged.process.phase = phase as ProcessPhase;
    dragged.process.sort_order = so;
    renumber(next, phase);
    if (src !== phase) renumber(next, src);
    setLocal(next);
    void persist(next);
  };

  const reset = () => {
    setDragId(null);
    setOverKey(null);
  };

  /* ---------- カード ---------- */
  const Card = ({ item, compact }: { item: Item; compact?: boolean }) => {
    const { process, recent_avg_minutes, status } = item;
    const meta = statusMeta[status];
    const ratio =
      process.standard_minutes && recent_avg_minutes
        ? recent_avg_minutes / process.standard_minutes
        : null;
    const isBottleneck = process.id === bottleneckId;
    const isDragging = dragId === process.id;
    return (
      <div
        draggable
        onDragStart={(e) => {
          setDragId(process.id);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', process.id);
        }}
        onDragEnd={reset}
        className={cn(
          'group relative cursor-grab overflow-hidden rounded-lg border bg-background p-2 shadow-sm active:cursor-grabbing',
          compact ? 'w-44' : 'w-60',
          isBottleneck && 'ring-2 ring-red-400',
          isDragging && 'opacity-40'
        )}
      >
        <span className={cn('absolute left-0 top-0 h-full w-1', meta.dot)} />
        <div className="flex items-start justify-between gap-1 pl-1.5">
          <div className="flex min-w-0 items-center gap-1">
            <GripVertical className="size-3.5 shrink-0 text-muted-foreground/40" />
            <Link
              href={`/process/${process.id}`}
              draggable={false}
              className="truncate text-sm font-medium hover:underline"
            >
              {process.name}
            </Link>
          </div>
          <ProcessEditForm
            process={process}
            knownRoutes={knownRoutes}
            trigger={
              <button
                className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                title="編集"
              >
                <Pencil className="size-3.5" />
              </button>
            }
          />
        </div>
        <div className="flex items-center justify-between gap-1 pl-1.5 pt-0.5">
          <span className="truncate text-[11px] text-muted-foreground">
            {process.route && (
              <span className="mr-1 rounded bg-muted px-1 text-[10px]">
                {process.route}
              </span>
            )}
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
                'shrink-0 text-[11px] font-bold tabular-nums',
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
    );
  };

  /* ---------- ステップ間の挿入用 gap ---------- */
  const Gap = ({
    phase,
    gapIndex,
    top,
  }: {
    phase: ProcessPhase;
    gapIndex: number;
    top?: boolean;
  }) => {
    const key = `gap:${phase}:${gapIndex}`;
    const over = overKey === key;
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOverKey(key);
        }}
        onDragLeave={() => setOverKey((k) => (k === key ? null : k))}
        onDrop={(e) => {
          e.preventDefault();
          insertStep(phase, gapIndex);
        }}
        className="flex w-full items-center justify-center"
        style={{ height: top ? 14 : 22 }}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded transition-all',
            over
              ? 'h-6 w-full border-2 border-dashed border-primary bg-primary/10 text-primary'
              : 'h-full text-muted-foreground/40'
          )}
        >
          {over ? (
            <span className="text-[10px] font-medium">ここに新ステップ</span>
          ) : top ? null : (
            <span className="text-base leading-none">↓</span>
          )}
        </div>
      </div>
    );
  };

  /* ---------- ステップ（並行ノードのまとまり） ---------- */
  const StepRow = ({
    phase,
    step,
  }: {
    phase: ProcessPhase;
    step: Step;
  }) => {
    const key = `step:${phase}:${step.sortOrder}`;
    const over = overKey === key;
    const parallel = step.items.length > 1;
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOverKey(key);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          joinStep(phase, step.sortOrder);
        }}
        className={cn(
          'flex flex-col items-center rounded-lg p-1 transition-colors',
          over && 'bg-primary/10 ring-2 ring-primary/40'
        )}
      >
        {parallel && (
          <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-violet-600">
            <span className="h-px w-6 bg-violet-300" />
            並行 {step.items.length}
            <span className="h-px w-6 bg-violet-300" />
          </div>
        )}
        <div className="flex flex-wrap items-stretch justify-center gap-2">
          {step.items.map((item) => (
            <Card key={item.process.id} item={item} compact={parallel} />
          ))}
          <ProcessEditForm
            presetPhase={phase}
            presetSortOrder={step.sortOrder}
            knownRoutes={knownRoutes}
            trigger={
              <button
                className="flex w-9 items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-accent"
                title="このステップに並行ノードを追加"
              >
                <Plus className="size-4" />
              </button>
            }
          />
        </div>
      </div>
    );
  };

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        💡 カードをドラッグ → <b>別カードに重ねると並行</b>（分岐）、
        <b>段の間にドロップで新しいステップ</b>。フェーズをまたぐ移動も可。
      </p>
      <div className="flex items-start gap-3 overflow-x-auto pb-3">
        {PHASE_ORDER.map((phase, pi) => {
          const steps = stepsOf(local, phase);
          return (
            <div key={phase} className="flex items-stretch gap-3">
              <div className="flex shrink-0 flex-col rounded-xl border bg-muted/30 p-2">
                {/* 見出し */}
                <div className="mb-1 flex items-center justify-between gap-2 px-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                        {pi + 1}
                      </span>
                      <span className="text-sm font-bold">{phase}</span>
                      <span className="text-xs text-muted-foreground">
                        {steps.reduce((a, s) => a + s.items.length, 0)}
                      </span>
                    </div>
                    <p className="pl-7 text-[11px] text-muted-foreground">
                      {PHASE_DESC[phase]}
                    </p>
                  </div>
                  <ProcessEditForm
                    presetPhase={phase}
                    knownRoutes={knownRoutes}
                    trigger={
                      <button
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="末尾に工程を追加"
                      >
                        <Plus className="size-4" />
                      </button>
                    }
                  />
                </div>

                {/* 縦フロー */}
                <div className="flex min-w-[15rem] flex-col items-center px-1">
                  {steps.length === 0 ? (
                    <Gap phase={phase} gapIndex={0} />
                  ) : (
                    <>
                      <Gap phase={phase} gapIndex={0} top />
                      {steps.map((step, s) => (
                        <div key={step.sortOrder} className="w-full">
                          <StepRow phase={phase} step={step} />
                          <Gap phase={phase} gapIndex={s + 1} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {pi < PHASE_ORDER.length - 1 && (
                <div className="flex items-center self-center text-muted-foreground">
                  <ArrowRight className="size-6" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {busy && <p className="text-xs text-muted-foreground">保存中…</p>}
    </div>
  );
}
