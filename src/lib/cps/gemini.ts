// Gemini Flash 呼び出し（REST API 直叩き / 依存追加なし）
// 未設定時はモックの改善案を返し、アプリがゼロ設定で動くようにする。

import { cpsConfig, isGeminiConfigured } from '@/lib/cps/config';

export interface GeminiResult {
  text: string;
  mocked: boolean;
}

export async function generateText(prompt: string): Promise<GeminiResult> {
  if (!isGeminiConfigured()) {
    return { text: mockSuggestion(prompt), mocked: true };
  }

  const model = cpsConfig.ai.model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cpsConfig.ai.geminiApiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('') ?? '';

  if (!text.trim()) {
    throw new Error('Gemini API returned empty response');
  }
  return { text, mocked: false };
}

// Gemini 未設定時のサンプル改善案（デモ用）
function mockSuggestion(prompt: string): string {
  const m = prompt.match(/工程名: (.+)/);
  const name = m ? m[1].trim() : 'この工程';
  return `> ⚠️ これは **モック応答** です（\`GEMINI_API_KEY\` 未設定）。実際のAI提案を得るには環境変数を設定してください。

### ${name} の改善案

1. **段取り替えの外段取り化**
   ${name}に入る前の準備（工具・治具のセット）を前工程の待ち時間に済ませ、着手と同時に作業を始められるようにする。
   期待効果: 約 5 分削減見込み

2. **標準作業手順の見える化**
   番手・順序・チェックポイントを1枚の作業指示書にまとめ、迷い・やり直しのムダを排除する。
   期待効果: 約 4 分削減見込み

3. **治具・テンプレートの活用**
   位置決めや繰り返し作業を治具化し、測定・調整の時間を削減する。
   期待効果: 約 6 分削減見込み`;
}
