# Cloud9 Production System (CPS)

木材工房 **Cloud9** の全活動（木工・SNS・販売・分析・改善）を一画面で把握し、
ボトルネックを発見・改善し続けるための **生産管理ダッシュボード**。

> 管理するために入力するのではない。改善するために入力する。
> TPS（トヨタ生産方式）の「カイゼン」思想をクリエイター業務へ適用する。

## CPSサイクル（永続ループ）

```
ボトルネック発見 → 改善案作成 → AI化 → アプリ化 → 標準化 → 効果測定 → (repeat)
```

## 技術スタック

| 項目 | 採用 |
|------|------|
| フレームワーク | Next.js 16 (App Router) / React 19 |
| DB / Auth | Supabase（テーブルは `cps_` prefix） |
| AI | Gemini Flash API |
| UI | shadcn/ui + Tailwind CSS v4 |
| フロー図 | React Flow (`@xyflow/react`) |
| ホスティング | Vercel |

## クイックスタート

```bash
npm install
npm run dev
# http://localhost:3000
```

> **ゼロ設定で起動できます。** 環境変数が未設定の場合、内蔵のモックデータ
> （工程マスタ・サンプル商品・作業実績）で動作し、AI改善案はモック応答を返します。

## 本番セットアップ

1. `.env.example` を `.env.local` にコピーし、値を設定:
   - `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`（AI改善案生成用）
2. Supabase で `supabase/migrations/20260629_cps_init.sql` を実行
   （全テーブル + RLS + 工程マスタの初期データを投入）。

環境変数が設定されると自動的に Supabase / Gemini 実接続に切り替わります
（コード変更不要。`isSupabaseConfigured()` / `isGeminiConfigured()` で分岐）。

## 画面

| パス | 概要 |
|------|------|
| `/` | ダッシュボード（工程ステータス信号機・今日のタスク・KPI・改善候補） |
| `/flow` | 工程マップ（React Flow、ノードクリックで工程詳細へ） |
| `/process/[id]` | 工程詳細（標準/実績時間・改善履歴・AI改善案・実績入力） |
| `/products`, `/products/[id]` | 商品DB |
| `/contents` | コンテンツ管理 |
| `/improvements` | 改善管理（提案 → 実施 → 完了） |
| `/kpi` | KPI分析 |
| `/settings` | 接続状況・工程マスタ |

## ステータス判定（信号機）

- 🟢 正常: 実績 ≤ 標準 × 1.1
- 🟡 改善候補: 標準 × 1.1 < 実績 ≤ 標準 × 1.5、または未完了の改善提案あり
- 🔴 停止: 7日以上未記録、または実績 > 標準 × 1.5

しきい値は `CPS_BOTTLENECK_CAUTION_RATIO` / `CPS_BOTTLENECK_STOP_DAYS` で調整可能。

## ディレクトリ

```
src/
  app/
    (cps)/            # 画面（共通レイアウト + ナビ）
    api/cps/          # Route Handlers
  components/cps/     # CPS専用UIコンポーネント
  components/ui/      # shadcn/ui
  lib/cps/            # クエリ関数・モック・AI・プロンプト・ユーティリティ
  types/cps.ts        # 全型定義
supabase/migrations/  # DBマイグレーション
```

## 実装状況（v0.1 MVP）

- [x] ダッシュボード（信号機・タスク・KPI・改善候補）
- [x] 工程マスタ + 標準時間
- [x] 作業実績入力（時間自動計算）
- [x] 改善記録（提案/実施/完了 + AI改善案生成）
- [x] 商品DB（一覧/詳細/作成/編集）
- [x] 工程マップ（React Flow）
- [x] KPI分析
- [ ] 画像管理（Supabase Storage） … v0.2
- [ ] 既存アプリ連携 … v0.3
