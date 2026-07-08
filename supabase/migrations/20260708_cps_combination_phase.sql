-- ============================================================
-- CPS — 標準作業組合せ票をフェーズ／分岐（レーン）単位で組めるように拡張
-- phase: 開発 / 製造 など。lane: 分岐(route) または 商品ライン(product_line)。
-- この2つを覚えておくと、工程マスタから作業要素を再取り込みできる。
-- ============================================================

ALTER TABLE cps_work_combinations
  ADD COLUMN IF NOT EXISTS phase TEXT;
ALTER TABLE cps_work_combinations
  ADD COLUMN IF NOT EXISTS lane TEXT;
