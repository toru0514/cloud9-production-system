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
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '@/lib/cps/client';
import { AUTOMATION_META, AUTOMATION_ORDER } from '@/lib/cps/automation';
import type { AutomationLabel, CpsAutomationLog, CpsProcess } from '@/types/cps';
import { cn } from '@/lib/utils';
import { History, Plus } from 'lucide-react';
import { toast } from 'sonner';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AutomationBadge({
  process,
  size = 'sm',
}: {
  process: CpsProcess;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const current = process.automation;
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<CpsAutomationLog[] | null>(null);
  const [selected, setSelected] = useState<AutomationLabel | null>(current);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const onOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v) {
      setSelected(process.automation);
      setNote('');
      setLogs(null);
      try {
        const data = await apiGet<CpsAutomationLog[]>(
          `/api/cps/processes/${process.id}/automation`
        );
        setLogs(data);
      } catch (e) {
        toast.error((e as Error).message);
        setLogs([]);
      }
    }
  };

  const save = async () => {
    if (!selected) {
      toast.error('区分を選んでください');
      return;
    }
    setSaving(true);
    try {
      await apiSend(`/api/cps/processes/${process.id}/automation`, 'POST', {
        label: selected,
        note: note.trim() || undefined,
      });
      toast.success('自動化区分を記録しました');
      setNote('');
      const data = await apiGet<CpsAutomationLog[]>(
        `/api/cps/processes/${process.id}/automation`
      );
      setLogs(data);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const chip = (() => {
    const cls =
      size === 'md'
        ? 'gap-1 px-2 py-0.5 text-xs'
        : 'gap-0.5 px-1 py-px text-[10px]';
    if (current) {
      const m = AUTOMATION_META[current];
      const Icon = m.icon;
      return (
        <span
          className={cn(
            'inline-flex items-center rounded font-medium',
            m.chip,
            cls
          )}
        >
          <Icon className={size === 'md' ? 'size-3.5' : 'size-3'} />
          {current}
        </span>
      );
    }
    return (
      <span
        className={cn(
          'inline-flex items-center rounded border border-dashed border-muted-foreground/40 font-medium text-muted-foreground',
          cls
        )}
      >
        <Plus className={size === 'md' ? 'size-3.5' : 'size-3'} />
        区分
      </span>
    );
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          draggable={false}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="cursor-pointer rounded transition-opacity hover:opacity-80"
          title="自動化区分の変更・履歴"
        >
          {chip}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />「{process.name}」の自動化区分
          </DialogTitle>
          <DialogDescription>
            現状の区分を選んで記録すると、下に履歴として残ります。
          </DialogDescription>
        </DialogHeader>

        {/* 区分の選択 */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {AUTOMATION_ORDER.map((label) => {
              const m = AUTOMATION_META[label];
              const Icon = m.icon;
              const active = selected === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSelected(label)}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border p-2 text-left transition-colors',
                    active
                      ? 'border-transparent ring-2 ring-offset-1 ' + m.solid
                      : 'hover:bg-accent'
                  )}
                >
                  <Icon className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{label}</span>
                    <span
                      className={cn(
                        'block text-[11px]',
                        active ? 'text-white/80' : 'text-muted-foreground'
                      )}
                    >
                      {m.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="変更の理由・メモ（任意）例: 研磨治具を導入して角度を固定"
            rows={2}
          />
          <div className="flex justify-end">
            <Button
              onClick={save}
              disabled={saving || !selected || selected === current}
            >
              {saving
                ? '記録中…'
                : selected && selected === current
                  ? '現状のまま'
                  : 'この区分で記録'}
            </Button>
          </div>
        </div>

        {/* 履歴 */}
        <div className="mt-2 border-t pt-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            変更履歴
          </div>
          {logs === null ? (
            <p className="text-sm text-muted-foreground">読み込み中…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              まだ履歴がありません。
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {logs.map((log, i) => {
                const m = AUTOMATION_META[log.label];
                const Icon = m.icon;
                return (
                  <li key={log.id} className="flex items-start gap-2">
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
                        m.chip
                      )}
                    >
                      <Icon className="size-3" />
                      {log.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {fmtDate(log.created_at)}
                        </span>
                        {i === 0 && (
                          <span className="rounded bg-foreground px-1 text-[10px] font-bold text-background">
                            現状
                          </span>
                        )}
                      </div>
                      {log.note && <p className="text-sm">{log.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
