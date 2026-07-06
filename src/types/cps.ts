// Cloud9 Production System (CPS) — 全型定義

// 工程フェーズ = 実態のバリューストリーム（仕入れ→製造→発信→販売→お客様）。
// 「分析・改善」は工程ではなく、この流れを観察して直すメタ活動（=アプリ自体の役割）
// として /improvements とダッシュボードのボトルネック表示で扱う。
export type ProcessPhase =
  | '企画'
  | '開発'
  | '製造'
  | '梱包材準備'
  | '発送'
  | 'コンテンツ'
  | 'コンテンツ(写真)'
  | 'コンテンツ(動画)'
  | '販売';

export type ProcessStatus = 'normal' | 'caution' | 'stopped';

// 工程の自動化区分（現状）。改善が進むと 手作業 → 治具化 → 自動化 と遷移していく想定。
// 組込みは 手作業/治具化/自動化/効率化検討済/外注 の5種だが、UI から任意の区分を
// 追加できるため型は string。組込みの定義・配色は @/lib/cps/automation を参照。
// 変更は cps_automation_logs に履歴として残す。
export type AutomationLabel = string;

export type ImprovementStatus = 'proposed' | 'in_progress' | 'done';

export type ProductPhase =
  | '企画'
  | '設計'
  | '加工'
  | '仕上げ'
  | '撮影'
  | '投稿'
  | '販売';

export interface CpsProcess {
  id: string;
  name: string;
  phase: ProcessPhase;
  sort_order: number;
  standard_minutes: number | null;
  status: ProcessStatus;
  description: string | null;
  tools: string[];
  route: string | null; // 同一フェーズ内の並行ブランチ（枝）ラベル。null = メイン
  product_line: string | null; // 製造フェーズの商品ライン（レーン）。route(枝)とは別軸。null = 未分類
  automation: AutomationLabel | null; // 現状の自動化区分。null = 未設定
  created_at: string;
  updated_at: string;
}

// 自動化区分の変更履歴（append-only）。工程の automation を書き換えるたびに1行追加。
export interface CpsAutomationLog {
  id: string;
  process_id: string;
  label: AutomationLabel; // この時点で設定された区分
  note: string | null; // 変更理由・メモ（任意）
  created_at: string;
}

export interface CpsWorkLog {
  id: string;
  process_id: string;
  product_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  memo: string | null;
  created_at: string;
}

export interface CpsProduct {
  id: string;
  name: string;
  category: string | null;
  wood_type: string | null;
  price: number | null;
  cost: number | null;
  current_status: ProductPhase;
  is_active: boolean;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CpsProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  is_main: boolean;
  sort_order: number;
  created_at: string;
}

export interface CpsImprovement {
  id: string;
  process_id: string;
  title: string;
  before_desc: string | null;
  after_desc: string | null;
  effect_minutes: number | null;
  effect_desc: string | null;
  status: ImprovementStatus;
  implemented_at: string | null;
  ai_suggestion: string | null;
  created_at: string;
  updated_at: string;
}

export interface CpsTask {
  id: string;
  title: string;
  process_id: string | null;
  product_id: string | null;
  due_date: string | null;
  is_done: boolean;
  priority: 1 | 2 | 3;
  created_at: string;
  updated_at: string;
}

export interface CpsKpiDaily {
  id?: string;
  date: string;
  total_work_minutes: number;
  products_completed: number;
  posts_published: number;
  revenue: number;
  improvement_count: number;
  ai_usage_count: number;
  notes?: string | null;
  created_at?: string;
}

// ダッシュボード集計型
export interface CpsProcessStatusItem {
  process: CpsProcess;
  recent_avg_minutes: number | null;
  last_logged_at: string | null;
  status: ProcessStatus;
}

export interface CpsBottleneckCandidate {
  process_id: string;
  process_name: string;
  standard_minutes: number;
  recent_avg_minutes: number;
  over_ratio: number; // 実績 / 標準時間
}

export interface CpsDashboard {
  today_tasks: CpsTask[];
  process_statuses: CpsProcessStatusItem[];
  kpi_summary: {
    this_week_work_minutes: number;
    this_month_revenue: number;
    this_month_products_completed: number;
    this_month_posts_published: number;
    active_improvements: number;
    pending_tasks: number;
  };
  bottleneck_candidates: CpsBottleneckCandidate[];
}
