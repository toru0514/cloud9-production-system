// CPS 専用クエリ関数（データアクセス層）
// Supabase 設定時は実DB、未設定時はメモリ内モックを使う。
// どちらの場合も同じ戻り値型を返すため、上位（API/UI）は実装を意識しない。

import { isSupabaseConfigured } from '@/lib/cps/config';
import { getSupabaseAdmin } from '@/lib/cps/supabase-client';
import { getMockDb, mockId } from '@/lib/cps/mock-store';
import { calcProcessStatus } from '@/lib/cps/utils/status';
import {
  startOfMonth,
  startOfWeek,
  sumKpi,
} from '@/lib/cps/utils/kpi';
import type {
  CpsBottleneckCandidate,
  CpsDashboard,
  CpsImprovement,
  CpsKpiDaily,
  CpsProcess,
  CpsProcessStatusItem,
  CpsProduct,
  CpsTask,
  CpsWorkLog,
  ProcessPhase,
} from '@/types/cps';

const RECENT_WINDOW_DAYS = 30;
const nowISO = () => new Date().toISOString();

/* ============================================================
 * 工程 (processes)
 * ============================================================ */

export async function listProcesses(): Promise<CpsProcess[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from('cps_processes')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CpsProcess[];
  }
  return [...getMockDb().processes].sort((a, b) => a.sort_order - b.sort_order);
}

export async function getProcess(id: string): Promise<CpsProcess | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from('cps_processes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as CpsProcess) ?? null;
  }
  return getMockDb().processes.find((p) => p.id === id) ?? null;
}

export async function updateProcess(
  id: string,
  patch: Partial<CpsProcess>
): Promise<CpsProcess> {
  const update = { ...patch, updated_at: nowISO() };
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from('cps_processes')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as CpsProcess;
  }
  const db = getMockDb();
  const idx = db.processes.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error('process not found');
  db.processes[idx] = { ...db.processes[idx], ...update };
  return db.processes[idx];
}

export type CreateProcessInput = Partial<CpsProcess> & {
  name: string;
  phase: ProcessPhase;
};

export async function createProcess(
  input: CreateProcessInput
): Promise<CpsProcess> {
  const ts = nowISO();
  let sort_order = input.sort_order;
  if (sort_order == null) {
    const all = await listProcesses();
    const samePhase = all.filter((p) => p.phase === input.phase);
    sort_order =
      (samePhase.length
        ? Math.max(...samePhase.map((p) => p.sort_order))
        : Math.max(0, ...all.map((p) => p.sort_order))) + 1;
  }
  const row: CpsProcess = {
    id: mockId('proc'),
    name: input.name,
    phase: input.phase,
    sort_order,
    standard_minutes: input.standard_minutes ?? null,
    status: input.status ?? 'normal',
    description: input.description ?? null,
    tools: input.tools ?? [],
    route: input.route ?? null,
    created_at: ts,
    updated_at: ts,
  };
  if (isSupabaseConfigured()) {
    const { id: _omit, ...insert } = row;
    void _omit;
    const { data, error } = await getSupabaseAdmin()
      .from('cps_processes')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    return data as CpsProcess;
  }
  getMockDb().processes.push(row);
  return row;
}

export async function deleteProcess(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await getSupabaseAdmin()
      .from('cps_processes')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return;
  }
  const db = getMockDb();
  const idx = db.processes.findIndex((p) => p.id === id);
  if (idx >= 0) db.processes.splice(idx, 1);
}

/* ============================================================
 * 作業実績 (work_logs)
 * ============================================================ */

export async function listWorkLogs(processId?: string): Promise<CpsWorkLog[]> {
  if (isSupabaseConfigured()) {
    let q = getSupabaseAdmin()
      .from('cps_work_logs')
      .select('*')
      .order('started_at', { ascending: false });
    if (processId) q = q.eq('process_id', processId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as CpsWorkLog[];
  }
  const logs = getMockDb().work_logs;
  const filtered = processId
    ? logs.filter((l) => l.process_id === processId)
    : logs;
  return [...filtered].sort(
    (a, b) => (b.started_at ?? '').localeCompare(a.started_at ?? '')
  );
}

export interface CreateWorkLogInput {
  process_id: string;
  product_id?: string | null;
  started_at: string;
  ended_at?: string | null;
  memo?: string | null;
}

function calcDuration(started?: string | null, ended?: string | null): number | null {
  if (!started || !ended) return null;
  const diff = new Date(ended).getTime() - new Date(started).getTime();
  if (Number.isNaN(diff) || diff < 0) return null;
  return Math.round(diff / 60_000);
}

export async function createWorkLog(
  input: CreateWorkLogInput
): Promise<CpsWorkLog> {
  const duration_minutes = calcDuration(input.started_at, input.ended_at);
  const row: CpsWorkLog = {
    id: mockId('log'),
    process_id: input.process_id,
    product_id: input.product_id ?? null,
    started_at: input.started_at,
    ended_at: input.ended_at ?? null,
    duration_minutes,
    memo: input.memo ?? null,
    created_at: nowISO(),
  };
  if (isSupabaseConfigured()) {
    const { id: _omit, ...insert } = row;
    void _omit;
    const { data, error } = await getSupabaseAdmin()
      .from('cps_work_logs')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    return data as CpsWorkLog;
  }
  getMockDb().work_logs.unshift(row);
  return row;
}

/* ============================================================
 * 商品 (products)
 * ============================================================ */

export async function listProducts(): Promise<CpsProduct[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from('cps_products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as CpsProduct[];
  }
  return [...getMockDb().products].sort((a, b) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? '')
  );
}

export async function getProduct(id: string): Promise<CpsProduct | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from('cps_products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as CpsProduct) ?? null;
  }
  return getMockDb().products.find((p) => p.id === id) ?? null;
}

export type CreateProductInput = Partial<CpsProduct> & { name: string };

export async function createProduct(
  input: CreateProductInput
): Promise<CpsProduct> {
  const ts = nowISO();
  const row: CpsProduct = {
    id: mockId('prod'),
    name: input.name,
    category: input.category ?? null,
    wood_type: input.wood_type ?? null,
    price: input.price ?? null,
    cost: input.cost ?? null,
    current_status: input.current_status ?? '企画',
    is_active: input.is_active ?? true,
    description: input.description ?? null,
    notes: input.notes ?? null,
    created_at: ts,
    updated_at: ts,
  };
  if (isSupabaseConfigured()) {
    const { id: _omit, ...insert } = row;
    void _omit;
    const { data, error } = await getSupabaseAdmin()
      .from('cps_products')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    return data as CpsProduct;
  }
  getMockDb().products.unshift(row);
  return row;
}

export async function updateProduct(
  id: string,
  patch: Partial<CpsProduct>
): Promise<CpsProduct> {
  const update = { ...patch, updated_at: nowISO() };
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from('cps_products')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as CpsProduct;
  }
  const db = getMockDb();
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error('product not found');
  db.products[idx] = { ...db.products[idx], ...update };
  return db.products[idx];
}

/* ============================================================
 * 改善 (improvements)
 * ============================================================ */

export async function listImprovements(
  processId?: string
): Promise<CpsImprovement[]> {
  if (isSupabaseConfigured()) {
    let q = getSupabaseAdmin()
      .from('cps_improvements')
      .select('*')
      .order('created_at', { ascending: false });
    if (processId) q = q.eq('process_id', processId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as CpsImprovement[];
  }
  const items = getMockDb().improvements;
  const filtered = processId
    ? items.filter((i) => i.process_id === processId)
    : items;
  return [...filtered].sort((a, b) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? '')
  );
}

export type CreateImprovementInput = Partial<CpsImprovement> & {
  process_id: string;
  title: string;
};

export async function createImprovement(
  input: CreateImprovementInput
): Promise<CpsImprovement> {
  const ts = nowISO();
  const row: CpsImprovement = {
    id: mockId('imp'),
    process_id: input.process_id,
    title: input.title,
    before_desc: input.before_desc ?? null,
    after_desc: input.after_desc ?? null,
    effect_minutes: input.effect_minutes ?? null,
    effect_desc: input.effect_desc ?? null,
    status: input.status ?? 'proposed',
    implemented_at: input.implemented_at ?? null,
    ai_suggestion: input.ai_suggestion ?? null,
    created_at: ts,
    updated_at: ts,
  };
  if (isSupabaseConfigured()) {
    const { id: _omit, ...insert } = row;
    void _omit;
    const { data, error } = await getSupabaseAdmin()
      .from('cps_improvements')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    return data as CpsImprovement;
  }
  getMockDb().improvements.unshift(row);
  return row;
}

export async function updateImprovement(
  id: string,
  patch: Partial<CpsImprovement>
): Promise<CpsImprovement> {
  const update = { ...patch, updated_at: nowISO() };
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from('cps_improvements')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as CpsImprovement;
  }
  const db = getMockDb();
  const idx = db.improvements.findIndex((i) => i.id === id);
  if (idx < 0) throw new Error('improvement not found');
  db.improvements[idx] = { ...db.improvements[idx], ...update };
  return db.improvements[idx];
}

/* ============================================================
 * タスク (tasks)
 * ============================================================ */

export async function listTasks(opts?: {
  today?: boolean;
}): Promise<CpsTask[]> {
  let tasks: CpsTask[];
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from('cps_tasks')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    tasks = (data ?? []) as CpsTask[];
  } else {
    tasks = [...getMockDb().tasks].sort(
      (a, b) =>
        a.priority - b.priority ||
        (a.created_at ?? '').localeCompare(b.created_at ?? '')
    );
  }
  if (opts?.today) {
    const today = new Date().toISOString().slice(0, 10);
    tasks = tasks.filter(
      (t) => !t.is_done && (!t.due_date || t.due_date <= today)
    );
  }
  return tasks;
}

export type CreateTaskInput = Partial<CpsTask> & { title: string };

export async function createTask(input: CreateTaskInput): Promise<CpsTask> {
  const ts = nowISO();
  const row: CpsTask = {
    id: mockId('task'),
    title: input.title,
    process_id: input.process_id ?? null,
    product_id: input.product_id ?? null,
    due_date: input.due_date ?? null,
    is_done: input.is_done ?? false,
    priority: (input.priority ?? 2) as 1 | 2 | 3,
    created_at: ts,
    updated_at: ts,
  };
  if (isSupabaseConfigured()) {
    const { id: _omit, ...insert } = row;
    void _omit;
    const { data, error } = await getSupabaseAdmin()
      .from('cps_tasks')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    return data as CpsTask;
  }
  getMockDb().tasks.unshift(row);
  return row;
}

export async function updateTask(
  id: string,
  patch: Partial<CpsTask>
): Promise<CpsTask> {
  const update = { ...patch, updated_at: nowISO() };
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from('cps_tasks')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as CpsTask;
  }
  const db = getMockDb();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error('task not found');
  db.tasks[idx] = { ...db.tasks[idx], ...update };
  return db.tasks[idx];
}

/* ============================================================
 * KPI (kpi_daily)
 * ============================================================ */

export async function listKpiDaily(sinceDays = 30): Promise<CpsKpiDaily[]> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const sinceStr = since.toISOString().slice(0, 10);
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from('cps_kpi_daily')
      .select('*')
      .gte('date', sinceStr)
      .order('date', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CpsKpiDaily[];
  }
  return getMockDb()
    .kpi_daily.filter((r) => r.date >= sinceStr)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ============================================================
 * 工程ステータス算出 + ダッシュボード
 * ============================================================ */

function recentLogsFor(
  logs: CpsWorkLog[],
  processId: string
): CpsWorkLog[] {
  const since = Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return logs.filter(
    (l) =>
      l.process_id === processId &&
      l.duration_minutes != null &&
      new Date(l.started_at).getTime() >= since
  );
}

export async function getProcessStatusItems(): Promise<CpsProcessStatusItem[]> {
  const [processes, logs, improvements] = await Promise.all([
    listProcesses(),
    listWorkLogs(),
    listImprovements(),
  ]);

  return processes.map((process) => {
    const recent = recentLogsFor(logs, process.id);
    const recent_avg_minutes =
      recent.length > 0
        ? Math.round(
            recent.reduce((a, l) => a + (l.duration_minutes ?? 0), 0) /
              recent.length
          )
        : null;
    const lastLog = logs
      .filter((l) => l.process_id === process.id)
      .sort((a, b) => (b.started_at ?? '').localeCompare(a.started_at ?? ''))[0];
    const last_logged_at = lastLog?.started_at ?? null;

    const hasOpenImprovement = improvements.some(
      (i) => i.process_id === process.id && i.status !== 'done'
    );

    const status = calcProcessStatus(
      process.standard_minutes,
      recent_avg_minutes,
      last_logged_at ? new Date(last_logged_at) : null,
      hasOpenImprovement
    );

    return { process, recent_avg_minutes, last_logged_at, status };
  });
}

export async function getDashboard(): Promise<CpsDashboard> {
  const [statusItems, todayTasks, allTasks, improvements, kpiRows] =
    await Promise.all([
      getProcessStatusItems(),
      listTasks({ today: true }),
      listTasks(),
      listImprovements(),
      listKpiDaily(31),
    ]);

  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const bottleneck_candidates: CpsBottleneckCandidate[] = statusItems
    .filter(
      (s) =>
        s.process.standard_minutes != null &&
        s.recent_avg_minutes != null &&
        s.recent_avg_minutes > s.process.standard_minutes!
    )
    .map((s) => ({
      process_id: s.process.id,
      process_name: s.process.name,
      standard_minutes: s.process.standard_minutes!,
      recent_avg_minutes: s.recent_avg_minutes!,
      over_ratio: s.recent_avg_minutes! / s.process.standard_minutes!,
    }))
    .sort((a, b) => b.over_ratio - a.over_ratio);

  return {
    today_tasks: todayTasks,
    process_statuses: statusItems,
    kpi_summary: {
      this_week_work_minutes: sumKpi(kpiRows, weekStart, 'total_work_minutes'),
      this_month_revenue: sumKpi(kpiRows, monthStart, 'revenue'),
      this_month_products_completed: sumKpi(
        kpiRows,
        monthStart,
        'products_completed'
      ),
      this_month_posts_published: sumKpi(
        kpiRows,
        monthStart,
        'posts_published'
      ),
      active_improvements: improvements.filter((i) => i.status !== 'done')
        .length,
      pending_tasks: allTasks.filter((t) => !t.is_done).length,
    },
    bottleneck_candidates,
  };
}
