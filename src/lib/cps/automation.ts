// 自動化区分（手作業/治具化/自動化/外注）の共有メタ。
// ボードのチップ・ダイアログ・工程詳細で同じ配色/並びを使う。
import type { AutomationLabel } from '@/types/cps';
import { Hand, Wrench, Cpu, Truck, type LucideIcon } from 'lucide-react';

export interface AutomationMeta {
  label: AutomationLabel;
  // カード上の小さなチップ用（route バッジと同系統の淡色）
  chip: string;
  // アクティブ選択時の塗り
  solid: string;
  icon: LucideIcon;
  desc: string;
}

// 改善の進み方（手作業→治具化→自動化）に沿った並び。外注は別枠として最後。
export const AUTOMATION_ORDER: AutomationLabel[] = [
  '手作業',
  '治具化',
  '自動化',
  '外注',
];

export const AUTOMATION_META: Record<AutomationLabel, AutomationMeta> = {
  手作業: {
    label: '手作業',
    chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    solid: 'bg-slate-600 text-white',
    icon: Hand,
    desc: 'すべて手で作業している状態',
  },
  治具化: {
    label: '治具化',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    solid: 'bg-amber-500 text-white',
    icon: Wrench,
    desc: '治具・型で精度と速度を安定化',
  },
  自動化: {
    label: '自動化',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    solid: 'bg-emerald-600 text-white',
    icon: Cpu,
    desc: '機械・ソフトで自動処理',
  },
  外注: {
    label: '外注',
    chip: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    solid: 'bg-sky-600 text-white',
    icon: Truck,
    desc: '社外に委託している状態',
  },
};

export function isAutomationLabel(v: unknown): v is AutomationLabel {
  return typeof v === 'string' && v in AUTOMATION_META;
}
