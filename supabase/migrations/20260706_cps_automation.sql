-- ============================================================
-- CPS — 工程の自動化区分（手作業/治具化/自動化/外注）+ 変更履歴
-- ============================================================

-- 工程マスタに現状の自動化区分を追加（denormalized: ボード表示を速くするため）
ALTER TABLE cps_processes ADD COLUMN IF NOT EXISTS automation TEXT;

-- 自動化区分の変更履歴（append-only）
CREATE TABLE IF NOT EXISTS cps_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES cps_processes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,          -- '手作業' | '治具化' | '自動化' | '外注'
  note TEXT,                    -- 変更理由・メモ（任意）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cps_automation_logs_process
  ON cps_automation_logs(process_id);
CREATE INDEX IF NOT EXISTS idx_cps_automation_logs_created
  ON cps_automation_logs(created_at);

-- RLS（他テーブルと同一ポリシー: 認証済みユーザーはフルアクセス、サーバーは service role）
ALTER TABLE cps_automation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cps_automation_logs_owner_all ON cps_automation_logs;
CREATE POLICY cps_automation_logs_owner_all ON cps_automation_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
