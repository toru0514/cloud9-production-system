import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getProcessStatusItems } from '@/lib/cps/supabase';
import { ProcessStatusCard } from '@/components/cps/ProcessStatusCard';
import { Clapperboard } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ContentsPage() {
  const items = await getProcessStatusItems();
  const contentItems = items.filter((i) => i.process.phase === 'コンテンツ');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold">コンテンツ管理</h2>
        <p className="text-sm text-muted-foreground">
          動画・投稿・サムネの制作工程。詳細な投稿管理は v0.2 で対応予定。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clapperboard className="size-4" /> コンテンツ工程
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {contentItems.map((item) => (
            <ProcessStatusCard key={item.process.id} item={item} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          📹 投稿カレンダー・サムネ管理・台本生成連携は v0.3 で実装予定です。
        </CardContent>
      </Card>
    </div>
  );
}
