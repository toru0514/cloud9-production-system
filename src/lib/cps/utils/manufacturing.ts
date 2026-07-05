// 製造フェーズを「商品ライン（カテゴリ）」で扱うためのヘルパー。
// 製造工程は route にカテゴリ名を持つ（seed-data.ts 参照）。
// フローマップ上ではカテゴリごとの並列レーンとして描画され、ここではその絞り込みを担う。

import type { CpsProcessStatusItem } from '@/types/cps';

export const MANUFACTURING_PHASE = '製造';
export const ALL_CATEGORIES = 'all';

// データ中に実在する製造レーン（カテゴリ）の一覧。マップに出ているレーンと常に一致する。
export function manufacturingCategories(
  items: CpsProcessStatusItem[]
): string[] {
  const cats = new Set<string>();
  for (const i of items) {
    if (i.process.phase === MANUFACTURING_PHASE && i.process.route) {
      cats.add(i.process.route);
    }
  }
  return [...cats].sort((a, b) => a.localeCompare(b, 'ja'));
}

// 製造フェーズだけを選択カテゴリに絞る。製造以外のフェーズは常に残すので全体像は保たれる。
// selected === ALL_CATEGORIES なら全レーンを表示。
export function filterManufacturingByCategory(
  items: CpsProcessStatusItem[],
  selected: string
): CpsProcessStatusItem[] {
  if (selected === ALL_CATEGORIES) return items;
  return items.filter(
    (i) =>
      i.process.phase !== MANUFACTURING_PHASE || i.process.route === selected
  );
}
