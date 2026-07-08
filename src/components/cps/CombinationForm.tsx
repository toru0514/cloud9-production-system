'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiSend } from '@/lib/cps/client';
import type { CpsWorkCombination } from '@/types/cps';
import {
  elementsFromPhase,
  laneNoun,
  phaseOptionsFromProcesses,
  type ImportProcess,
} from '@/lib/cps/combination-import';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const ALL = '__all__';

export function CombinationForm({ processes }: { processes: ImportProcess[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState('');
  const [lane, setLane] = useState(ALL);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('700');
  const [op, setOp] = useState('27600');

  const options = useMemo(
    () => phaseOptionsFromProcesses(processes),
    [processes]
  );
  const current = options.find((o) => o.phase === phase) ?? null;
  const laneLabel = laneNoun(current?.isManufacturing ?? false);
  const laneValue = lane === ALL ? null : lane;

  const preview = useMemo(
    () => (phase ? elementsFromPhase(processes, phase, laneValue) : []),
    [processes, phase, laneValue]
  );

  const autoName = () => {
    if (!phase) return '';
    return laneValue ? `${phase} / ${laneValue}` : phase;
  };

  const onPhaseChange = (p: string) => {
    setPhase(p);
    setLane(ALL);
    setName('');
  };

  const submit = async () => {
    if (!phase) {
      toast.error('フェーズを選択してください');
      return;
    }
    setSaving(true);
    try {
      const created = await apiSend<CpsWorkCombination>(
        '/api/cps/work-combinations',
        'POST',
        {
          name: name.trim() || autoName(),
          phase,
          lane: laneValue,
          product_line: current?.isManufacturing ? laneValue : null,
          required_qty: Number(qty) || 1,
          operating_seconds: Number(op) || 0,
        }
      );
      if (preview.length > 0) {
        await apiSend(
          `/api/cps/work-combinations/${created.id}/elements`,
          'POST',
          {
            elements: preview.map((e, i) => ({
              seq: i + 1,
              sort_order: i + 1,
              name: e.name,
              manual_seconds: e.manual_seconds,
              auto_seconds: e.auto_seconds,
              walk_seconds: e.walk_seconds,
            })),
          }
        );
      }
      toast.success('組合せ票を作成しました');
      setOpen(false);
      router.push(`/standard-work/${created.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> 組合せ票を作成
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>標準作業組合せ票を作成</DialogTitle>
          <DialogDescription>
            フェーズと{laneLabel}を選ぶと、その工程が作業要素として自動で入ります。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>フェーズ</Label>
            <Select value={phase} onValueChange={onPhaseChange}>
              <SelectTrigger>
                <SelectValue placeholder="フェーズを選択（開発 / 製造 …）" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.phase} value={o.phase}>
                    {o.phase}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {current && current.lanes.length > 0 && (
            <div className="grid gap-2">
              <Label>{laneLabel}</Label>
              <Select value={lane} onValueChange={setLane}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {current.isManufacturing ? '全ライン' : '全体（分岐なし）'}
                  </SelectItem>
                  {current.lanes.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="cf-name">名称</Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={autoName() || '例: 開発 / 分岐A'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cf-qty">必要数（個/直）</Label>
              <Input
                id="cf-qty"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="tabular-nums"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cf-op">稼働時間（秒/直）</Label>
              <Input
                id="cf-op"
                type="number"
                min={0}
                value={op}
                onChange={(e) => setOp(e.target.value)}
                className="tabular-nums"
              />
            </div>
          </div>

          {phase && (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              取り込む作業:{' '}
              <b className="text-foreground">{preview.length}</b> 件
              {preview.length > 0 && (
                <span className="ml-1">
                  （{preview.map((e) => e.name).slice(0, 4).join(' → ')}
                  {preview.length > 4 ? ' …' : ''}）
                </span>
              )}
              。作成後に秒数（手・送・歩）を調整できます。
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={submit} disabled={saving || !phase}>
            {saving ? '作成中…' : '作成する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
