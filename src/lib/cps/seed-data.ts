// CPS 初期データ（工程マスタ + デモ用サンプル）
// Supabase 未設定時の内蔵モックデータとしても利用される。

import type { AutomationLabel, CpsProcess, CpsProduct } from '@/types/cps';

const now = () => new Date().toISOString();

interface ProcessSeed {
  id: string;
  name: string;
  phase: CpsProcess['phase'];
  sort_order: number;
  standard_minutes: number | null;
  tools?: string[];
  description?: string;
  route?: string | null;
  product_line?: string | null;
  automation?: AutomationLabel;
}

// ---- 製造工程は「商品ライン（カテゴリ）」ごとに分ける ----
// route = カテゴリ名。フローマップ上でカテゴリごとの並列レーン（分岐→合流）として描画される。
// sort_order は共通スケール（1..6）で揃え、レーンをまたいで同じ工程が同じ段に並ぶようにする。
// カテゴリごとに使う機械・工程が異なる（例: クリスタルは 3Dプリント、切断/塗装なし）。
interface ManufacturingStep {
  key: string;
  name: string;
  sort_order: number;
  standard_minutes: number | null;
  tools?: string[];
  automation?: AutomationLabel;
}

interface CategoryManufacturing {
  category: string;
  catKey: string;
  steps: ManufacturingStep[];
}

// 共通スケール: 材料選定=1 / 切断=2 / 成形(CNC・3Dプリント等)=3 / 研磨=4 / 塗装=5 / 品質確認=6
export const manufacturingByCategory: CategoryManufacturing[] = [
  {
    category: 'ウッドリング',
    catKey: 'ring',
    steps: [
      { key: 'mat', name: '材料選定', sort_order: 1, standard_minutes: 10, automation: '手作業' },
      { key: 'cut', name: '切断', sort_order: 2, standard_minutes: 20, tools: ['バンドソー'], automation: '治具化' },
      { key: 'cnc', name: 'CNC', sort_order: 3, standard_minutes: 45, tools: ['CNCルーター'], automation: '自動化' },
      { key: 'sand', name: '研磨', sort_order: 4, standard_minutes: 30, tools: ['サンダー #120', '#240', '#400'], automation: '治具化' },
      { key: 'paint', name: '塗装', sort_order: 5, standard_minutes: 20, tools: ['オイル', '刷毛'], automation: '手作業' },
      { key: 'qc', name: '品質確認', sort_order: 6, standard_minutes: 10, automation: '効率化検討済' },
    ],
  },
  {
    category: 'ウッドバングル',
    catKey: 'bangle',
    steps: [
      { key: 'mat', name: '材料選定', sort_order: 1, standard_minutes: 10, automation: '手作業' },
      { key: 'cut', name: '切断', sort_order: 2, standard_minutes: 25, tools: ['バンドソー'], automation: '治具化' },
      { key: 'cnc', name: 'CNC', sort_order: 3, standard_minutes: 50, tools: ['CNCルーター'], automation: '自動化' },
      { key: 'sand', name: '研磨', sort_order: 4, standard_minutes: 30, tools: ['サンダー #120', '#240', '#400'], automation: '治具化' },
      { key: 'paint', name: '塗装', sort_order: 5, standard_minutes: 20, tools: ['オイル', '刷毛'], automation: '手作業' },
      { key: 'qc', name: '品質確認', sort_order: 6, standard_minutes: 10, automation: '効率化検討済' },
    ],
  },
  {
    category: 'クリスタルウッドリング',
    catKey: 'crystal',
    steps: [
      { key: 'mat', name: '材料選定', sort_order: 1, standard_minutes: 15, automation: '手作業' },
      { key: '3dp', name: '3Dプリント', sort_order: 3, standard_minutes: 120, tools: ['3Dプリンター'], automation: '自動化' },
      { key: 'resin', name: 'レジン注入', sort_order: 4, standard_minutes: 40, tools: ['レジン', '真空脱泡'], automation: '手作業' },
      { key: 'sand', name: '研磨', sort_order: 5, standard_minutes: 30, tools: ['サンダー #120', '#240', '#400'], automation: '治具化' },
      { key: 'qc', name: '品質確認', sort_order: 6, standard_minutes: 10, automation: '効率化検討済' },
    ],
  },
];

// 開発フェーズ: 試作の分岐（route = 分岐A/B/C）を持つデモ。
// 要件整理・設計確定は分岐共通（route = null）、試作は3ルートに枝分かれ。
// 標準作業組合せ票を「分岐ごと」に組めることを示すためのサンプル。
const developmentProcessSeeds: ProcessSeed[] = [
  { id: 'p-dev-req', name: '要件整理', phase: '開発', sort_order: 1, standard_minutes: 30 },
  { id: 'p-dev-a1', name: '試作A：木型製作', phase: '開発', sort_order: 2, standard_minutes: 60, route: '分岐A', tools: ['木型'] },
  { id: 'p-dev-a2', name: '試作A：嵌合検証', phase: '開発', sort_order: 3, standard_minutes: 40, route: '分岐A' },
  { id: 'p-dev-b1', name: '試作B：3Dプリント', phase: '開発', sort_order: 2, standard_minutes: 90, route: '分岐B', tools: ['3Dプリンター'] },
  { id: 'p-dev-b2', name: '試作B：強度検証', phase: '開発', sort_order: 3, standard_minutes: 40, route: '分岐B' },
  { id: 'p-dev-c1', name: '試作C：レジン試作', phase: '開発', sort_order: 2, standard_minutes: 80, route: '分岐C', tools: ['レジン'] },
  { id: 'p-dev-c2', name: '試作C：透明度検証', phase: '開発', sort_order: 3, standard_minutes: 35, route: '分岐C' },
  { id: 'p-dev-fix', name: '設計確定', phase: '開発', sort_order: 4, standard_minutes: 30 },
];

// 製造以外（コンテンツ・販売）は全カテゴリ共通の 1 本（route = null）。
const sharedProcessSeeds: ProcessSeed[] = [
  // コンテンツ工程
  { id: 'p-info', name: '商品情報入力', phase: 'コンテンツ', sort_order: 10, standard_minutes: 15, tools: [] },
  { id: 'p-photo', name: '写真撮影', phase: 'コンテンツ', sort_order: 11, standard_minutes: 45, tools: ['カメラ', '照明'] },
  { id: 'p-select', name: '写真選別', phase: 'コンテンツ', sort_order: 12, standard_minutes: 10, tools: [] },
  { id: 'p-ig', name: 'Instagram投稿生成', phase: 'コンテンツ', sort_order: 13, standard_minutes: 5, tools: [] },
  { id: 'p-yt', name: 'YouTube台本生成', phase: 'コンテンツ', sort_order: 14, standard_minutes: 10, tools: [] },
  { id: 'p-video', name: '動画生成', phase: 'コンテンツ', sort_order: 15, standard_minutes: 30, tools: [], automation: '自動化' },
  { id: 'p-schedule', name: '投稿予約', phase: 'コンテンツ', sort_order: 16, standard_minutes: 5, tools: [] },
  // 販売工程
  { id: 'p-order', name: '受注確認', phase: '販売', sort_order: 20, standard_minutes: 5, tools: [] },
  { id: 'p-pack', name: '梱包', phase: '販売', sort_order: 21, standard_minutes: 10, tools: ['緩衝材', '箱'], automation: '治具化' },
  { id: 'p-ship', name: '発送', phase: '販売', sort_order: 22, standard_minutes: 10, tools: [], automation: '外注' },
];

// カテゴリ別 製造工程を ProcessSeed に展開（id は `p-<catKey>-<stepKey>` で一意化、
// product_line = 商品ライン名。route(枝) は使わない）。
const manufacturingProcessSeeds: ProcessSeed[] = manufacturingByCategory.flatMap((cat) =>
  cat.steps.map((s) => ({
    id: `p-${cat.catKey}-${s.key}`,
    name: s.name,
    phase: '製造' as CpsProcess['phase'],
    sort_order: s.sort_order,
    standard_minutes: s.standard_minutes,
    tools: s.tools,
    product_line: cat.category,
    automation: s.automation,
  }))
);

// 仕様書 §12 の工程マスタ（製造はカテゴリ別、その他は共通）
export const processSeeds: ProcessSeed[] = [
  ...developmentProcessSeeds,
  ...manufacturingProcessSeeds,
  ...sharedProcessSeeds,
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
    route: s.route ?? null,
    product_line: s.product_line ?? null,
    automation: s.automation ?? null,
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
      category: 'ウッドバングル',
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
      category: 'ウッドリング',
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
      // 同じ「ウッドリング」ライン。木材（wood_type）が違うだけなので製造レーンは共通。
      id: 'prod-purpleheart-ring',
      name: 'パープルハートリング',
      category: 'ウッドリング',
      wood_type: 'パープルハート',
      price: 3600,
      cost: 900,
      current_status: '加工',
      is_active: true,
      description: '鮮やかな紫が映えるパープルハートのリング。',
      notes: '木材違いの同一ライン。工程はメープルリングと共通。',
      created_at: ts,
      updated_at: ts,
    },
    {
      id: 'prod-crystal-ring',
      name: 'クリスタルウッドリング',
      category: 'クリスタルウッドリング',
      wood_type: 'カリン × レジン',
      price: 5200,
      cost: 1400,
      current_status: '加工',
      is_active: true,
      description: '木とレジンを組み合わせた透明感のあるリング。試作中。',
      notes: '新作。研磨工程の最適化を検討中。',
      created_at: ts,
      updated_at: ts,
    },
  ];
}
