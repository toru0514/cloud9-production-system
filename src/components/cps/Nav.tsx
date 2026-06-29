'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Workflow,
  Package,
  Lightbulb,
  BarChart3,
  Clapperboard,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/flow', label: '工程マップ', icon: Workflow },
  { href: '/products', label: '商品', icon: Package },
  { href: '/contents', label: 'コンテンツ', icon: Clapperboard },
  { href: '/improvements', label: '改善', icon: Lightbulb },
  { href: '/kpi', label: 'KPI', icon: BarChart3 },
  { href: '/settings', label: '設定', icon: Settings },
];

export function Nav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className="flex gap-1 overflow-x-auto px-2 md:flex-col md:gap-1 md:overflow-visible md:px-3">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive(href)
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
