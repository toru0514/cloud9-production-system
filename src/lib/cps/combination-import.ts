// 工程マスタ → 標準作業組合せ票の作業要素、への取り込みロジック。
// フェーズ（開発/製造 等）と分岐/商品ライン（= laneKey）を指定すると、
// その経路の工程を sort_order 順に並べ、各工程を1つの作業要素に変換する。
// 工程の標準時間(分) を手作業時間(秒) に写す（分×60）。送り・歩行は 0 で初期化。

import type { CpsProcess } from '@/types/cps';
import { laneKey, MANUFACTURING_PHASE } from '@/lib/cps/utils/manufacturing';
import { PHASE_ORDER } from '@/lib/cps/phases';

export type ImportProcess = Pick<
  CpsProcess,
  'name' | 'phase' | 'sort_order' | 'standard_minutes' | 'product_line' | 'route'
>;

export interface PhaseOption {
  phase: string;
  lanes: string[]; // 分岐(route) または 商品ライン(product_line) の一覧
  hasBackbone: boolean; // 分岐なし（共通/メイン）の工程を含むか
  isManufacturing: boolean; // 製造フェーズ（lane = 商品ライン）か
}

function phaseIndex(phase: string): number {
  const i = (PHASE_ORDER as string[]).indexOf(phase);
  return i < 0 ? PHASE_ORDER.length + 1 : i;
}

// データ中に実在するフェーズと、その分岐/商品ラインを集計する。
export function phaseOptionsFromProcesses(
  processes: ImportProcess[]
): PhaseOption[] {
  const byPhase = new Map<
    string,
    { lanes: Set<string>; hasBackbone: boolean }
  >();
  for (const p of processes) {
    const e = byPhase.get(p.phase) ?? { lanes: new Set(), hasBackbone: false };
    const lk = laneKey(p);
    if (lk) e.lanes.add(lk);
    else e.hasBackbone = true;
    byPhase.set(p.phase, e);
  }
  return [...byPhase.entries()]
    .map(([phase, e]) => ({
      phase,
      lanes: [...e.lanes].sort((a, b) => a.localeCompare(b, 'ja')),
      hasBackbone: e.hasBackbone,
      isManufacturing: phase === MANUFACTURING_PHASE,
    }))
    .sort(
      (a, b) => phaseIndex(a.phase) - phaseIndex(b.phase) ||
        a.phase.localeCompare(b.phase, 'ja')
    );
}

export interface ImportedElement {
  name: string;
  manual_seconds: number;
  auto_seconds: number;
  walk_seconds: number;
}

// フェーズ（＋分岐/商品ライン）に該当する工程を作業要素へ変換。
// lane を指定した場合は「その分岐 + 分岐なし(共通)工程」を経路として取り込む。
// lane = null（全体）なら、そのフェーズの全工程を取り込む。
export function elementsFromPhase(
  processes: ImportProcess[],
  phase: string,
  lane: string | null
): ImportedElement[] {
  return processes
    .filter((p) => p.phase === phase)
    .filter((p) => {
      if (lane == null) return true;
      const lk = laneKey(p);
      return lk === lane || lk === null;
    })
    .slice()
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ja')
    )
    .map((p) => ({
      name: p.name,
      manual_seconds: Math.max(0, Math.round((p.standard_minutes ?? 0) * 60)),
      auto_seconds: 0,
      walk_seconds: 0,
    }));
}

// 分岐/商品ラインの呼び名（UIラベル用）。
export function laneNoun(isManufacturing: boolean): string {
  return isManufacturing ? '商品ライン' : '分岐';
}
