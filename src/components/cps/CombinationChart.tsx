// 標準作業組合せ票のタイムライン（SVG）。
// 作業要素の秒数から線を算出して描画する純表示コンポーネント。
//   手作業 = 実線 / 自動送り = 破線 / 歩行 = 波線 / タクトタイム = 赤い縦線
// CT ≤ TT なら余裕（手待ち）を緑、CT > TT なら超過帯を赤で塗る。

import {
  computeChart,
  evaluateCombination,
  fmtSec,
  sortElements,
  type ElementTimes,
} from '@/lib/cps/combination';

export interface ChartElement extends ElementTimes {
  name: string;
}

// 波線（歩行）のパスを生成。始点→終点を等分し、法線方向に正弦波でオフセット。
function wavyPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amp = 2.4
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const steps = Math.max(4, Math.round(len / 7));
  const nx = -dy / len;
  const ny = dx / len;
  let d = `M${x1.toFixed(1)} ${y1.toFixed(1)}`;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const bx = x1 + dx * t;
    const by = y1 + dy * t;
    const off = Math.sin(t * Math.PI * steps) * amp * (s === steps ? 0 : 1);
    d += ` L${(bx + nx * off).toFixed(1)} ${(by + ny * off).toFixed(1)}`;
  }
  return d;
}

const C = {
  manual: 'currentColor',
  auto: '#3b82f6', // blue-500
  walk: '#f59e0b', // amber-500
  tt: '#ef4444', // red-500
  ct: '#d97706', // amber-600
  over: '#ef4444',
  wait: '#22c55e', // green-500
};

export function CombinationChart({
  elements,
  takt,
  className,
}: {
  elements: ChartElement[];
  takt: number;
  className?: string;
}) {
  const ordered = sortElements(elements) as ChartElement[];
  const chart = computeChart(ordered);
  const { segments, ctSeconds } = chart;
  const verdict = evaluateCombination(ctSeconds, takt);

  if (segments.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        作業要素を追加すると、ここに線が引かれます。
      </div>
    );
  }

  const padL = 168;
  const padR = 32;
  const padT = 30;
  const rowH = 42;
  const pxPerSec = 13;

  const n = segments.length;
  const maxT = Math.max(takt, ctSeconds, chart.maxAutoEnd) + 3;
  const chartBottom = padT + n * rowH;
  const width = Math.round(padL + maxT * pxPerSec + padR);
  const height = chartBottom + 46;

  const px = (t: number) => padL + t * pxPerSec;
  const rowY = (i: number) => padT + i * rowH + rowH / 2;

  const ticks: number[] = [];
  for (let t = 0; t <= maxT; t++) ticks.push(t);

  return (
    <div className={`overflow-x-auto ${className ?? ''}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="標準作業組合せ票のタイムライン"
        className="text-foreground"
      >
        {/* 手待ち / 超過帯 */}
        {takt > 0 && ctSeconds > takt && (
          <rect
            x={px(takt)}
            y={padT}
            width={(ctSeconds - takt) * pxPerSec}
            height={n * rowH}
            fill={C.over}
            opacity={0.08}
          />
        )}
        {takt > 0 && takt > ctSeconds && (
          <rect
            x={px(ctSeconds)}
            y={padT}
            width={(takt - ctSeconds) * pxPerSec}
            height={n * rowH}
            fill={C.wait}
            opacity={0.1}
          />
        )}

        {/* 縦グリッド（1秒ごと、10秒ごとにラベル） */}
        {ticks.map((t) => {
          const ten = t % 10 === 0;
          return (
            <g key={`t${t}`}>
              <line
                x1={px(t)}
                y1={padT}
                x2={px(t)}
                y2={chartBottom}
                stroke="currentColor"
                strokeWidth={ten ? 1 : 0.5}
                strokeOpacity={ten ? 0.22 : 0.1}
              />
              {ten && t > 0 && (
                <text
                  x={px(t)}
                  y={chartBottom + 16}
                  textAnchor="middle"
                  fill="currentColor"
                  opacity={0.45}
                  fontSize={10}
                >
                  {t}
                </text>
              )}
            </g>
          );
        })}

        {/* 行のベースライン + 作業名ラベル */}
        {segments.map((s, i) => {
          const nm = ordered[i]?.name ?? `作業${i + 1}`;
          const short = nm.length > 15 ? nm.slice(0, 14) + '…' : nm;
          return (
            <g key={`r${i}`}>
              <line
                x1={padL}
                y1={rowY(i)}
                x2={px(maxT)}
                y2={rowY(i)}
                stroke="currentColor"
                strokeWidth={0.5}
                strokeOpacity={0.12}
              />
              <text
                x={padL - 12}
                y={rowY(i) + 4}
                textAnchor="end"
                fill="currentColor"
                opacity={0.7}
                fontSize={11}
              >
                {i + 1}. {short}
              </text>
            </g>
          );
        })}

        {/* 各要素の線: 手作業(実線) / 自動送り(破線) / 歩行(波線) */}
        {segments.map((s, i) => {
          const y = rowY(i);
          const last = i === segments.length - 1;
          const walkTargetY = last ? rowY(0) : rowY(i + 1);
          const walkTargetX = last ? px(0) : px(s.walkEnd);
          return (
            <g key={`s${i}`}>
              {s.manualEnd > s.manualStart && (
                <line
                  x1={px(s.manualStart)}
                  y1={y}
                  x2={px(s.manualEnd)}
                  y2={y}
                  stroke={C.manual}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                />
              )}
              {s.autoEnd > s.manualEnd && (
                <line
                  x1={px(s.manualEnd)}
                  y1={y}
                  x2={px(s.autoEnd)}
                  y2={y}
                  stroke={C.auto}
                  strokeWidth={2.4}
                  strokeDasharray="5 3"
                  strokeLinecap="round"
                />
              )}
              {s.walkEnd > s.walkStart && (
                <path
                  d={wavyPath(px(s.walkStart), y, walkTargetX, walkTargetY)}
                  fill="none"
                  stroke={C.walk}
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeDasharray={last ? '2 2' : undefined}
                />
              )}
            </g>
          );
        })}

        {/* タクトタイム（赤い縦線） */}
        {takt > 0 && (
          <>
            <line
              x1={px(takt)}
              y1={padT - 8}
              x2={px(takt)}
              y2={chartBottom + 4}
              stroke={C.tt}
              strokeWidth={2.2}
            />
            <text
              x={px(takt)}
              y={padT - 12}
              textAnchor="middle"
              fill={C.tt}
              fontSize={10}
              fontWeight={600}
            >
              TT {fmtSec(takt)}
            </text>
          </>
        )}

        {/* サイクルタイム（破線） */}
        {Math.abs(ctSeconds - takt) > 0.01 && (
          <>
            <line
              x1={px(ctSeconds)}
              y1={padT - 2}
              x2={px(ctSeconds)}
              y2={chartBottom + 4}
              stroke={C.ct}
              strokeWidth={1.8}
              strokeDasharray="4 3"
            />
            <text
              x={px(ctSeconds)}
              y={chartBottom + 32}
              textAnchor="middle"
              fill={C.ct}
              fontSize={10}
              fontWeight={600}
            >
              CT {fmtSec(ctSeconds)}
            </text>
          </>
        )}
      </svg>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 px-2 pt-1 text-xs text-muted-foreground">
        <LegendLine label="手作業（実線）" />
        <LegendLine label="自動送り（破線）" color={C.auto} dash="5 3" />
        <LegendWave label="歩行（波線）" />
        <LegendTick label="タクトタイム" />
        <span className="ml-auto tabular-nums">
          判定:{' '}
          {verdict.takt <= 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : verdict.withinTakt ? (
            <span className="font-medium text-emerald-600">タクト内</span>
          ) : (
            <span className="font-medium text-red-600">
              タクト割れ +{fmtSec(verdict.gapSeconds)}秒
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function LegendLine({ label, color, dash }: { label: string; color?: string; dash?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="28" height="8" viewBox="0 0 28 8" className="text-foreground">
        <line
          x1="0"
          y1="4"
          x2="28"
          y2="4"
          stroke={color ?? 'currentColor'}
          strokeWidth="2.4"
          strokeDasharray={dash}
        />
      </svg>
      {label}
    </span>
  );
}

function LegendWave({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="28" height="8" viewBox="0 0 28 8">
        <path
          d="M0 4 q3.5 -3 7 0 t7 0 t7 0 t7 0"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.9"
        />
      </svg>
      {label}
    </span>
  );
}

function LegendTick({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="10" height="8" viewBox="0 0 10 8">
        <line x1="5" y1="0" x2="5" y2="8" stroke="#ef4444" strokeWidth="2.4" />
      </svg>
      {label}
    </span>
  );
}
