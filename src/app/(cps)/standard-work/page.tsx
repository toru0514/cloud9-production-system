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
import {
  getWorkCombination,
  listProcesses,
  listWorkCombinations,
} from '@/lib/cps/supabase';
import { CombinationForm } from '@/components/cps/CombinationForm';
import {
  computeChart,
  computeTakt,
  evaluateCombination,
  fmtSec,
} from '@/lib/cps/combination';

export const dynamic = 'force-dynamic';

export default async function StandardWorkPage() {
  const [combos, processes] = await Promise.all([
    listWorkCombinations(),
    listProcesses(),
  ]);
  const details = await Promise.all(
    combos.map((c) => getWorkCombination(c.id))
  );
  const procName = new Map(processes.map((p) => [p.id, p.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">標準作業組合せ票</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            1工程を作業要素に分解し、手作業・自動送り・歩行の時間をタクトタイムに
            対して組み合わせ、手待ち・歩行のムダを見える化する帳票です。
          </p>
        </div>
        <CombinationForm processes={processes} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">組合せ票一覧</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {combos.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">
              まだ組合せ票がありません。「組合せ票を作成」から始めましょう。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead className="text-right">TT（秒）</TableHead>
                  <TableHead className="text-right">CT（秒）</TableHead>
                  <TableHead>判定</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combos.map((c, i) => {
                  const detail = details[i];
                  const takt = computeTakt(c.operating_seconds, c.required_qty);
                  const chart = detail
                    ? computeChart(detail.elements)
                    : null;
                  const verdict = chart
                    ? evaluateCombination(chart.ctSeconds, takt)
                    : null;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/standard-work/${c.id}`}
                          className="hover:underline"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.phase
                          ? c.phase
                          : c.process_id
                            ? procName.get(c.process_id) ?? '—'
                            : '—'}
                        {c.lane ? (
                          <Badge variant="outline" className="ml-2">
                            {c.lane}
                          </Badge>
                        ) : c.product_line ? (
                          <Badge variant="outline" className="ml-2">
                            {c.product_line}
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {takt > 0 ? fmtSec(takt) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {chart ? fmtSec(chart.ctSeconds) : '—'}
                      </TableCell>
                      <TableCell>
                        {!verdict || verdict.takt <= 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : verdict.withinTakt ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-300 text-emerald-700 dark:text-emerald-400"
                          >
                            タクト内
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-red-300 text-red-700 dark:text-red-400"
                          >
                            タクト割れ +{fmtSec(verdict.gapSeconds)}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
