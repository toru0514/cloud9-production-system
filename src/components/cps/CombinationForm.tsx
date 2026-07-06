'use client';

import { useState } from 'react';
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
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export interface ProcessOption {
  id: string;
  name: string;
  product_line: string | null;
}

export function CombinationForm({ processes }: { processes: ProcessOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('700');
  const [op, setOp] = useState('27600');
  const [processId, setProcessId] = useState('none');

  const submit = async () => {
    setSaving(true);
    try {
      const proc = processes.find((p) => p.id === processId);
      const created = await apiSend<CpsWorkCombination>(
        '/api/cps/work-combinations',
        'POST',
        {
          name: name.trim() || proc?.name || '新しい組合せ票',
          process_id: processId === 'none' ? null : processId,
          product_line: proc?.product_line ?? null,
          required_qty: Number(qty) || 1,
          operating_seconds: Number(op) || 0,
        }
      );
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
            作成後、作業要素（手・送・歩の秒数）を入力すると線が引かれます。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>対象工程（任意）</Label>
            <Select value={processId} onValueChange={setProcessId}>
              <SelectTrigger>
                <SelectValue placeholder="工程を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">（指定なし）</SelectItem>
                {processes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.product_line ? `（${p.product_line}）` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cf-name">名称</Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 研磨セル"
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? '作成中…' : '作成する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
