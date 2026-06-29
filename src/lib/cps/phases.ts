import type { ProcessPhase } from '@/types/cps';

// 上流 → 下流 の並び
export const PHASE_ORDER: ProcessPhase[] = [
  '企画',
  '製造',
  'コンテンツ',
  '販売',
  '分析',
  '改善',
];

export const PHASE_DESC: Record<ProcessPhase, string> = {
  企画: '何を作るか決める',
  製造: '木材を加工して形にする',
  コンテンツ: '撮影・投稿・動画を作る',
  販売: '受注から発送まで',
  分析: '結果を測る',
  改善: 'ボトルネックを直す',
};
