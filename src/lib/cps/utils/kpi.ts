// KPI 集計ロジック

import type { CpsKpiDaily } from '@/types/cps';

export function startOfWeek(d = new Date()): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 月曜始まり
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function sumKpi(
  rows: CpsKpiDaily[],
  since: Date,
  field: keyof Pick<
    CpsKpiDaily,
    | 'total_work_minutes'
    | 'products_completed'
    | 'posts_published'
    | 'revenue'
    | 'improvement_count'
    | 'ai_usage_count'
  >
): number {
  const sinceStr = since.toISOString().slice(0, 10);
  return rows
    .filter((r) => r.date >= sinceStr)
    .reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}分`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

export function formatYen(yen: number): string {
  return `¥${yen.toLocaleString('ja-JP')}`;
}
