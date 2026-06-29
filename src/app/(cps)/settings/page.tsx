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
import { listProcesses } from '@/lib/cps/supabase';
import {
  isGeminiConfigured,
  isSupabaseConfigured,
  cpsConfig,
} from '@/lib/cps/config';
import { CheckCircle2, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function ConfigRow({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      {ok ? (
        <Badge className="bg-emerald-600">
          <CheckCircle2 className="size-3" /> 設定済
        </Badge>
      ) : (
        <Badge variant="outline" className="text-amber-600">
          <XCircle className="size-3" /> 未設定
        </Badge>
      )}
    </div>
  );
}

export default async function SettingsPage() {
  const processes = await listProcesses();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">設定 / マスターデータ</h2>
        <p className="text-sm text-muted-foreground">
          接続状況と工程マスタの確認。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">接続状況</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <ConfigRow
            ok={isSupabaseConfigured()}
            label="Supabase"
            hint="NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY。未設定時は内蔵モックデータで動作します。"
          />
          <ConfigRow
            ok={isGeminiConfigured()}
            label={`Gemini (${cpsConfig.ai.model})`}
            hint="GEMINI_API_KEY。未設定時は AI改善案がモック応答になります。"
          />
          {!isSupabaseConfigured() && (
            <p className="pt-3 text-xs text-muted-foreground">
              本番運用するには <code>.env.local</code> に Supabase / Gemini の
              認証情報を設定し、 <code>supabase/migrations</code> の SQL
              を実行してください。
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            工程マスタ（{processes.length} 工程）
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">順序</TableHead>
                <TableHead>工程名</TableHead>
                <TableHead>フェーズ</TableHead>
                <TableHead className="text-right">標準時間</TableHead>
                <TableHead>工具</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {p.sort_order}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.phase}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.standard_minutes != null ? `${p.standard_minutes}分` : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.tools.length ? p.tools.join('、') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
