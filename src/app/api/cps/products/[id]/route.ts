import { getProduct, updateProduct } from '@/lib/cps/supabase';
import { ok, fail, handleError } from '@/lib/cps/api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await getProduct(id);
    if (!product) return fail('product not found', 404);
    return ok(product);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patch = await req.json();
    return ok(await updateProduct(id, patch));
  } catch (e) {
    return handleError(e);
  }
}
