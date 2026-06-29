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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiSend } from '@/lib/cps/client';
import type { CpsProduct } from '@/types/cps';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

function toLocalInput(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

export function WorkLogForm({
  processId,
  products,
  defaultProductId,
}: {
  processId: string;
  products: CpsProduct[];
  defaultProductId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const [productId, setProductId] = useState<string>(
    defaultProductId ?? 'none'
  );
  const [startedAt, setStartedAt] = useState(
    toLocalInput(new Date(now.getTime() - 30 * 60000))
  );
  const [endedAt, setEndedAt] = useState(toLocalInput(now));
  const [memo, setMemo] = useState('');

  const submit = async () => {
    setSaving(true);
    try {
      await apiSend('/api/cps/work-logs', 'POST', {
        process_id: processId,
        product_id: productId === 'none' ? null : productId,
        started_at: new Date(startedAt).toISOString(),
        ended_at: endedAt ? new Date(endedAt).toISOString() : null,
        memo: memo || null,
      });
      toast.success('作業実績を記録しました');
      setOpen(false);
      setMemo('');
      router.refresh();
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
          <Plus className="size-4" /> 作業実績を記録
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>作業実績を記録</DialogTitle>
          <DialogDescription>
            開始・終了時刻から作業時間（分）を自動計算します。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>商品（任意）</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="商品を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">（指定なし）</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>開始</Label>
              <Input
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>終了</Label>
              <Input
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>メモ（任意）</Label>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="気づき・問題点など"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? '保存中…' : '記録する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
