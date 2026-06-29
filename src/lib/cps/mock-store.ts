// Supabase 未設定時に動作する、メモリ内モックストア。
// dev / 初回デモを「ゼロ設定」で動かすためのフォールバック。
// 注意: サーバープロセス内でのみ永続（再起動で初期化）。本番は Supabase を設定すること。

import type {
  CpsImprovement,
  CpsKpiDaily,
  CpsProcess,
  CpsProduct,
  CpsTask,
  CpsWorkLog,
} from '@/types/cps';
import {
  buildSeedProcesses,
  buildSeedProducts,
} from '@/lib/cps/seed-data';

export interface MockDb {
  processes: CpsProcess[];
  products: CpsProduct[];
  work_logs: CpsWorkLog[];
  improvements: CpsImprovement[];
  tasks: CpsTask[];
  kpi_daily: CpsKpiDaily[];
}

let counter = 1000;
export function mockId(prefix = 'm'): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}-${(counter * 7).toString(36)}`;
}

function daysAgoISO(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function dateOnly(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function buildSeedDb(): MockDb {
  const processes = buildSeedProcesses();
  const products = buildSeedProducts();
  const ts = new Date().toISOString();

  const findP = (name: string) => processes.find((p) => p.name === name)!;

  // 作業実績: 研磨は標準30分に対し実績45分前後（caution〜stopped 相当）
  const work_logs: CpsWorkLog[] = [
    mkLog(findP('研磨').id, 'prod-walnut-bangle-m', 1, 46),
    mkLog(findP('研磨').id, 'prod-maple-ring', 3, 44),
    mkLog(findP('研磨').id, 'prod-oak-earcuff', 5, 48),
    mkLog(findP('切断').id, 'prod-walnut-bangle-m', 1, 18),
    mkLog(findP('切断').id, 'prod-maple-ring', 2, 22),
    mkLog(findP('塗装').id, 'prod-walnut-bangle-m', 1, 19),
    mkLog(findP('写真撮影').id, 'prod-maple-ring', 2, 70),
    mkLog(findP('写真撮影').id, 'prod-walnut-bangle-m', 4, 65),
    mkLog(findP('材料選定').id, 'prod-oak-earcuff', 1, 9),
    mkLog(findP('梱包').id, 'prod-walnut-bangle-m', 2, 11),
  ];

  const improvements: CpsImprovement[] = [
    {
      id: mockId('imp'),
      process_id: findP('研磨').id,
      title: '#120 を先に粗削りしてから番手を上げる',
      before_desc: 'いきなり #240 から始めて削り残しが多く時間超過',
      after_desc: '#120 → #240 → #400 の順で粗削りを先行',
      effect_minutes: 8,
      effect_desc: '削り直しが減り 1 個あたり約 8 分短縮',
      status: 'done',
      implemented_at: dateOnly(28),
      ai_suggestion: null,
      created_at: daysAgoISO(28),
      updated_at: daysAgoISO(28),
    },
    {
      id: mockId('imp'),
      process_id: findP('研磨').id,
      title: '研磨治具の導入',
      before_desc: '手持ちで角度が安定せずムラが出る',
      after_desc: '専用治具で固定し均一に研磨',
      effect_minutes: 5,
      effect_desc: '安定して約 5 分短縮、品質も向上',
      status: 'done',
      implemented_at: dateOnly(70),
      ai_suggestion: null,
      created_at: daysAgoISO(70),
      updated_at: daysAgoISO(70),
    },
    {
      id: mockId('imp'),
      process_id: findP('写真撮影').id,
      title: '撮影セットの常設化',
      before_desc: '毎回ライティングを組み直していた',
      after_desc: '撮影ブースを常設し即撮影できる状態に',
      effect_minutes: null,
      effect_desc: '効果測定中',
      status: 'in_progress',
      implemented_at: null,
      ai_suggestion: null,
      created_at: daysAgoISO(5),
      updated_at: daysAgoISO(2),
    },
  ];

  const tasks: CpsTask[] = [
    mkTask('研磨工程の実績が標準比1.5倍。改善案を検討', findP('研磨').id, 'prod-oak-earcuff', 1),
    mkTask('メープルリングの商品写真を撮影', findP('写真撮影').id, 'prod-maple-ring', 1),
    mkTask('ウォルナットバングルの再入荷分を梱包・発送', findP('梱包').id, 'prod-walnut-bangle-m', 2),
    mkTask('今週のInstagram投稿を生成・予約', findP('Instagram投稿生成').id, null, 2),
    mkTask('オークイヤーカフの原価を見直す', null, 'prod-oak-earcuff', 3),
  ];

  const kpi_daily: CpsKpiDaily[] = buildKpiHistory();

  // products の updated_at を整える
  void ts;

  return { processes, products, work_logs, improvements, tasks, kpi_daily };

  function mkLog(
    process_id: string,
    product_id: string | null,
    days: number,
    duration: number
  ): CpsWorkLog {
    const started = new Date(daysAgoISO(days, 9));
    const ended = new Date(started.getTime() + duration * 60_000);
    return {
      id: mockId('log'),
      process_id,
      product_id,
      started_at: started.toISOString(),
      ended_at: ended.toISOString(),
      duration_minutes: duration,
      memo: null,
      created_at: started.toISOString(),
    };
  }

  function mkTask(
    title: string,
    process_id: string | null,
    product_id: string | null,
    priority: 1 | 2 | 3
  ): CpsTask {
    return {
      id: mockId('task'),
      title,
      process_id,
      product_id,
      due_date: dateOnly(0),
      is_done: false,
      priority,
      created_at: ts,
      updated_at: ts,
    };
  }
}

function buildKpiHistory(): CpsKpiDaily[] {
  const rows: CpsKpiDaily[] = [];
  for (let i = 29; i >= 0; i--) {
    const seed = (i * 13 + 7) % 17;
    rows.push({
      id: mockId('kpi'),
      date: dateOnly(i),
      total_work_minutes: 120 + seed * 11,
      products_completed: i % 4 === 0 ? 1 : 0,
      posts_published: i % 3 === 0 ? 1 : 0,
      revenue: i % 4 === 0 ? 6800 + seed * 100 : i % 7 === 0 ? 3200 : 0,
      improvement_count: i % 9 === 0 ? 1 : 0,
      ai_usage_count: i % 5 === 0 ? 2 : 0,
      notes: null,
      created_at: daysAgoISO(i),
    });
  }
  return rows;
}

// globalThis でホットリロード間も同一インスタンスを保持
const globalForMock = globalThis as unknown as { __cpsMockDb?: MockDb };

export function getMockDb(): MockDb {
  if (!globalForMock.__cpsMockDb) {
    globalForMock.__cpsMockDb = buildSeedDb();
  }
  return globalForMock.__cpsMockDb;
}
