import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listProducts } from '@/lib/cps/supabase';
import { ProductForm } from '@/components/cps/ProductForm';
import { formatYen } from '@/lib/cps/utils/kpi';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await listProducts();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">商品</h2>
          <p className="text-sm text-muted-foreground">
            {products.length} 件の商品
          </p>
        </div>
        <ProductForm />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">商品一覧</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead>木材</TableHead>
                <TableHead className="text-right">価格</TableHead>
                <TableHead className="text-right">原価</TableHead>
                <TableHead className="text-right">粗利</TableHead>
                <TableHead>フェーズ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const margin =
                  p.price != null && p.cost != null ? p.price - p.cost : null;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/products/${p.id}`}
                        className="hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>{p.category ?? '—'}</TableCell>
                    <TableCell>{p.wood_type ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.price != null ? formatYen(p.price) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {p.cost != null ? formatYen(p.cost) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-emerald-600">
                      {margin != null ? formatYen(margin) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.current_status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
