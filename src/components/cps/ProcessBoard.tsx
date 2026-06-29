'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProcessEditForm } from '@/components/cps/ProcessEditForm';
import { apiSend } from '@/lib/cps/client';
import { PHASE_ORDER, PHASE_DESC } from '@/lib/cps/phases';
import { statusMeta } from '@/lib/cps/utils/status';
import { formatMinutes } from '@/lib/cps/utils/kpi';
import type { CpsProcess, CpsProcessStatusItem, ProcessPhase } from '@/types/cps';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ArrowDownToLine,
  GitBranch,
  Pencil,
  Plus,
  Flame,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';

type Item = CpsProcessStatusItem;
const COL_W = 232; // 1 枝（列）の幅 px

interface GridRow {
  sortOrder: number;
  backbone: boolean;
  placed: { item: Item; col: number }[];
  multi: boolean;
}
type ConnSpec =
  | { type: 'none' | 'center' }
  | { type: 'fork' | 'merge' | 'internal'; cols: number[] };

// 各段間（gap）のコネクタ仕様を算出。backbone と backbone の間を「区間」とみなし、
// フォーク（中央→各枝）／枝内（各列を直下）／合流（各枝→中央）を描く。
function computeConnectors(rows: GridRow[]): ConnSpec[] {
  const n = rows.length;
  const specs: ConnSpec[] = Array.from({ length: n + 1 }, () => ({
    type: 'center' as const,
  }));
  let i = 0;
  while (i < n) {
    if (rows[i].backbone) {
      i += 1;
      continue;
    }
    let j = i;
    const cols = new Set<number>();
    while (j < n && !rows[j].backbone) {
      rows[j].placed.forEach((p) => cols.add(p.col));
      j += 1;
    }
    const colArr = [...cols].sort((a, b) => a - b);
    const startIdx = i;
    const endIdx = j - 1;
    const forkAbove = startIdx - 1 >= 0 && rows[startIdx - 1].backbone;
    const mergeBelow = endIdx + 1 <= n - 1 && rows[endIdx + 1].backbone;
    specs[startIdx] = forkAbove
      ? { type: 'fork', cols: colArr }
      : { type: 'internal', cols: colArr };
    for (let g = startIdx + 1; g <= endIdx; g++)
      specs[g] = { type: 'internal', cols: colArr };
    specs[endIdx + 1] = mergeBelow
      ? { type: 'merge', cols: colArr }
      : { type: 'internal', cols: colArr };
    i = j;
  }
  if (rows[0]?.backbone) specs[0] = { type: 'none' };
  return specs;
}

function FlowConnector({
  width,
  height,
  totalCols,
  spec,
}: {
  width: number;
  height: number;
  totalCols: number;
  spec: ConnSpec;
}) {
  if (spec.type === 'none') return null;
  const stroke = '#94a3b8';
  const cx = width / 2;
  const colX = (c: number) => ((c - 0.5) * width) / totalCols;
  const paths: string[] = [];
  const heads: number[] = [];

  if (spec.type === 'center') {
    paths.push(`M${cx} 0 L${cx} ${height}`);
    heads.push(cx);
  } else if (spec.type === 'internal') {
    spec.cols.forEach((c) => {
      const x = colX(c);
      paths.push(`M${x} 0 L${x} ${height}`);
      heads.push(x);
    });
  } else if (spec.type === 'fork') {
    spec.cols.forEach((c) => {
      const x = colX(c);
      paths.push(`M${cx} 0 V${height * 0.4} H${x} V${height}`);
      heads.push(x);
    });
  } else if (spec.type === 'merge') {
    spec.cols.forEach((c) => {
      const x = colX(c);
      paths.push(`M${x} 0 V${height * 0.6} H${cx} V${height}`);
    });
    heads.push(cx);
  }

  return (
    <svg width={width} height={height} className="pointer-events-none block">
      <g stroke={stroke} strokeWidth={1.5} fill="none">
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill={stroke}>
        {heads.map((x, i) => (
          <polygon
            key={i}
            points={`${x - 4},${height - 6} ${x + 4},${height - 6} ${x},${height}`}
          />
        ))}
      </g>
    </svg>
  );
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

  /* ---------- グリッド計算（行=sort_order, 列=route） ---------- */
  const buildGrid = (arr: Item[], phase: string) => {
    const pis = arr.filter((i) => i.process.phase === phase);
    const rowVals = [...new Set(pis.map((i) => i.process.sort_order))].sort(
      (a, b) => a - b
    );
    const minSortFor = (route: string) =>
      Math.min(
        ...pis.filter((i) => i.process.route === route).map((i) => i.process.sort_order)
      );
    const routeCols = [
      ...new Set(
        pis.map((i) => i.process.route).filter((r): r is string => Boolean(r))
      ),
    ].sort((a, b) => minSortFor(a) - minSortFor(b) || a.localeCompare(b));

    let maxAnon = 0;
    rowVals.forEach((rv) => {
      const row = pis.filter((i) => i.process.sort_order === rv);
      const nulls = row.filter((i) => !i.process.route);
      const backbone = row.length === 1 && nulls.length === 1;
      if (!backbone) maxAnon = Math.max(maxAnon, nulls.length);
    });
    const totalCols = Math.max(1, routeCols.length + maxAnon);

    const rows = rowVals.map((rv) => {
      const nodes = pis.filter((i) => i.process.sort_order === rv);
      const backbone = nodes.length === 1 && !nodes[0].process.route;
      const sorted = [...nodes].sort(
        (a, b) =>
          (a.process.route ?? '').localeCompare(b.process.route ?? '') ||
          a.process.name.localeCompare(b.process.name)
      );
      let anon = routeCols.length;
      const placed = sorted.map((item) => {
        const col = item.process.route
          ? routeCols.indexOf(item.process.route) + 1
          : (anon += 1);
        return { item, col };
      });
      return { sortOrder: rv, backbone, placed, multi: nodes.length > 1 };
    });

    return { rows, totalCols, count: pis.length };
  };

  /* ---------- 並べ替え/再採番 ---------- */
  const renumber = (arr: Item[], phase: string) => {
    const base = (PHASE_ORDER.indexOf(phase as ProcessPhase) + 1) * 1000;
    const rowVals = [
      ...new Set(
        arr.filter((i) => i.process.phase === phase).map((i) => i.process.sort_order)
      ),
    ].sort((a, b) => a - b);
    // 旧 sort_order → 新 sort_order を先に確定（書き換え中の再マッチによる玉突きを防ぐ）
    const orderMap = new Map(rowVals.map((rv, idx) => [rv, base + idx * 10]));
    arr
      .filter((i) => i.process.phase === phase)
      .forEach((i) => {
        const next = orderMap.get(i.process.sort_order);
        if (next != null) i.process.sort_order = next;
      });
  };

  const clone = () => local.map((i) => ({ ...i, process: { ...i.process } }));

  const persistAll = async (next: Item[], baseline: Map<string, CpsProcess>) => {
    const changed = next.filter((i) => {
      const o = baseline.get(i.process.id);
      if (!o) return false;
      return (
        o.phase !== i.process.phase ||
        o.sort_order !== i.process.sort_order ||
        (o.route ?? '') !== (i.process.route ?? '')
      );
    });
    if (!changed.length) return;
    setBusy(true);
    try {
      await Promise.all(
        changed.map((i) =>
          apiSend(`/api/cps/processes/${i.process.id}`, 'PATCH', {
            phase: i.process.phase,
            sort_order: i.process.sort_order,
            route: i.process.route,
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

  const baseFromItems = () => new Map(items.map((i) => [i.process.id, i.process]));

  const reset = () => {
    setDragId(null);
    setOverKey(null);
  };

  /* ---------- DnD: 行へ合流 / 段間に新ステップ ---------- */
  const dropToRow = (phase: string, sortOrder: number) => {
    const id = dragId;
    reset();
    if (!id) return;
    const next = clone();
    const d = next.find((i) => i.process.id === id);
    if (!d) return;
    if (d.process.phase === phase && d.process.sort_order === sortOrder) return;
    const src = d.process.phase;
    d.process.phase = phase as ProcessPhase;
    d.process.sort_order = sortOrder;
    normalizePhase(next, phase);
    renumber(next, phase);
    if (src !== phase) renumber(next, src);
    setLocal(next);
    void persistAll(next, baseFromItems());
  };

  const dropToGap = (phase: string, gapIndex: number) => {
    const id = dragId;
    reset();
    if (!id) return;
    const next = clone();
    const d = next.find((i) => i.process.id === id);
    if (!d) return;
    const src = d.process.phase;
    const rowVals = [
      ...new Set(
        next
          .filter((i) => i.process.id !== id && i.process.phase === phase)
          .map((i) => i.process.sort_order)
      ),
    ].sort((a, b) => a - b);
    let so: number;
    if (rowVals.length === 0) so = 0;
    else if (gapIndex <= 0) so = rowVals[0] - 1;
    else if (gapIndex >= rowVals.length) so = rowVals[rowVals.length - 1] + 1;
    else so = (rowVals[gapIndex - 1] + rowVals[gapIndex]) / 2;
    d.process.phase = phase as ProcessPhase;
    d.process.sort_order = so;
    renumber(next, phase);
    if (src !== phase) renumber(next, src);
    setLocal(next);
    void persistAll(next, baseFromItems());
  };

  /* ---------- 構造追加: 直列(同じ枝の下) / 並行(分岐) ---------- */
  // 並行段（複数ノードの行）の null 枝に、空いている最小スロット(枝1,枝2…)を割当て。
  // 既存の枝は保持＝列を使い回すので、行が違っても列が揃う。
  const normalizePhase = (next: Item[], phase: string) => {
    const rowVals = [
      ...new Set(
        next.filter((i) => i.process.phase === phase).map((i) => i.process.sort_order)
      ),
    ];
    rowVals.forEach((rv) => {
      const row = next.filter(
        (i) => i.process.phase === phase && i.process.sort_order === rv
      );
      if (row.length <= 1) return;
      const used = new Set(
        row.filter((i) => i.process.route).map((i) => i.process.route as string)
      );
      row
        .filter((i) => !i.process.route)
        .sort((a, b) => a.process.name.localeCompare(b.process.name))
        .forEach((i) => {
          let n = 1;
          while (used.has(`枝${n}`)) n += 1;
          i.process.route = `枝${n}`;
          used.add(`枝${n}`);
        });
    });
  };

  const addSerial = async (anchor: CpsProcess) => {
    const name = window.prompt(`「${anchor.name}」の下に追加する工程名`);
    if (!name?.trim()) return;
    setBusy(true);
    try {
      const next = clone();
      const a = next.find((i) => i.process.id === anchor.id)?.process;
      if (!a) return;
      // 並行段なら枝(列)を確定させ、子は同じ列を引き継ぐ
      normalizePhase(next, a.phase);
      const childRoute = a.route;

      const created = await apiSend<CpsProcess>('/api/cps/processes', 'POST', {
        name: name.trim(),
        phase: a.phase,
        route: childRoute,
        sort_order: a.sort_order,
      });
      next.push({
        process: { ...created, route: childRoute, sort_order: a.sort_order + 0.5 },
        recent_avg_minutes: null,
        last_logged_at: null,
        status: 'normal',
      });
      renumber(next, a.phase);
      setLocal(next);
      const base = baseFromItems();
      base.set(created.id, created);
      await persistAll(next, base);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addParallel = async (anchor: CpsProcess) => {
    const name = window.prompt(`「${anchor.name}」と並行に追加する工程名`);
    if (!name?.trim()) return;
    setBusy(true);
    try {
      const next = clone();
      const a = next.find((i) => i.process.id === anchor.id)?.process;
      if (!a) return;
      const created = await apiSend<CpsProcess>('/api/cps/processes', 'POST', {
        name: name.trim(),
        phase: a.phase,
        route: null,
        sort_order: a.sort_order,
      });
      next.push({
        process: { ...created, route: null, sort_order: a.sort_order },
        recent_avg_minutes: null,
        last_logged_at: null,
        status: 'normal',
      });
      // 同じ行が並行になったので列スロットを割当て（アンカーも含む）
      normalizePhase(next, a.phase);
      setLocal(next);
      const base = baseFromItems();
      base.set(created.id, created);
      await persistAll(next, base);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- カード ---------- */
  const Card = ({ item }: { item: Item }) => {
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
          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => addSerial(process)}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent"
              title="この下に直列で追加（同じ枝）"
            >
              <ArrowDownToLine className="size-3.5" />
            </button>
            <button
              onClick={() => addParallel(process)}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent"
              title="並行に分岐を追加"
            >
              <GitBranch className="size-3.5" />
            </button>
            <ProcessEditForm
              process={process}
              knownRoutes={knownRoutes}
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
        <div className="flex items-center justify-between gap-1 pl-1.5 pt-0.5">
          <span className="truncate text-[11px] text-muted-foreground">
            {process.route && (
              <span className="mr-1 rounded bg-violet-100 px-1 text-[10px] text-violet-700 dark:bg-violet-950 dark:text-violet-300">
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

  /* ---------- 段間 gap（コネクタ描画＋新ステップ挿入） ---------- */
  const Gap = ({
    phase,
    gapIndex,
    width,
    totalCols,
    spec,
    top,
  }: {
    phase: ProcessPhase;
    gapIndex: number;
    width: number;
    totalCols: number;
    spec: ConnSpec;
    top?: boolean;
  }) => {
    const key = `gap:${phase}:${gapIndex}`;
    const over = overKey === key;
    const height = top || spec.type === 'none' ? 14 : 30;
    return (
      <div
        style={{ width, height }}
        onDragOver={(e) => {
          e.preventDefault();
          setOverKey(key);
        }}
        onDragLeave={() => setOverKey((k) => (k === key ? null : k))}
        onDrop={(e) => {
          e.preventDefault();
          dropToGap(phase, gapIndex);
        }}
        className="relative flex items-center justify-center"
      >
        {over ? (
          <div className="flex h-6 w-full items-center justify-center rounded border-2 border-dashed border-primary bg-primary/10 text-[10px] font-medium text-primary">
            ここに新ステップ
          </div>
        ) : (
          <FlowConnector
            width={width}
            height={height}
            totalCols={totalCols}
            spec={spec}
          />
        )}
      </div>
    );
  };

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        💡 カードのホバーで{' '}
        <ArrowDownToLine className="inline size-3" /> 直列追加・
        <GitBranch className="inline size-3" /> 分岐追加。ドラッグで段の移動／別カードに重ねて並行／段の間で新ステップ。
      </p>
      <div className="flex items-start gap-3 overflow-x-auto pb-3">
        {PHASE_ORDER.map((phase, pi) => {
          const grid = buildGrid(local, phase);
          const width = grid.totalCols * COL_W;
          const connectors = computeConnectors(grid.rows);
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
                        {grid.count}
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

                {/* 縦フロー（行=ステップ / 列=枝） */}
                <div
                  className="flex flex-col items-center px-1"
                  style={{ minWidth: Math.max(width, COL_W) }}
                >
                  {grid.rows.length === 0 ? (
                    <Gap
                      phase={phase}
                      gapIndex={0}
                      width={width}
                      totalCols={grid.totalCols}
                      spec={{ type: 'none' }}
                    />
                  ) : (
                    <>
                      <Gap
                        phase={phase}
                        gapIndex={0}
                        width={width}
                        totalCols={grid.totalCols}
                        spec={connectors[0]}
                        top
                      />
                      {grid.rows.map((row, r) => (
                        <div key={row.sortOrder} style={{ width }}>
                          {row.multi && (
                            <div className="mb-1 flex items-center justify-center gap-1 text-[10px] font-medium text-violet-600">
                              <span className="h-px w-6 bg-violet-300" />
                              分岐 {row.placed.length}
                              <span className="h-px w-6 bg-violet-300" />
                            </div>
                          )}
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOverKey(`row:${phase}:${row.sortOrder}`);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              dropToRow(phase, row.sortOrder);
                            }}
                            className={cn(
                              'grid rounded-lg p-1 transition-colors',
                              overKey === `row:${phase}:${row.sortOrder}` &&
                                'bg-primary/10 ring-2 ring-primary/40'
                            )}
                            style={{
                              gridTemplateColumns: `repeat(${grid.totalCols}, minmax(0, 1fr))`,
                              gap: 8,
                            }}
                          >
                            {row.placed.map(({ item, col }) => (
                              <div
                                key={item.process.id}
                                style={
                                  row.backbone
                                    ? {
                                        gridColumn: '1 / -1',
                                        maxWidth: COL_W,
                                        margin: '0 auto',
                                        width: '100%',
                                      }
                                    : { gridColumn: col }
                                }
                              >
                                <Card item={item} />
                              </div>
                            ))}
                          </div>
                          <Gap
                            phase={phase}
                            gapIndex={r + 1}
                            width={width}
                            totalCols={grid.totalCols}
                            spec={connectors[r + 1]}
                          />
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
