import { cn } from '@/lib/utils';
import { ALL_CATEGORIES } from '@/lib/cps/utils/manufacturing';
import { Layers } from 'lucide-react';

// 製造レーン（商品ライン）を絞り込むチップ列。製造だけをカテゴリで切り替える。
// categories が空（製造がカテゴリ分けされていない）なら何も表示しない。
export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: {
  categories: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  if (categories.length === 0) return null;

  const chip = (value: string, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        selected === value
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Layers className="size-3.5" /> 製造レーン
      </span>
      {chip(ALL_CATEGORIES, '全カテゴリ')}
      {categories.map((c) => chip(c, c))}
    </div>
  );
}
