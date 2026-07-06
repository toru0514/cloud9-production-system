// 製造フェーズを「商品ライン」で扱うためのヘルパー。
// 製造工程は product_line に商品ライン名を持つ（route の枝1/枝2 とは別軸）。
// フローマップ上ではレーン（列）ごとに並列描画され、ここではそのキー算出と絞り込みを担う。

import type { CpsProcess, CpsProcessStatusItem } from '@/types/cps';

export const MANUFACTURING_PHASE = '製造';
export const ALL_CATEGORIES = 'all';

// レーン（列）のキー。商品ライン優先、無ければ route（枝）。どちらも無ければ null（メイン）。
// product_line は製造工程にのみ設定されるため、全フェーズで安全に使える。
export function laneKey(
  process: Pick<CpsProcess, 'product_line' | 'route'>
): string | null {
  return process.product_line ?? process.route ?? null;
}

// データ中に実在する製造レーンの一覧。マップに出ているレーンと常に一致する。
export function manufacturingCategories(
  items: CpsProcessStatusItem[]
): string[] {
  const cats = new Set<string>();
  for (const i of items) {
    if (i.process.phase !== MANUFACTURING_PHASE) continue;
    const key = laneKey(i.process);
    if (key) cats.add(key);
  }
  return [...cats].sort((a, b) => a.localeCompare(b, 'ja'));
}

// 製造フェーズだけを選択レーンに絞る。製造以外のフェーズは常に残すので全体像は保たれる。
// selected === ALL_CATEGORIES なら全レーンを表示。
export function filterManufacturingByCategory(
  items: CpsProcessStatusItem[],
  selected: string
): CpsProcessStatusItem[] {
  if (selected === ALL_CATEGORIES) return items;
  return items.filter(
    (i) =>
      i.process.phase !== MANUFACTURING_PHASE || laneKey(i.process) === selected
  );
}
