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
import { apiSend } from '@/lib/cps/client';
import { Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

export function ImprovementForm({
  processId,
  trigger,
  presetAiSuggestion,
}: {
  processId: string;
  trigger?: React.ReactNode;
  presetAiSuggestion?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [effectMin, setEffectMin] = useState('');
  const [effectDesc, setEffectDesc] = useState('');

  const submit = async () => {
    if (!title.trim()) {
      toast.error('タイトルは必須です');
      return;
    }
    setSaving(true);
    try {
      await apiSend('/api/cps/improvements', 'POST', {
        process_id: processId,
        title: title.trim(),
        before_desc: before || null,
        after_desc: after || null,
        effect_minutes: effectMin ? Number(effectMin) : null,
        effect_desc: effectDesc || null,
        status: 'proposed',
        ai_suggestion: presetAiSuggestion ?? null,
      });
      toast.success('改善を記録しました');
      setOpen(false);
      setTitle('');
      setBefore('');
      setAfter('');
      setEffectMin('');
      setEffectDesc('');
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
          <Button variant="outline">
            <Lightbulb className="size-4" /> 新しい改善を記録
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>改善を記録</DialogTitle>
          <DialogDescription>
            改善前・後・効果を記録し、カイゼンの履歴を残します。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>タイトル *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: #120 で粗削りを先行"
            />
          </div>
          <div className="grid gap-2">
            <Label>改善前</Label>
            <Textarea
              value={before}
              onChange={(e) => setBefore(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>改善後</Label>
            <Textarea
              value={after}
              onChange={(e) => setAfter(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div className="grid gap-2">
              <Label>削減時間(分)</Label>
              <Input
                type="number"
                value={effectMin}
                onChange={(e) => setEffectMin(e.target.value)}
                placeholder="8"
              />
            </div>
            <div className="grid gap-2">
              <Label>効果の説明</Label>
              <Input
                value={effectDesc}
                onChange={(e) => setEffectDesc(e.target.value)}
              />
            </div>
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
