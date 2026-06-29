import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getProcess,
  getProcessStatusItems,
  listImprovements,
  listProducts,
  listWorkLogs,
} from '@/lib/cps/supabase';
import { StatusDot } from '@/components/cps/StatusDot';
import { WorkLogForm } from '@/components/cps/WorkLogForm';
import { ImprovementForm } from '@/components/cps/ImprovementForm';
import { AiSuggestButton } from '@/components/cps/AiSuggestButton';
import { Markdown } from '@/components/cps/Markdown';
import { ImprovementStatusControl } from '@/components/cps/ImprovementStatusControl';
import { formatMinutes } from '@/lib/cps/utils/kpi';
import { statusMeta } from '@/lib/cps/utils/status';
import { ChevronLeft, Wrench } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProcessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const process = await getProcess(id);
  if (!process) notFound();

  const [statusItems, logs, improvements, products] = await Promise.all([
    getProcessStatusItems(),
    listWorkLogs(id),
    listImprovements(id),
    listProducts(),
  ]);

  const statusItem = statusItems.find((s) => s.process.id === id);
  const recentAvg = statusItem?.recent_avg_minutes ?? null;
  const status = statusItem?.status ?? 'normal';
  const meta = statusMeta[status];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> ダッシュボードへ戻る
      </Link>

      {/* ヘッダ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusDot status={status} />
          <div>
            <div className="text-xs text-muted-foreground">{process.phase}</div>
            <h2 className="text-2xl font-bold">{process.name}</h2>
          </div>
          <Badge variant="outline" className={meta.color}>
            {meta.label}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <AiSuggestButton processId={id} />
          <WorkLogForm processId={id} products={products} />
        </div>
      </div>

      {/* メトリクス */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="px-5">
            <div className="text-xs text-muted-foreground">標準時間</div>
            <div className="text-2xl font-bold tabular-nums">
              {process.standard_minutes
                ? formatMinutes(process.standard_minutes)
                : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-5">
            <div className="text-xs text-muted-foreground">
              実績（直近30日平均）
            </div>
            <div className={`text-2xl font-bold tabular-nums ${meta.color}`}>
              {recentAvg != null ? formatMinutes(recentAvg) : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-5">
            <div className="text-xs text-muted-foreground">標準比</div>
            <div className={`text-2xl font-bold tabular-nums ${meta.color}`}>
              {process.standard_minutes && recentAvg
                ? `${(recentAvg / process.standard_minutes).toFixed(2)}×`
                : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 使用工具 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="size-4" /> 使用工具
          </CardTitle>
        </CardHeader>
        <CardContent>
          {process.tools.length === 0 ? (
            <p className="text-sm text-muted-foreground">未登録</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {process.tools.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          )}
          {process.description && (
            <p className="mt-3 text-sm text-muted-foreground">
              {process.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 改善履歴 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">改善履歴</CardTitle>
          <ImprovementForm processId={id} />
        </CardHeader>
        <CardContent>
          {improvements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              まだ改善記録がありません。
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {improvements.map((imp) => (
                <div
                  key={imp.id}
                  className="rounded-lg border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{imp.title}</span>
                      {imp.effect_minutes != null && (
                        <Badge className="bg-emerald-600">
                          -{imp.effect_minutes}min
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {imp.implemented_at && (
                        <span className="text-xs text-muted-foreground">
                          {imp.implemented_at}
                        </span>
                      )}
                      <ImprovementStatusControl
                        id={imp.id}
                        status={imp.status}
                      />
                    </div>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* 作業実績 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">作業実績（直近）</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              まだ実績がありません。
            </p>
          ) : (
            <div className="flex flex-col divide-y">
              {logs.slice(0, 15).map((log) => {
                const product = products.find((p) => p.id === log.product_id);
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-muted-foreground">
                        {new Date(log.started_at).toLocaleDateString('ja-JP')}
                      </span>
                      {product && (
                        <Badge variant="outline">{product.name}</Badge>
                      )}
                      {log.memo && (
                        <span className="text-muted-foreground">
                          {log.memo}
                        </span>
                      )}
                    </div>
                    <span className="font-medium tabular-nums">
                      {log.duration_minutes != null
                        ? formatMinutes(log.duration_minutes)
                        : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
