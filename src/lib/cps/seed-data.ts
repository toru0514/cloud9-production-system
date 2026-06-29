// CPS 初期データ（工程マスタ + デモ用サンプル）
// Supabase 未設定時の内蔵モックデータとしても利用される。

import type { CpsProcess, CpsProduct } from '@/types/cps';

const now = () => new Date().toISOString();

interface ProcessSeed {
  id: string;
  name: string;
  phase: CpsProcess['phase'];
  sort_order: number;
  standard_minutes: number | null;
  tools?: string[];
  description?: string;
}

// 仕様書 §12 の工程マスタ
export const processSeeds: ProcessSeed[] = [
  // 製造工程
  { id: 'p-mat', name: '材料選定', phase: '製造', sort_order: 1, standard_minutes: 10, tools: [] },
  { id: 'p-cut', name: '切断', phase: '製造', sort_order: 2, standard_minutes: 20, tools: ['バンドソー'] },
  { id: 'p-cnc', name: 'CNC', phase: '製造', sort_order: 3, standard_minutes: 45, tools: ['CNCルーター'] },
  { id: 'p-3dp', name: '3Dプリント', phase: '製造', sort_order: 4, standard_minutes: 120, tools: ['3Dプリンター'] },
  { id: 'p-laser', name: 'レーザー加工', phase: '製造', sort_order: 5, standard_minutes: 30, tools: ['レーザーカッター'] },
  { id: 'p-sand', name: '研磨', phase: '製造', sort_order: 6, standard_minutes: 30, tools: ['サンダー #120', '#240', '#400'] },
  { id: 'p-paint', name: '塗装', phase: '製造', sort_order: 7, standard_minutes: 20, tools: ['オイル', '刷毛'] },
  { id: 'p-qc', name: '品質確認', phase: '製造', sort_order: 8, standard_minutes: 10, tools: [] },
  // コンテンツ工程
  { id: 'p-info', name: '商品情報入力', phase: 'コンテンツ', sort_order: 10, standard_minutes: 15, tools: [] },
  { id: 'p-photo', name: '写真撮影', phase: 'コンテンツ', sort_order: 11, standard_minutes: 45, tools: ['カメラ', '照明'] },
  { id: 'p-select', name: '写真選別', phase: 'コンテンツ', sort_order: 12, standard_minutes: 10, tools: [] },
  { id: 'p-ig', name: 'Instagram投稿生成', phase: 'コンテンツ', sort_order: 13, standard_minutes: 5, tools: [] },
  { id: 'p-yt', name: 'YouTube台本生成', phase: 'コンテンツ', sort_order: 14, standard_minutes: 10, tools: [] },
  { id: 'p-video', name: '動画生成', phase: 'コンテンツ', sort_order: 15, standard_minutes: 30, tools: [] },
  { id: 'p-schedule', name: '投稿予約', phase: 'コンテンツ', sort_order: 16, standard_minutes: 5, tools: [] },
  // 販売工程
  { id: 'p-order', name: '受注確認', phase: '販売', sort_order: 20, standard_minutes: 5, tools: [] },
  { id: 'p-pack', name: '梱包', phase: '販売', sort_order: 21, standard_minutes: 10, tools: ['緩衝材', '箱'] },
  { id: 'p-ship', name: '発送', phase: '販売', sort_order: 22, standard_minutes: 10, tools: [] },
  // 改善工程
  { id: 'p-bottleneck', name: 'ボトルネック分析', phase: '改善', sort_order: 30, standard_minutes: null, tools: [] },
  { id: 'p-plan', name: '改善案作成', phase: '改善', sort_order: 31, standard_minutes: null, tools: [] },
  { id: 'p-measure', name: '効果測定', phase: '改善', sort_order: 32, standard_minutes: null, tools: [] },
];

export function buildSeedProcesses(): CpsProcess[] {
  const ts = now();
  return processSeeds.map((s) => ({
    id: s.id,
    name: s.name,
    phase: s.phase,
    sort_order: s.sort_order,
    standard_minutes: s.standard_minutes,
    status: 'normal',
    description: s.description ?? null,
    tools: s.tools ?? [],
    created_at: ts,
    updated_at: ts,
  }));
}

export function buildSeedProducts(): CpsProduct[] {
  const ts = now();
  return [
    {
      id: 'prod-walnut-bangle-m',
      name: 'ウォルナットバングル M',
      category: 'バングル',
      wood_type: 'ウォルナット',
      price: 6800,
      cost: 1800,
      current_status: '販売',
      is_active: true,
      description: '木目の美しいウォルナット無垢から削り出したバングル。',
      notes: '人気商品。リピート多し。',
      created_at: ts,
      updated_at: ts,
    },
    {
      id: 'prod-maple-ring',
      name: 'メープルリング',
      category: 'リング',
      wood_type: 'メープル',
      price: 3200,
      cost: 700,
      current_status: '撮影',
      is_active: true,
      description: '明るい色味のメープルを使った軽量リング。',
      notes: null,
      created_at: ts,
      updated_at: ts,
    },
    {
      id: 'prod-oak-earcuff',
      name: 'オークイヤーカフ',
      category: 'イヤーカフ',
      wood_type: 'オーク',
      price: 2800,
      cost: 600,
      current_status: '加工',
      is_active: true,
      description: '存在感のあるオークのイヤーカフ。試作中。',
      notes: '新作。研磨工程の最適化を検討中。',
      created_at: ts,
      updated_at: ts,
    },
  ];
}
