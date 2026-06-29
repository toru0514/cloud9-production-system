// AI 改善案生成プロンプト（仕様書 §7.2）

export interface ImprovePromptContext {
  process_name: string;
  standard_minutes: number | null;
  recent_avg_minutes: number | null;
  tools: string[];
  past_improvements: string[];
}

export function buildImprovePrompt(ctx: ImprovePromptContext): string {
  const tools = ctx.tools.length ? ctx.tools.join('、') : '（記録なし）';
  const past = ctx.past_improvements.length
    ? ctx.past_improvements.map((p) => `・${p}`).join('\n')
    : '（記録なし）';

  return `あなたはTPS（トヨタ生産方式）の専門家です。
木材工房Cloud9（アクセサリー製作のソロ運営）の以下の工程を分析し、具体的な改善案を3点提案してください。

工程名: ${ctx.process_name}
標準時間: ${ctx.standard_minutes ?? '未設定'}分
最近の実績平均: ${ctx.recent_avg_minutes ?? '未計測'}分
使用工具: ${tools}
過去の改善:
${past}

改善案は以下の形式（Markdown）で返してください。各案ごとに：
1. **改善タイトル**（1行）
2. 具体的な改善方法（2〜3文）
3. 期待効果（○分削減見込み）

ムダ（7つのムダ）の観点を意識し、ソロ運営で今日から実行できる現実的な案にしてください。`;
}
