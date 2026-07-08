'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiSend } from '@/lib/cps/client';
import {
  computeChart,
  computeTakt,
  evaluateCombination,
  fmtSec,
} from '@/lib/cps/combination';
import { CombinationChart } from '@/components/cps/CombinationChart';
import {
  elementsFromPhase,
  laneNoun,
  type ImportProcess,
} from '@/lib/cps/combination-import';
import type { CpsWorkCombinationDetail } from '@/types/cps';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  DownloadCloud,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

interface DraftRow {
  key: string;
  name: string;
  manual_seconds: number;
  auto_seconds: number;
  walk_seconds: number;
}

export function CombinationEditor({
  detail,
  processName,
  processes = [],
}: {
  detail: CpsWorkCombinationDetail;
  processName?: string | null;
  processes?: ImportProcess[];
}) {
  const router = useRouter();
  const { phase, lane } = detail.combination;

  const [name, setName] = useState(detail.combination.name);
  const [qty, setQty] = useState(String(detail.combination.required_qty));
  const [op, setOp] = useState(String(detail.combination.operating_seconds));
  const [note, setNote] = useState(detail.combination.note ?? '');
  const [rows, setRows] = useState<DraftRow[]>(
    detail.elements.map((e) => ({
      key: e.id,
      name: e.name,
      manual_seconds: e.manual_seconds,
      auto_seconds: e.auto_seconds,
      walk_seconds: e.walk_seconds,
    }))
  );
  const [saving, setSaving] = useState(false);

  const takt = computeTakt(Number(op) || 0, Number(qty) || 0);
  const chart = useMemo(() => computeChart(rows), [rows]);
  const verdict = evaluateCombination(chart.ctSeconds, takt);

  const patchRow = (key: string, patch: Partial<DraftRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const num = (v: string) => Math.max(0, Number(v) || 0);

  const addRow = () =>
    setRows((rs) => [
      ...rs,
      {
        key: crypto.randomUUID(),
        name: '新しい作業',
        manual_seconds: 5,
        auto_seconds: 0,
        walk_seconds: 2,
      },
    ]);

  const removeRow = (key: string) =>
    setRows((rs) => rs.filter((r) => r.key !== key));

  const move = (idx: number, dir: -1 | 1) =>
    setRows((rs) => {
      const j = idx + dir;
      if (j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy;
    });

  const reimport = () => {
    if (!phase) return;
    const imported = elementsFromPhase(processes, phase, lane);
    if (imported.length === 0) {
      toast.error('取り込める工程がありません');
      return;
    }
    if (
      rows.length > 0 &&
      !window.confirm(
        `${phase}${lane ? ` / ${lane}` : ''} の工程 ${imported.length} 件で作業要素を置き換えます。よろしいですか？`
      )
    ) {
      return;
    }
    setRows(
      imported.map((e) => ({
        key: crypto.randomUUID(),
        name: e.name,
        manual_seconds: e.manual_seconds,
        auto_seconds: e.auto_seconds,
        walk_seconds: e.walk_seconds,
      }))
    );
    toast.success(`${imported.length} 件の工程を取り込みました（未保存）`);
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/cps/work-combinations/${detail.combination.id}`, 'PATCH', {
        name: name.trim() || '無題の組合せ票',
        required_qty: Number(qty) || 1,
        operating_seconds: Number(op) || 0,
        note: note.trim() || null,
      });
      await apiSend(
        `/api/cps/work-combinations/${detail.combination.id}/elements`,
        'POST',
        {
          elements: rows.map((r, i) => ({
            seq: i + 1,
            name: r.name.trim() || `作業${i + 1}`,
            manual_seconds: r.manual_seconds,
            auto_seconds: r.auto_seconds,
            walk_seconds: r.walk_seconds,
            sort_order: i + 1,
          })),
        }
      );
      toast.success('組合せ票を保存しました');
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/standard-work"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> 標準作業へ戻る
        </Link>
        <div className="flex items-center gap-2">
          {phase && (
            <Button variant="outline" onClick={reimport}>
              <DownloadCloud className="size-4" /> 工程を取り込む
            </Button>
          )}
          <Button onClick={save} disabled={saving}>
            <Save className="size-4" /> {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </div>

      {phase && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>フェーズ</span>
          <Badge variant="secondary">{phase}</Badge>
          {lane && (
            <>
              <span>{laneNoun(phase === '製造')}</span>
              <Badge variant="secondary">{lane}</Badge>
            </>
          )}
          <span className="text-xs">
            ・「工程を取り込む」で最新の工程マスタから作業要素を入れ直せます
          </span>
        </div>
      )}

      {/* ヘッダー（品番・工程・タクト算出） */}
      <Card>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor="wc-name">名称</Label>
            <Input id="wc-name" value={name} onChange={(e) => setName(e.target.value)} />
            {processName && (
              <span className="text-xs text-muted-foreground">
                対象工程: <Badge variant="outline">{processName}</Badge>
              </span>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="wc-qty">必要数（個/直）</Label>
            <Input
              id="wc-qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="tabular-nums"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="wc-op">稼働時間（秒/直）</Label>
            <Input
              id="wc-op"
              type="number"
              min={0}
              value={op}
              onChange={(e) => setOp(e.target.value)}
              className="tabular-nums"
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              = {Math.floor(Number(op) / 3600)}時間
              {Math.round((Number(op) % 3600) / 60)}分
            </span>
          </div>
          <div className="grid gap-1.5">
            <Label>タクトタイム TT</Label>
            <div className="flex items-baseline gap-1 rounded-md border bg-muted/40 px-3 py-2">
              <span className="text-2xl font-bold tabular-nums">
                {takt > 0 ? fmtSec(takt) : '—'}
              </span>
              <span className="text-sm text-muted-foreground">秒</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {op || 0} ÷ {qty || 0}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,440px)_1fr]">
        {/* 入力表 */}
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">作業要素</CardTitle>
            <span className="text-xs text-muted-foreground">
              秒を入れると右に線が引かれます
            </span>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-2 py-2 text-left font-medium">順</th>
                    <th className="px-2 py-2 text-left font-medium">作業内容</th>
                    <th className="px-1 py-2 text-right font-medium">手</th>
                    <th className="px-1 py-2 text-right font-medium">送</th>
                    <th className="px-1 py-2 text-right font-medium">歩</th>
                    <th className="px-1 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.key} className="border-b last:border-0">
                      <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-1 py-1.5">
                        <Input
                          value={r.name}
                          onChange={(e) => patchRow(r.key, { name: e.target.value })}
                          className="h-8"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          value={r.manual_seconds}
                          onChange={(e) =>
                            patchRow(r.key, { manual_seconds: num(e.target.value) })
                          }
                          className="h-8 w-14 text-right tabular-nums"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          value={r.auto_seconds}
                          onChange={(e) =>
                            patchRow(r.key, { auto_seconds: num(e.target.value) })
                          }
                          className="h-8 w-14 text-right tabular-nums"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <Input
                          type="number"
                          min={0}
                          value={r.walk_seconds}
                          onChange={(e) =>
                            patchRow(r.key, { walk_seconds: num(e.target.value) })
                          }
                          className="h-8 w-14 text-right tabular-nums"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <div className="flex items-center">
                          <button
                            type="button"
                            aria-label="上へ"
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                          >
                            <ArrowUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="下へ"
                            onClick={() => move(i, 1)}
                            disabled={i === rows.length - 1}
                            className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                          >
                            <ArrowDown className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="削除"
                            onClick={() => removeRow(r.key)}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t text-xs text-muted-foreground">
                    <td className="px-2 py-2" colSpan={2}>
                      <Button variant="outline" size="sm" onClick={addRow}>
                        <Plus className="size-4" /> 作業を追加
                      </Button>
                    </td>
                    <td className="px-1 py-2 text-right font-semibold text-foreground">
                      {chart.manualTotal}
                    </td>
                    <td className="px-1 py-2 text-right font-semibold text-foreground">
                      {chart.autoTotal}
                    </td>
                    <td className="px-1 py-2 text-right font-semibold text-foreground">
                      {chart.walkTotal}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* グラフ */}
        <Card>
          <CardHeader className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
            <CardTitle className="text-base">タイムライン</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {verdict.takt > 0 && (
                <Badge
                  variant="outline"
                  className={
                    verdict.withinTakt
                      ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400'
                      : 'border-red-300 text-red-700 dark:text-red-400'
                  }
                >
                  {verdict.withinTakt ? 'タクト内' : 'タクト割れ'}
                </Badge>
              )}
              <span className="text-muted-foreground tabular-nums">
                CT <b className="text-foreground">{fmtSec(chart.ctSeconds)}</b>秒 / TT{' '}
                <b className="text-foreground">{fmtSec(takt)}</b>秒
              </span>
              {verdict.takt > 0 && (
                <span className="text-muted-foreground tabular-nums">
                  {verdict.gapSeconds > 0
                    ? `オーバー +${fmtSec(verdict.gapSeconds)}秒`
                    : `手待ち ${fmtSec(-verdict.gapSeconds)}秒`}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-3">
            <CombinationChart elements={rows} takt={takt} />
          </CardContent>
        </Card>
      </div>

      {/* メモ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">メモ</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="改善の着眼点・気づきなど"
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
}
