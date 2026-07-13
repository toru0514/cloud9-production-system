// 自動化区分（手作業/治具化/自動化/効率化検討済/外注 + ユーザー追加）の共有メタ。
// ボードのチップ・ダイアログ・工程詳細で同じ配色/並びを使う。
import type { AutomationLabel, CpsProcess } from '@/types/cps';
import {
  Hand,
  Wrench,
  Cpu,
  AppWindow,
  Sparkles,
  Lightbulb,
  Truck,
  Tag,
  type LucideIcon,
} from 'lucide-react';

export interface AutomationMeta {
  // カード上の小さなチップ用（route バッジと同系統の淡色）
  chip: string;
  // アクティブ選択時の塗り
  solid: string;
  icon: LucideIcon;
  desc: string;
}

// 組込み区分。改善の進み方（手作業→治具化→自動化）に沿った並び。
// 効率化検討済＝これ以上の自動化はしないと判断した状態。外注は別枠として最後。
export const BUILTIN_AUTOMATION_LABELS: AutomationLabel[] = [
  '手作業',
  '治具化',
  '自動化',
  'アプリ化',
  'AI',
  '効率化検討済',
  '外注',
];

// 「率」を出す対象の区分（アプリ化率・AI率・外注率）。
export const APP_LABEL = 'アプリ化';
export const AI_LABEL = 'AI';
export const OUTSOURCE_LABEL = '外注';

const BUILTIN_META: Record<string, AutomationMeta> = {
  手作業: {
    chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    solid: 'bg-slate-600 text-white',
    icon: Hand,
    desc: 'すべて手で作業している状態',
  },
  治具化: {
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    solid: 'bg-amber-500 text-white',
    icon: Wrench,
    desc: '治具・型で精度と速度を安定化',
  },
  自動化: {
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    solid: 'bg-emerald-600 text-white',
    icon: Cpu,
    desc: '機械・ソフトで自動処理',
  },
  アプリ化: {
    chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    solid: 'bg-indigo-600 text-white',
    icon: AppWindow,
    desc: '専用アプリ・ツール化して省力化',
  },
  AI: {
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    solid: 'bg-violet-600 text-white',
    icon: Sparkles,
    desc: 'AIに任せている状態',
  },
  効率化検討済: {
    chip: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    solid: 'bg-teal-600 text-white',
    icon: Lightbulb,
    desc: '効率化を検討・評価済み（現状維持と判断）',
  },
  外注: {
    chip: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    solid: 'bg-sky-600 text-white',
    icon: Truck,
    desc: '社外に委託している状態',
  },
};

// ユーザー追加ラベル用の配色パレット（ラベル名から決定的に割当）。
const PALETTE: { chip: string; solid: string }[] = [
  { chip: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300', solid: 'bg-rose-600 text-white' },
  { chip: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300', solid: 'bg-violet-600 text-white' },
  { chip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300', solid: 'bg-cyan-600 text-white' },
  { chip: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300', solid: 'bg-lime-600 text-white' },
  { chip: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', solid: 'bg-orange-600 text-white' },
  { chip: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300', solid: 'bg-fuchsia-600 text-white' },
  { chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300', solid: 'bg-indigo-600 text-white' },
];

function hashLabel(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// 組込みならその定義、そうでなければ名前から決定的に配色したカスタム区分メタを返す。
export function automationMeta(label: string): AutomationMeta {
  const builtin = BUILTIN_META[label];
  if (builtin) return builtin;
  const p = PALETTE[hashLabel(label) % PALETTE.length];
  return { chip: p.chip, solid: p.solid, icon: Tag, desc: 'カスタム区分' };
}

export function isBuiltinAutomationLabel(label: string): boolean {
  return label in BUILTIN_META;
}

export const MAX_AUTOMATION_LABEL_LEN = 20;

// API 受入判定: 空でない・長すぎない文字列（組込み/カスタムどちらも許可）。
export function isValidAutomationLabel(v: unknown): v is AutomationLabel {
  if (typeof v !== 'string') return false;
  const t = v.trim();
  return t.length > 0 && t.length <= MAX_AUTOMATION_LABEL_LEN;
}

/* ============================================================
 * アプリ化率 / AI率 / 外注率 の算出
 * ============================================================ */

export interface LabelRate {
  label: string;
  count: number; // この区分の工程数
  rate: number; // 工程数ベースの割合 0..1（分母 = 全工程数）
  minutes: number; // この区分の標準時間合計（分）
  timeRate: number; // 工数ベースの割合 0..1（分母 = 標準時間の総和）
}

export interface AutomationRates {
  totalProcesses: number;
  totalMinutes: number; // 標準時間が設定されている工程の合計（分）
  app: LabelRate;
  ai: LabelRate;
  outsource: LabelRate;
}

export function labelRate(processes: CpsProcess[], label: string): LabelRate {
  const total = processes.length || 1;
  const totalMinutes =
    processes.reduce((a, p) => a + (p.standard_minutes ?? 0), 0) || 1;
  const matched = processes.filter((p) => p.automation === label);
  const minutes = matched.reduce((a, p) => a + (p.standard_minutes ?? 0), 0);
  return {
    label,
    count: matched.length,
    rate: matched.length / total,
    minutes,
    timeRate: minutes / totalMinutes,
  };
}

// アプリ化率・AI率・外注率をまとめて算出。
export function computeAutomationRates(
  processes: CpsProcess[]
): AutomationRates {
  return {
    totalProcesses: processes.length,
    totalMinutes: processes.reduce((a, p) => a + (p.standard_minutes ?? 0), 0),
    app: labelRate(processes, APP_LABEL),
    ai: labelRate(processes, AI_LABEL),
    outsource: labelRate(processes, OUTSOURCE_LABEL),
  };
}

export const UNSET_LABEL = '未設定';

export interface DistItem {
  label: string;
  isUnset: boolean;
  count: number;
  minutes: number;
  rate: number; // 工程数ベース 0..1（分母=全工程）
  timeRate: number; // 工数ベース 0..1（分母=標準時間の総和）
}

// 全区分の内訳（合計100%）。未設定も1項目として含める。
// 並び: 組込み(定義順) → カスタム(名前順) → 未設定。
export function automationDistribution(processes: CpsProcess[]): {
  total: number;
  totalMinutes: number;
  items: DistItem[];
} {
  const total = processes.length;
  const totalMinutes = processes.reduce(
    (a, p) => a + (p.standard_minutes ?? 0),
    0
  );
  const counts = new Map<string, { c: number; m: number }>();
  let unsetC = 0;
  let unsetM = 0;
  for (const p of processes) {
    const min = p.standard_minutes ?? 0;
    if (!p.automation) {
      unsetC += 1;
      unsetM += min;
      continue;
    }
    const e = counts.get(p.automation) ?? { c: 0, m: 0 };
    e.c += 1;
    e.m += min;
    counts.set(p.automation, e);
  }
  const ordered = [
    ...BUILTIN_AUTOMATION_LABELS.filter((l) => counts.has(l)),
    ...[...counts.keys()]
      .filter((l) => !BUILTIN_AUTOMATION_LABELS.includes(l))
      .sort((a, b) => a.localeCompare(b)),
  ];
  const items: DistItem[] = ordered.map((label) => {
    const e = counts.get(label)!;
    return {
      label,
      isUnset: false,
      count: e.c,
      minutes: e.m,
      rate: total ? e.c / total : 0,
      timeRate: totalMinutes ? e.m / totalMinutes : 0,
    };
  });
  if (unsetC > 0) {
    items.push({
      label: UNSET_LABEL,
      isUnset: true,
      count: unsetC,
      minutes: unsetM,
      rate: total ? unsetC / total : 0,
      timeRate: totalMinutes ? unsetM / totalMinutes : 0,
    });
  }
  return { total, totalMinutes, items };
}
