'use client';

import { useMemo, useState } from 'react';
import { FlowCanvas } from '@/components/cps/FlowCanvas';
import { CategoryFilter } from '@/components/cps/CategoryFilter';
import {
  ALL_CATEGORIES,
  filterManufacturingByCategory,
  manufacturingCategories,
} from '@/lib/cps/utils/manufacturing';
import type { CpsProcessStatusItem } from '@/types/cps';

// /flow のクライアントラッパー。カテゴリ（商品ライン）で製造レーンを絞り込む。
// デフォルトは全カテゴリ＝全レーン表示（全体像を保つ）。
export function FlowView({ items }: { items: CpsProcessStatusItem[] }) {
  const [selected, setSelected] = useState<string>(ALL_CATEGORIES);
  const categories = useMemo(() => manufacturingCategories(items), [items]);
  const filtered = useMemo(
    () => filterManufacturingByCategory(items, selected),
    [items, selected]
  );

  return (
    <div className="flex flex-col gap-3">
      <CategoryFilter
        categories={categories}
        selected={selected}
        onSelect={setSelected}
      />
      <FlowCanvas items={filtered} />
    </div>
  );
}
