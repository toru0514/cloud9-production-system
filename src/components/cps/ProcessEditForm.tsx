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
import { PHASE_ORDER } from '@/lib/cps/phases';
import type { CpsProcess, ProcessPhase } from '@/types/cps';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function ProcessEditForm({
  process,
  presetPhase,
  presetRoute,
  knownRoutes = [],
  trigger,
}: {
  process?: CpsProcess;
  presetPhase?: ProcessPhase;
  presetRoute?: string;
  knownRoutes?: string[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const isEdit = Boolean(process);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: process?.name ?? '',
    phase: (process?.phase ?? presetPhase ?? '製造') as ProcessPhase,
    standard_minutes: process?.standard_minutes?.toString() ?? '',
    tools: (process?.tools ?? []).join('、'),
    route: process?.route ?? presetRoute ?? '',
    description: process?.description ?? '',
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('工程名は必須です');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phase: form.phase,
      standard_minutes: form.standard_minutes
        ? Number(form.standard_minutes)
        : null,
      tools: form.tools
        .split(/[,、]/)
        .map((t) => t.trim())
        .filter(Boolean),
      route: form.route.trim() || null,
      description: form.description || null,
    };
    try {
      if (isEdit && process) {
        await apiSend(`/api/cps/processes/${process.id}`, 'PATCH', payload);
        toast.success('工程を更新しました');
      } else {
        await apiSend('/api/cps/processes', 'POST', payload);
        toast.success('工程を追加しました');
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!process) return;
    if (!confirm(`「${process.name}」を削除しますか？`)) return;
    setSaving(true);
    try {
      await apiSend(`/api/cps/processes/${process.id}`, 'DELETE');
      toast.success('工程を削除しました');
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? '工程を編集' : '工程を追加'}</DialogTitle>
          <DialogDescription>
            工程名・フェーズ・標準時間・使用工具を設定します。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>工程名 *</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="研磨"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>フェーズ</Label>
              <Select
                value={form.phase}
                onValueChange={(v) => set('phase', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHASE_ORDER.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>標準時間（分）</Label>
              <Input
                type="number"
                value={form.standard_minutes}
                onChange={(e) => set('standard_minutes', e.target.value)}
                placeholder="30"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>ルート（並行レーン・任意）</Label>
            <Input
              list="cps-known-routes"
              value={form.route}
              onChange={(e) => set('route', e.target.value)}
              placeholder="例: 治具製作 / CAD→CNC / 手作業"
            />
            <datalist id="cps-known-routes">
              {knownRoutes.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <p className="text-[11px] text-muted-foreground">
              同じフェーズ内で別レーンとして並行表示されます（空欄=メイン）。
            </p>
          </div>
          <div className="grid gap-2">
            <Label>使用工具（、または , 区切り）</Label>
            <Input
              value={form.tools}
              onChange={(e) => set('tools', e.target.value)}
              placeholder="サンダー #120、#240、#400"
            />
          </div>
          <div className="grid gap-2">
            <Label>説明・メモ</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="この工程で何をするか"
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {isEdit ? (
            <Button
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              onClick={remove}
              disabled={saving}
            >
              <Trash2 className="size-4" /> 削除
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? '保存中…' : isEdit ? '更新' : '追加'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
