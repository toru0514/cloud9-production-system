-- ============================================================
-- CPS — 製造工程を「商品ライン（カテゴリ）」ごとに分割
-- 旧: 全カテゴリ共通の製造 8 工程（route IS NULL）
-- 新: カテゴリごとの製造レーン（route = カテゴリ名）
-- フローマップ上で製造フェーズだけがカテゴリごとの並列レーン（分岐→合流）になる。
-- 上流（開発）・下流（梱包材準備→発送→販売→コンテンツ）は共通 1 本のまま。
-- ============================================================

BEGIN;

-- カテゴリ別 製造工程を投入。
-- sort_order は共通スケール（材料選定=1 / 切断=2 / 成形=3 / 研磨/レジン=4-5 / 品質確認=6）で段を揃える。
INSERT INTO cps_processes (name, phase, sort_order, standard_minutes, tools, route) VALUES
-- ウッドリング
('材料選定', '製造', 1, 10, '{}',                                 'ウッドリング'),
('切断',     '製造', 2, 20, ARRAY['バンドソー'],                  'ウッドリング'),
('CNC',      '製造', 3, 45, ARRAY['CNCルーター'],                 'ウッドリング'),
('研磨',     '製造', 4, 30, ARRAY['サンダー #120','#240','#400'], 'ウッドリング'),
('塗装',     '製造', 5, 20, ARRAY['オイル','刷毛'],               'ウッドリング'),
('品質確認', '製造', 6, 10, '{}',                                 'ウッドリング'),
-- ウッドバングル
('材料選定', '製造', 1, 10, '{}',                                 'ウッドバングル'),
('切断',     '製造', 2, 25, ARRAY['バンドソー'],                  'ウッドバングル'),
('CNC',      '製造', 3, 50, ARRAY['CNCルーター'],                 'ウッドバングル'),
('研磨',     '製造', 4, 30, ARRAY['サンダー #120','#240','#400'], 'ウッドバングル'),
('塗装',     '製造', 5, 20, ARRAY['オイル','刷毛'],               'ウッドバングル'),
('品質確認', '製造', 6, 10, '{}',                                 'ウッドバングル'),
-- クリスタルウッドリング（3Dプリント + レジン。切断・塗装なし）
('材料選定',   '製造', 1, 15, '{}',                                 'クリスタルウッドリング'),
('3Dプリント', '製造', 3, 120, ARRAY['3Dプリンター'],               'クリスタルウッドリング'),
('レジン注入', '製造', 4, 40, ARRAY['レジン','真空脱泡'],           'クリスタルウッドリング'),
('研磨',       '製造', 5, 30, ARRAY['サンダー #120','#240','#400'], 'クリスタルウッドリング'),
('品質確認',   '製造', 6, 10, '{}',                                 'クリスタルウッドリング');

-- 既存の作業実績を、商品カテゴリに対応する新レーンの同名工程へ付け替える。
-- product_id → products.category → 新工程(route=category, name一致) で解決できるものだけ移す。
-- （product_id 無し / 一致レーン無しの実績は付け替えられず、下の DELETE で process_id が NULL になる）
UPDATE cps_work_logs wl
SET process_id = np.id
FROM cps_processes op
JOIN cps_products pr ON pr.id = wl.product_id
JOIN cps_processes np
  ON np.phase = '製造' AND np.route = pr.category AND np.name = op.name
WHERE wl.process_id = op.id
  AND op.phase = '製造'
  AND op.route IS NULL;

-- 旧・共通の製造工程（route 未設定）を削除。
-- 注意: これに紐づく改善(cps_improvements)は ON DELETE CASCADE で消える。
-- 上の UPDATE で移せなかった work_logs / tasks は process_id が NULL になる。
DELETE FROM cps_processes
WHERE phase = '製造' AND route IS NULL;

COMMIT;
