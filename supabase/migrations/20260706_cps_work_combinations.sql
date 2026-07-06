-- ============================================================
-- CPS — 標準作業組合せ票（Standard Work Combination Table）
-- TPS 標準3票の一つ。1工程を作業要素に分解し、手作業・自動送り・
-- 歩行の時間をタクトタイムに対して組み合わせ、ムダを見える化する。
-- ============================================================

-- 組合せ票ヘッダー（1工程 / 1商品ラインに1枚）
CREATE TABLE IF NOT EXISTS cps_work_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  process_id UUID REFERENCES cps_processes(id) ON DELETE SET NULL, -- 分解対象の工程（任意）
  product_line TEXT,                 -- 商品ライン（タクトはライン単位）
  required_qty INTEGER NOT NULL DEFAULT 1,       -- 必要数（個/直）
  operating_seconds INTEGER NOT NULL DEFAULT 27600, -- 稼働時間（秒/直）。既定=7時間40分
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 作業要素（票の各行）。手・送・歩を秒で保持し、線はここから算出する。
CREATE TABLE IF NOT EXISTS cps_work_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combination_id UUID NOT NULL REFERENCES cps_work_combinations(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,              -- 作業順（表示用の番号）
  name TEXT NOT NULL,                -- 作業内容
  manual_seconds INTEGER NOT NULL DEFAULT 0, -- 手作業（実線）
  auto_seconds INTEGER NOT NULL DEFAULT 0,   -- 自動送り（破線）
  walk_seconds INTEGER NOT NULL DEFAULT 0,   -- 歩行（波線）
  sort_order INTEGER NOT NULL DEFAULT 0,     -- 並び順（seq とは独立に保持）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cps_work_combinations_process
  ON cps_work_combinations(process_id);
CREATE INDEX IF NOT EXISTS idx_cps_work_elements_combination
  ON cps_work_elements(combination_id);

-- ============================================================
-- RLS（ソロ運用: 認証済みユーザーのみフルアクセス）
-- サーバーは service role key 利用のため RLS をバイパスする。
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['cps_work_combinations','cps_work_elements'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t || '_owner_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t || '_owner_all', t
    );
  END LOOP;
END $$;
