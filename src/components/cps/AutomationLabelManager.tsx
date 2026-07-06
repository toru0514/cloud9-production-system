'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiGet, apiSend } from '@/lib/cps/client';
import {
  automationMeta,
  MAX_AUTOMATION_LABEL_LEN,
} from '@/lib/cps/automation';
import { cn } from '@/lib/utils';
import { Lock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Usage {
  label: string;
  isBuiltin: boolean;
  processCount: number;
  logCount: number;
}

export function AutomationLabelManager({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<Usage[] | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setUsage(null);
    try {
      const data = await apiGet<Usage[]>('/api/cps/automation-labels');
      setUsage(data);
      setEdits(Object.fromEntries(data.map((u) => [u.label, u.label])));
    } catch (e) {
      toast.error((e as Error).message);
      setUsage([]);
    }
  };

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) load();
  };

  const rename = async (from: string) => {
    const to = (edits[from] ?? '').trim();
    if (!to || to === from) return;
    setBusy(from);
    try {
      await apiSend('/api/cps/automation-labels', 'PATCH', { from, to });
      toast.success(`「${from}」を「${to}」に変更しました`);
      await load();
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (label: string, processCount: number) => {
    const msg =
      processCount > 0
        ? `「${label}」を削除しますか？\n使用中の ${processCount} 工程は「未設定」に戻り、履歴からも削除されます。`
        : `「${label}」を削除しますか？履歴からも削除されます。`;
    if (!confirm(msg)) return;
    setBusy(label);
    try {
      await apiSend('/api/cps/automation-labels', 'DELETE', { label });
      toast.success(`「${label}」を削除しました`);
      await load();
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const customs = usage?.filter((u) => !u.isBuiltin) ?? [];
  const builtins = usage?.filter((u) => u.isBuiltin) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>自動化区分の管理</DialogTitle>
          <DialogDescription>
            追加したカスタム区分の名前変更・削除ができます。組込みの5区分は変更できません。
          </DialogDescription>
        </DialogHeader>

        {usage === null ? (
          <p className="text-sm text-muted-foreground">読み込み中…</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* カスタム区分 */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium text-muted-foreground">
                カスタム区分
              </div>
              {customs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  カスタム区分はまだありません。工程の区分ダイアログから追加できます。
                </p>
              ) : (
                customs.map((u) => {
                  const m = automationMeta(u.label);
                  const Icon = m.icon;
                  const changed = (edits[u.label] ?? '').trim() !== u.label;
                  const isBusy = busy === u.label;
                  return (
                    <div
                      key={u.label}
                      className="flex items-center gap-2 rounded-lg border p-2"
                    >
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center rounded p-1',
                          m.chip
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <Input
                        value={edits[u.label] ?? ''}
                        onChange={(e) =>
                          setEdits((s) => ({ ...s, [u.label]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') rename(u.label);
                        }}
                        maxLength={MAX_AUTOMATION_LABEL_LEN}
                        className="h-8"
                        disabled={isBusy}
                      />
                      <span className="w-24 shrink-0 text-[11px] text-muted-foreground">
                        {u.processCount}工程 / 履歴{u.logCount}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rename(u.label)}
                        disabled={!changed || isBusy || !(edits[u.label] ?? '').trim()}
                      >
                        変更
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => remove(u.label, u.processCount)}
                        disabled={isBusy}
                        title="削除"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {/* 組込み区分（参照のみ） */}
            <div className="flex flex-col gap-2 border-t pt-3">
              <div className="text-xs font-medium text-muted-foreground">
                組込み区分（変更不可）
              </div>
              <div className="flex flex-wrap gap-2">
                {builtins.map((u) => {
                  const m = automationMeta(u.label);
                  const Icon = m.icon;
                  return (
                    <span
                      key={u.label}
                      title={`${u.processCount}工程で使用`}
                      className={cn(
                        'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium',
                        m.chip
                      )}
                    >
                      <Icon className="size-3.5" />
                      {u.label}
                      <Lock className="size-3 opacity-60" />
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
