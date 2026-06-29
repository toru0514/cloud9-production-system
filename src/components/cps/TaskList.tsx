'use client';

import { useState, useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiSend } from '@/lib/cps/client';
import type { CpsTask } from '@/types/cps';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const priorityMeta: Record<number, { label: string; cls: string }> = {
  1: { label: '高', cls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  2: { label: '中', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  3: { label: '低', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' },
};

export function TaskList({ initialTasks }: { initialTasks: CpsTask[] }) {
  const [tasks, setTasks] = useState<CpsTask[]>(initialTasks);
  const [title, setTitle] = useState('');
  const [pending, startTransition] = useTransition();

  const toggle = (task: CpsTask) => {
    const next = !task.is_done;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_done: next } : t))
    );
    startTransition(async () => {
      try {
        await apiSend(`/api/cps/tasks/${task.id}`, 'PATCH', { is_done: next });
      } catch (e) {
        toast.error((e as Error).message);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, is_done: !next } : t
          )
        );
      }
    });
  };

  const add = () => {
    const value = title.trim();
    if (!value) return;
    setTitle('');
    startTransition(async () => {
      try {
        const created = await apiSend<CpsTask>('/api/cps/tasks', 'POST', {
          title: value,
          priority: 2,
          due_date: new Date().toISOString().slice(0, 10),
        });
        setTasks((prev) => [...prev, created]);
        toast.success('タスクを追加しました');
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        {tasks.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            今日のタスクはありません 🎉
          </p>
        )}
        {tasks.map((task) => (
          <label
            key={task.id}
            className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1.5 hover:bg-accent"
          >
            <Checkbox
              checked={task.is_done}
              onCheckedChange={() => toggle(task)}
              className="mt-0.5"
            />
            <span
              className={cn(
                'flex-1 text-sm',
                task.is_done && 'text-muted-foreground line-through'
              )}
            >
              {task.title}
            </span>
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                priorityMeta[task.priority]?.cls
              )}
            >
              {priorityMeta[task.priority]?.label}
            </span>
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={title}
          placeholder="タスクを追加…"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          disabled={pending}
        />
        <Button size="icon" onClick={add} disabled={pending || !title.trim()}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
