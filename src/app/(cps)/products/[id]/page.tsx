import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getProduct, listProcesses, listWorkLogs } from '@/lib/cps/supabase';
import { ProductForm } from '@/components/cps/ProductForm';
import { formatMinutes, formatYen } from '@/lib/cps/utils/kpi';
import { ChevronLeft, Pencil, ImageOff } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const [allLogs, processes] = await Promise.all([
    listWorkLogs(),
    listProcesses(),
  ]);
  const logs = allLogs.filter((l) => l.product_id === id);
  const processName = (pid: string) =>
    processes.find((p) => p.id === pid)?.name ?? pid;
  const totalMinutes = logs.reduce(
    (a, l) => a + (l.duration_minutes ?? 0),
    0
  );
  const margin =
    product.price != null && product.cost != null
      ? product.price - product.cost
      : null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/products"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> 商品一覧へ戻る
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <Badge variant="secondary">{product.current_status}</Badge>
            {!product.is_active && <Badge variant="outline">非アクティブ</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {product.category ?? '—'} / {product.wood_type ?? '—'}
          </p>
        </div>
        <ProductForm
          product={product}
          trigger={
            <Button variant="outline">
              <Pencil className="size-4" /> 編集
            </Button>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* 写真（v0.2 予定のプレースホルダ） */}
        <Card>
          <CardContent className="flex aspect-square flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-10" />
            <span className="text-xs">写真は v0.2 で対応</span>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="販売価格" value={product.price != null ? formatYen(product.price) : '—'} />
            <Metric label="原価" value={product.cost != null ? formatYen(product.cost) : '—'} />
            <Metric
              label="粗利"
              value={margin != null ? formatYen(margin) : '—'}
              accent="text-emerald-600"
            />
            <Metric label="累計工数" value={formatMinutes(totalMinutes)} />
          </div>

          {product.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">説明</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{product.description}</p>
                {product.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {product.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">この商品の作業実績</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  まだ実績がありません。
                </p>
              ) : (
                <div className="flex flex-col divide-y">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-muted-foreground">
                          {new Date(log.started_at).toLocaleDateString('ja-JP')}
                        </span>
                        <Badge variant="outline">
                          {processName(log.process_id)}
                        </Badge>
                      </div>
                      <span className="font-medium tabular-nums">
                        {log.duration_minutes != null
                          ? formatMinutes(log.duration_minutes)
                          : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="px-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-lg font-bold tabular-nums ${accent ?? ''}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
