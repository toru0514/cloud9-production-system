// API ルート共通ヘルパー

import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(e: unknown) {
  const message =
    e instanceof Error ? e.message : 'Unexpected error occurred';
  console.error('[CPS API]', e);
  return NextResponse.json({ error: message }, { status: 500 });
}
