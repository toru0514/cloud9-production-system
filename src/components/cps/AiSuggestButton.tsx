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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiSend } from '@/lib/cps/client';
import { Markdown } from '@/components/cps/Markdown';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImproveResponse {
  suggestion: string;
  mocked: boolean;
  saved_to: string | null;
}

export function AiSuggestButton({ processId }: { processId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ImproveResponse | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const res = await apiSend<ImproveResponse>(
        '/api/cps/ai/improve',
        'POST',
        { process_id: processId, save: true }
      );
      setResult(res);
      setOpen(true);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={run} disabled={loading} variant="secondary">
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        AI改善案を生成
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-violet-500" />
              AI改善案（TPS）
            </DialogTitle>
            <DialogDescription>
              {result?.mocked
                ? 'モック応答です（GEMINI_API_KEY 未設定）'
                : 'Gemini Flash による生成結果です'}
              {result?.saved_to && ' — 改善記録に保存しました'}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 p-4">
            {result && <Markdown content={result.suggestion} />}
          </div>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
