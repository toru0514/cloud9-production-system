// 標準作業組合せ票の算出ロジック（純関数）。
// 保存するのは作業要素の秒数とタクトの分母分子だけ。TT・CT・各線の座標・
// 判定はすべてここで都度算出し、表・グラフ・（将来の）AI/ボトルネックが共有する。

// 線を引くための最小入力（保存済みの CpsWorkElement でも、編集中の下書きでも受ける）
export interface ElementTimes {
  manual_seconds: number;
  auto_seconds: number;
  walk_seconds: number;
  sort_order?: number;
  seq?: number;
}

// 1作業要素ぶんの線分（すべて秒単位の時間軸座標）
export interface CombinationSegment {
  index: number;
  manualStart: number; // 手作業（実線）開始
  manualEnd: number; // 手作業終了
  autoEnd: number; // 自動送り（破線）終了 = manualEnd + auto
  walkStart: number; // 歩行（波線）開始 = manualEnd
  walkEnd: number; // 歩行終了
}

export interface CombinationChart {
  segments: CombinationSegment[];
  manualTotal: number;
  autoTotal: number;
  walkTotal: number;
  ctSeconds: number; // サイクルタイム = Σ手作業 + Σ歩行
  maxAutoEnd: number; // 破線が届く最大位置（軸幅の決定に使う）
}

/** タクトタイム TT = 稼働時間(秒) ÷ 必要数。数値異常時は 0。 */
export function computeTakt(
  operatingSeconds: number,
  requiredQty: number
): number {
  if (!Number.isFinite(operatingSeconds) || !Number.isFinite(requiredQty)) {
    return 0;
  }
  if (requiredQty <= 0) return 0;
  return operatingSeconds / requiredQty;
}

/** 表示順（sort_order → seq → 元の順）に要素を並べる。 */
export function sortElements<T extends ElementTimes>(elements: T[]): T[] {
  return [...elements]
    .map((e, i) => ({ e, i }))
    .sort(
      (a, b) =>
        (a.e.sort_order ?? 0) - (b.e.sort_order ?? 0) ||
        (a.e.seq ?? 0) - (b.e.seq ?? 0) ||
        a.i - b.i
    )
    .map(({ e }) => e);
}

/**
 * 作業要素から線分を算出する。各要素で
 *   実線(手作業) cursor → cursor+手
 *   破線(自動送り) 手の終点 → +送（同じ行）
 *   波線(歩行) 手の終点 → 次の行の始点（+歩）。最終要素の歩行は始点へ戻る戻り線。
 * 累積 CT = Σ手 + Σ歩。
 */
export function computeChart(elements: ElementTimes[]): CombinationChart {
  const ordered = sortElements(elements);
  let cursor = 0;
  let manualTotal = 0;
  let autoTotal = 0;
  let walkTotal = 0;
  let maxAutoEnd = 0;

  const segments: CombinationSegment[] = ordered.map((el, index) => {
    const manual = Math.max(0, el.manual_seconds || 0);
    const auto = Math.max(0, el.auto_seconds || 0);
    const walk = Math.max(0, el.walk_seconds || 0);

    const manualStart = cursor;
    const manualEnd = cursor + manual;
    const autoEnd = manualEnd + auto;
    const walkStart = manualEnd;
    const walkEnd = manualEnd + walk;

    manualTotal += manual;
    autoTotal += auto;
    walkTotal += walk;
    maxAutoEnd = Math.max(maxAutoEnd, autoEnd);
    cursor = walkEnd;

    return { index, manualStart, manualEnd, autoEnd, walkStart, walkEnd };
  });

  return {
    segments,
    manualTotal,
    autoTotal,
    walkTotal,
    ctSeconds: cursor,
    maxAutoEnd,
  };
}

export interface CombinationVerdict {
  takt: number;
  ct: number;
  withinTakt: boolean; // CT ≤ TT
  gapSeconds: number; // CT - TT（正=オーバー / 負=手待ち）
}

/** CT と TT を比較して判定する。TT が算出不能(0)のときは判定不能扱い。 */
export function evaluateCombination(
  ctSeconds: number,
  takt: number
): CombinationVerdict {
  const gap = ctSeconds - takt;
  return {
    takt,
    ct: ctSeconds,
    withinTakt: takt > 0 ? ctSeconds <= takt + 1e-9 : false,
    gapSeconds: gap,
  };
}

/** 表示用の秒フォーマット（整数はそのまま、小数は1桁）。 */
export function fmtSec(n: number): string {
  return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1);
}
