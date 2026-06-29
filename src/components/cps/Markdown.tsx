import { Fragment } from 'react';

// 依存追加なしの軽量 Markdown レンダラ（AI出力表示用）
// 対応: 見出し(#〜###)、太字(**)、箇条書き(-/数字.)、引用(>)、段落

function renderInline(text: string, keyBase: string) {
  // **bold** のみ対応
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return (
        <strong key={`${keyBase}-${i}`} className="font-semibold">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={`${keyBase}-${i}`}>{p}</Fragment>;
  });
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = (key: string) => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={key} className="my-2 list-disc space-y-1 pl-5">
        {list.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
        ))}
      </ul>
    );
    list = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `l-${idx}`;

    if (/^#{1,6}\s/.test(line)) {
      flushList(`pre-${key}`);
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s/, '');
      const sizes = ['text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm', 'text-sm'];
      blocks.push(
        <p key={key} className={`mt-3 mb-1 font-bold ${sizes[level - 1]}`}>
          {renderInline(text, key)}
        </p>
      );
      return;
    }
    if (/^[-*]\s/.test(line) || /^\d+[.)]\s/.test(line)) {
      list.push(line.replace(/^([-*]|\d+[.)])\s/, ''));
      return;
    }
    if (/^>\s?/.test(line)) {
      flushList(`pre-${key}`);
      blocks.push(
        <blockquote
          key={key}
          className="my-2 border-l-4 border-amber-400 bg-amber-50 py-1 pl-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        >
          {renderInline(line.replace(/^>\s?/, ''), key)}
        </blockquote>
      );
      return;
    }
    if (line.trim() === '') {
      flushList(`pre-${key}`);
      return;
    }
    flushList(`pre-${key}`);
    blocks.push(
      <p key={key} className="my-1.5 leading-relaxed">
        {renderInline(line, key)}
      </p>
    );
  });
  flushList('final');

  return <div className="text-sm">{blocks}</div>;
}
