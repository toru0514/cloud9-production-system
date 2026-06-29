-- ============================================================
-- Cloud9 Production System (CPS) — 初期マイグレーション
-- 既存 Supabase プロジェクトへ統合。全テーブル cps_ prefix。
-- ============================================================

-- 工程マスタ
CREATE TABLE IF NOT EXISTS cps_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phase TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  standard_minutes INTEGER,
  status TEXT DEFAULT 'normal',
  description TEXT,
  tools TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 商品マスタ（work_logs より先に定義）
CREATE TABLE IF NOT EXISTS cps_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  wood_type TEXT,
  price INTEGER,
  cost INTEGER,
  current_status TEXT DEFAULT 'planning',
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 作業実績
CREATE TABLE IF NOT EXISTS cps_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES cps_processes(id) ON DELETE SET NULL,
  product_id UUID REFERENCES cps_products(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 商品写真（v0.2）
CREATE TABLE IF NOT EXISTS cps_product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES cps_products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 改善記録
CREATE TABLE IF NOT EXISTS cps_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES cps_processes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  before_desc TEXT,
  after_desc TEXT,
  effect_minutes INTEGER,
  effect_desc TEXT,
  status TEXT DEFAULT 'proposed',
  implemented_at DATE,
  ai_suggestion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KPI記録（日次）
CREATE TABLE IF NOT EXISTS cps_kpi_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_work_minutes INTEGER DEFAULT 0,
  products_completed INTEGER DEFAULT 0,
  posts_published INTEGER DEFAULT 0,
  revenue INTEGER DEFAULT 0,
  improvement_count INTEGER DEFAULT 0,
  ai_usage_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- タスク
CREATE TABLE IF NOT EXISTS cps_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  process_id UUID REFERENCES cps_processes(id) ON DELETE SET NULL,
  product_id UUID REFERENCES cps_products(id) ON DELETE SET NULL,
  due_date DATE,
  is_done BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_cps_work_logs_process ON cps_work_logs(process_id);
CREATE INDEX IF NOT EXISTS idx_cps_work_logs_started ON cps_work_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_cps_improvements_process ON cps_improvements(process_id);
CREATE INDEX IF NOT EXISTS idx_cps_tasks_done ON cps_tasks(is_done);

-- ============================================================
-- RLS（ソロ運用: 認証済みユーザーのみフルアクセス）
-- サーバーは service role key 利用のため RLS をバイパスする。
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cps_processes','cps_products','cps_work_logs','cps_product_images',
    'cps_improvements','cps_kpi_daily','cps_tasks'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t || '_owner_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t || '_owner_all', t
    );
  END LOOP;
END $$;

-- ============================================================
-- 初期データ（工程マスタ） — 仕様書 §12
-- ============================================================
INSERT INTO cps_processes (name, phase, sort_order, standard_minutes) VALUES
('材料選定', '製造', 1, 10),
('切断', '製造', 2, 20),
('CNC', '製造', 3, 45),
('3Dプリント', '製造', 4, 120),
('レーザー加工', '製造', 5, 30),
('研磨', '製造', 6, 30),
('塗装', '製造', 7, 20),
('品質確認', '製造', 8, 10),
('商品情報入力', 'コンテンツ', 10, 15),
('写真撮影', 'コンテンツ', 11, 45),
('写真選別', 'コンテンツ', 12, 10),
('Instagram投稿生成', 'コンテンツ', 13, 5),
('YouTube台本生成', 'コンテンツ', 14, 10),
('動画生成', 'コンテンツ', 15, 30),
('投稿予約', 'コンテンツ', 16, 5),
('受注確認', '販売', 20, 5),
('梱包', '販売', 21, 10),
('発送', '販売', 22, 10),
('ボトルネック分析', '改善', 30, NULL),
('改善案作成', '改善', 31, NULL),
('効果測定', '改善', 32, NULL)
ON CONFLICT DO NOTHING;
