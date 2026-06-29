import type { ProcessPhase } from '@/types/cps';

// 上流 → 下流 の並び（実態のバリューストリームに限定）
export const PHASE_ORDER: ProcessPhase[] = [
  '企画',
  '製造',
  'コンテンツ',
  '販売',
];

export const PHASE_DESC: Record<ProcessPhase, string> = {
  企画: '何を作るか決める',
  製造: '材料を仕入れ、加工して形にする',
  コンテンツ: '撮影・投稿・動画で発信する',
  販売: '受注から発送、お客様に届くまで',
};
