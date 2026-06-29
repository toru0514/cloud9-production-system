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
import type { CpsProduct, ProductPhase } from '@/types/cps';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const PHASES: ProductPhase[] = [
  '企画',
  '設計',
  '加工',
  '仕上げ',
  '撮影',
  '投稿',
  '販売',
  '分析',
];

export function ProductForm({
  product,
  trigger,
}: {
  product?: CpsProduct;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: product?.name ?? '',
    category: product?.category ?? '',
    wood_type: product?.wood_type ?? '',
    price: product?.price?.toString() ?? '',
    cost: product?.cost?.toString() ?? '',
    current_status: (product?.current_status ?? '企画') as ProductPhase,
    description: product?.description ?? '',
    notes: product?.notes ?? '',
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('商品名は必須です');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category || null,
      wood_type: form.wood_type || null,
      price: form.price ? Number(form.price) : null,
      cost: form.cost ? Number(form.cost) : null,
      current_status: form.current_status,
      description: form.description || null,
      notes: form.notes || null,
    };
    try {
      if (isEdit && product) {
        await apiSend(`/api/cps/products/${product.id}`, 'PATCH', payload);
        toast.success('商品を更新しました');
      } else {
        await apiSend('/api/cps/products', 'POST', payload);
        toast.success('商品を登録しました');
      }
      setOpen(false);
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
        {trigger ?? (
          <Button>
            <Plus className="size-4" /> 商品を登録
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '商品を編集' : '商品を登録'}</DialogTitle>
          <DialogDescription>
            商品名・カテゴリ・木材・価格・工程フェーズを管理します。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>商品名 *</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="ウォルナットバングル M"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>カテゴリ</Label>
              <Input
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                placeholder="バングル"
              />
            </div>
            <div className="grid gap-2">
              <Label>木材</Label>
              <Input
                value={form.wood_type}
                onChange={(e) => set('wood_type', e.target.value)}
                placeholder="ウォルナット"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>価格(円)</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>原価(円)</Label>
              <Input
                type="number"
                value={form.cost}
                onChange={(e) => set('cost', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>フェーズ</Label>
              <Select
                value={form.current_status}
                onValueChange={(v) => set('current_status', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHASES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>説明</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>メモ</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? '保存中…' : isEdit ? '更新する' : '登録する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
