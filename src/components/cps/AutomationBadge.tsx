'use client';

import { useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '@/lib/cps/client';
import { AutomationLabelManager } from '@/components/cps/AutomationLabelManager';
import {
  automationMeta,
  BUILTIN_AUTOMATION_LABELS,
  MAX_AUTOMATION_LABEL_LEN,
} from '@/lib/cps/automation';
import type { CpsAutomationLog, CpsProcess } from '@/types/cps';
import { cn } from '@/lib/utils';
import { History, Plus, Tags } from 'lucide-react';
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
  knownLabels = [],
}: {
  process: CpsProcess;
  size?: 'sm' | 'md';
  /** 他工程で使われているカスタム区分（プリセットに合流表示） */
  knownLabels?: string[];
}) {
  const router = useRouter();
  const current = process.automation;
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<CpsAutomationLog[] | null>(null);
  const [selected, setSelected] = useState<string | null>(current);
  const [note, setNote] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [added, setAdded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // 表示する区分の選択肢: 組込み + 他工程のカスタム + 履歴 + 現在値 + このダイアログで追加した分
  const options = useMemo(() => {
    const all = [
      ...BUILTIN_AUTOMATION_LABELS,
      ...knownLabels,
      ...(logs?.map((l) => l.label) ?? []),
      ...(current ? [current] : []),
      ...added,
    ];
    return [...new Set(all.map((s) => s.trim()).filter(Boolean))];
  }, [knownLabels, logs, current, added]);

  const onOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v) {
      setSelected(process.automation);
      setNote('');
      setNewLabel('');
      setAdded([]);
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

  const addLabel = () => {
    const t = newLabel.trim();
    if (!t) return;
    if (t.length > MAX_AUTOMATION_LABEL_LEN) {
      toast.error(`区分名は${MAX_AUTOMATION_LABEL_LEN}文字以内で入力してください`);
      return;
    }
    if (!options.includes(t)) setAdded((a) => [...a, t]);
    setSelected(t);
    setNewLabel('');
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
    const iconCls = size === 'md' ? 'size-3.5' : 'size-3';
    if (current) {
      const m = automationMeta(current);
      const Icon = m.icon;
      return (
        <span
          className={cn('inline-flex items-center rounded font-medium', m.chip, cls)}
        >
          <Icon className={iconCls} />
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
        <Plus className={iconCls} />
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
            現状の区分を選んで記録すると、下に履歴として残ります。区分は自由に追加できます。
          </DialogDescription>
        </DialogHeader>

        {/* 区分の選択 */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {options.map((label) => {
              const m = automationMeta(label);
              const Icon = m.icon;
              const active = selected === label;
              return (
                <button
                  key={label}
                  type="button"
                  title={m.desc}
                  onClick={() => setSelected(label)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-transparent ' + m.solid
                      : 'hover:bg-accent'
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* 新しい区分を追加 */}
          <div className="flex items-center gap-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLabel();
                }
              }}
              maxLength={MAX_AUTOMATION_LABEL_LEN}
              placeholder="新しい区分を追加（例: 半自動化）"
              className="h-9"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addLabel}
              disabled={!newLabel.trim()}
            >
              <Plus className="size-4" /> 追加
            </Button>
          </div>

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="変更の理由・メモ（任意）例: 研磨治具を導入して角度を固定"
            rows={2}
          />
          <div className="flex items-center justify-between">
            <AutomationLabelManager
              trigger={
                <Button type="button" variant="ghost" size="sm">
                  <Tags className="size-4" /> 区分を管理
                </Button>
              }
            />
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
                const m = automationMeta(log.label);
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
