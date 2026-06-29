import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listImprovements, listProcesses } from '@/lib/cps/supabase';
import { ImprovementStatusControl } from '@/components/cps/ImprovementStatusControl';
import { Markdown } from '@/components/cps/Markdown';
import type { ImprovementStatus } from '@/types/cps';

export const dynamic = 'force-dynamic';

const statusOrder: { key: ImprovementStatus; label: string }[] = [
  { key: 'proposed', label: '提案' },
  { key: 'in_progress', label: '実施中' },
  { key: 'done', label: '完了' },
];

export default async function ImprovementsPage() {
  const [improvements, processes] = await Promise.all([
    listImprovements(),
    listProcesses(),
  ]);

  const processName = (pid: string) =>
    processes.find((p) => p.id === pid)?.name ?? '不明な工程';

  const totalEffect = improvements
    .filter((i) => i.status === 'done')
    .reduce((a, i) => a + (i.effect_minutes ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">改善管理</h2>
        <p className="text-sm text-muted-foreground">
          提案 → 実施 → 効果測定。カイゼンの永続ループを回す。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statusOrder.map((s) => (
          <Card key={s.key}>
            <CardContent className="px-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-bold tabular-nums">
                {improvements.filter((i) => i.status === s.key).length}
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="px-4">
            <div className="text-xs text-muted-foreground">累計削減</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-600">
              -{totalEffect}min
            </div>
          </CardContent>
        </Card>
      </div>

      {statusOrder.map((s) => {
        const items = improvements.filter((i) => i.status === s.key);
        if (items.length === 0) return null;
        return (
          <Card key={s.key}>
            <CardHeader>
              <CardTitle className="text-base">
                {s.label}（{items.length}）
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {items.map((imp) => (
                <div key={imp.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/process/${imp.process_id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        {processName(imp.process_id)}
                      </Link>
                      <span className="font-medium">{imp.title}</span>
                      {imp.effect_minutes != null && (
                        <Badge className="bg-emerald-600">
                          -{imp.effect_minutes}min
                        </Badge>
                      )}
                    </div>
                    <ImprovementStatusControl id={imp.id} status={imp.status} />
                  </div>
                  {imp.before_desc && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium">前:</span> {imp.before_desc}
                    </p>
                  )}
                  {imp.after_desc && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">後:</span> {imp.after_desc}
                    </p>
                  )}
                  {imp.effect_desc && (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      効果: {imp.effect_desc}
                    </p>
                  )}
                  {imp.ai_suggestion && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-violet-600">
                        AI提案を表示
                      </summary>
                      <div className="mt-1 rounded-md border bg-muted/30 p-3">
                        <Markdown content={imp.ai_suggestion} />
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {improvements.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            まだ改善記録がありません。工程詳細から改善を記録してください。
          </CardContent>
        </Card>
      )}
    </div>
  );
}
