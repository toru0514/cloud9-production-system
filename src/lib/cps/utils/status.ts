// 工程ステータス計算ロジック（仕様書 §11）

import { cpsConfig } from '@/lib/cps/config';
import type { ProcessStatus } from '@/types/cps';

export function calcProcessStatus(
  standardMinutes: number | null,
  recentAvgMinutes: number | null,
  lastLoggedAt: Date | null,
  hasOpenImprovement = false
): ProcessStatus {
  const stopDays = cpsConfig.bottleneck.stopDays;

  // 改善工程など標準時間が未設定で実績も無いものは「正常（計測対象外）」扱い
  const isMeasured = standardMinutes != null;

  // 未記録 → 停止（ただし計測対象工程のみ）
  if (!lastLoggedAt) {
    return isMeasured ? 'stopped' : 'normal';
  }
  const daysSinceLog =
    (Date.now() - lastLoggedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (isMeasured && daysSinceLog > stopDays) return 'stopped';

  // 標準時間 or 実績が無い → 正常（まだ計測中）
  if (!standardMinutes || !recentAvgMinutes) {
    return hasOpenImprovement ? 'caution' : 'normal';
  }

  const ratio = recentAvgMinutes / standardMinutes;
  if (ratio <= cpsConfig.bottleneck.cautionRatio) {
    return hasOpenImprovement ? 'caution' : 'normal';
  }
  if (ratio <= 1.5) return 'caution';
  return 'stopped'; // 1.5倍超 → 停止扱い（重大ボトルネック）
}

export const statusMeta: Record<
  ProcessStatus,
  { label: string; emoji: string; color: string; dot: string }
> = {
  normal: {
    label: '正常',
    emoji: '🟢',
    color: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  caution: {
    label: '改善候補',
    emoji: '🟡',
    color: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  stopped: {
    label: '停止',
    emoji: '🔴',
    color: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
  },
};
