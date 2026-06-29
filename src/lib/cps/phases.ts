import type { ProcessPhase } from '@/types/cps';

// 上流 → 下流 の並び（実態のバリューストリームに限定）
export const PHASE_ORDER: ProcessPhase[] = [
  '開発',
  '製造',
  '梱包材準備',
  '発送',
  '販売',
];

export const PHASE_DESC: Record<ProcessPhase, string> = {
  企画: '何を作るか決める',
  開発: '試作・設計・量産前の検証',
  製造: '材料を仕入れ、加工して形にする',
  梱包材準備: '台紙・箱・梱包材を用意する',
  発送: '受注から梱包・発送まで',
  コンテンツ: '撮影・投稿・動画で発信する',
  販売: '出品・写真・各モール登録・広告',
};
