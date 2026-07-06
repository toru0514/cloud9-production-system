// Supabase 未設定時に動作する、メモリ内モックストア。
// dev / 初回デモを「ゼロ設定」で動かすためのフォールバック。
// 注意: サーバープロセス内でのみ永続（再起動で初期化）。本番は Supabase を設定すること。

import type {
  AutomationLabel,
  CpsAutomationLog,
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
  automation_logs: CpsAutomationLog[];
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

  // 共通工程（製造以外, product_line 無し）は名前で一意。
  const findShared = (name: string) =>
    processes.find((p) => p.name === name && !p.product_line)!;
  // 製造工程は同じ工程名が商品ラインごとに複数あるため、商品のカテゴリ（=ライン）で絞り込む。
  const lineOf = (productId: string) =>
    products.find((p) => p.id === productId)?.category ?? null;
  const findMfg = (productId: string, name: string) => {
    const line = lineOf(productId);
    return (
      processes.find((p) => p.product_line === line && p.name === name) ??
      findShared(name)
    );
  };

  // 作業実績: 研磨は標準30分に対し実績45分前後（caution〜stopped 相当）
  const work_logs: CpsWorkLog[] = [
    mkLog(findMfg('prod-walnut-bangle-m', '研磨').id, 'prod-walnut-bangle-m', 1, 46),
    mkLog(findMfg('prod-maple-ring', '研磨').id, 'prod-maple-ring', 3, 44),
    mkLog(findMfg('prod-crystal-ring', '研磨').id, 'prod-crystal-ring', 5, 48),
    mkLog(findMfg('prod-walnut-bangle-m', '切断').id, 'prod-walnut-bangle-m', 1, 18),
    mkLog(findMfg('prod-maple-ring', '切断').id, 'prod-maple-ring', 2, 22),
    mkLog(findMfg('prod-walnut-bangle-m', '塗装').id, 'prod-walnut-bangle-m', 1, 19),
    mkLog(findShared('写真撮影').id, 'prod-maple-ring', 2, 70),
    mkLog(findShared('写真撮影').id, 'prod-walnut-bangle-m', 4, 65),
    mkLog(findMfg('prod-crystal-ring', '材料選定').id, 'prod-crystal-ring', 1, 9),
    mkLog(findShared('梱包').id, 'prod-walnut-bangle-m', 2, 11),
  ];

  const improvements: CpsImprovement[] = [
    {
      id: mockId('imp'),
      process_id: findMfg('prod-crystal-ring', '研磨').id,
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
      process_id: findMfg('prod-crystal-ring', '研磨').id,
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
      process_id: findShared('写真撮影').id,
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
    mkTask('研磨工程の実績が標準比1.5倍。改善案を検討', findMfg('prod-crystal-ring', '研磨').id, 'prod-crystal-ring', 1),
    mkTask('メープルリングの商品写真を撮影', findShared('写真撮影').id, 'prod-maple-ring', 1),
    mkTask('ウォルナットバングルの再入荷分を梱包・発送', findShared('梱包').id, 'prod-walnut-bangle-m', 2),
    mkTask('今週のInstagram投稿を生成・予約', findShared('Instagram投稿生成').id, null, 2),
    mkTask('クリスタルウッドリングの原価を見直す', null, 'prod-crystal-ring', 3),
  ];

  const kpi_daily: CpsKpiDaily[] = buildKpiHistory();

  // 自動化区分の履歴（デモ）: 手作業→治具化→自動化 の遷移が見えるように。
  // 製造工程は商品ラインごとに複数あるため、ウッドリング（メープルリング）ラインの
  // 工程に履歴を紐づける。各工程の最新ラベルは seed の automation と一致する。
  const autoSeeds: {
    process: CpsProcess;
    history: { label: AutomationLabel; note?: string; days: number }[];
  }[] = [
    {
      process: findMfg('prod-maple-ring', '材料選定'),
      history: [{ label: '手作業', days: 120 }],
    },
    {
      process: findMfg('prod-maple-ring', '切断'),
      history: [
        { label: '手作業', days: 120 },
        { label: '治具化', note: '長さ決めの治具を自作し寸法を安定化', days: 45 },
      ],
    },
    {
      process: findMfg('prod-maple-ring', 'CNC'),
      history: [
        { label: '手作業', days: 160 },
        { label: '治具化', note: 'ワーク固定用の治具を導入', days: 95 },
        { label: '自動化', note: 'CNCルーター導入で無人加工に', days: 30 },
      ],
    },
    {
      process: findMfg('prod-maple-ring', '研磨'),
      history: [
        { label: '手作業', days: 120 },
        { label: '治具化', note: '研磨治具を導入し角度を固定（ムラ減）', days: 70 },
      ],
    },
    {
      process: findShared('動画生成'),
      history: [
        { label: '手作業', days: 60 },
        { label: '自動化', note: 'AI生成に切替えて量産', days: 15 },
      ],
    },
    {
      process: findShared('発送'),
      history: [
        { label: '手作業', days: 100 },
        { label: '外注', note: '集荷・発送代行に委託', days: 20 },
      ],
    },
  ];

  const automation_logs: CpsAutomationLog[] = autoSeeds.flatMap((s) =>
    s.history.map((h) => ({
      id: mockId('auto'),
      process_id: s.process.id,
      label: h.label,
      note: h.note ?? null,
      created_at: daysAgoISO(h.days, 11),
    }))
  );

  // products の updated_at を整える
  void ts;

  return {
    processes,
    products,
    work_logs,
    improvements,
    tasks,
    kpi_daily,
    automation_logs,
  };

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
