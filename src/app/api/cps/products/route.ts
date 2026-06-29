import { createProduct, listProducts } from '@/lib/cps/supabase';
import { ok, fail, handleError } from '@/lib/cps/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok(await listProducts());
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.name) return fail('name is required');
    return ok(await createProduct(body), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
