import Link from 'next/link';
import { Nav } from '@/components/cps/Nav';
import { isSupabaseConfigured, isGeminiConfigured } from '@/lib/cps/config';
import { Boxes } from 'lucide-react';

export default function CpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* サイドバー */}
      <aside className="border-b bg-background md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="sticky top-0">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-4 text-lg font-bold"
          >
            <Boxes className="size-6 text-primary" />
            <span>CPS</span>
          </Link>
          <div className="pb-3 md:py-2">
            <Nav />
          </div>
          {!isSupabaseConfigured() && (
            <div className="mx-3 mb-3 hidden rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-800 md:block dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              モックデータで動作中。
              <br />
              Supabase 未設定 / Gemini{' '}
              {isGeminiConfigured() ? '設定済' : '未設定'}
            </div>
          )}
        </div>
      </aside>

      {/* メイン */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background px-5 py-3">
          <h1 className="text-sm font-semibold text-muted-foreground">
            Cloud9 Production System
          </h1>
          <span className="text-sm tabular-nums text-muted-foreground">
            {today}
          </span>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
