import { notFound } from 'next/navigation';
import { getWorkCombination, listProcesses } from '@/lib/cps/supabase';
import { CombinationEditor } from '@/components/cps/CombinationEditor';

export const dynamic = 'force-dynamic';

export default async function CombinationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getWorkCombination(id);
  if (!detail) notFound();

  let processName: string | null = null;
  if (detail.combination.process_id) {
    const processes = await listProcesses();
    processName =
      processes.find((p) => p.id === detail.combination.process_id)?.name ??
      null;
  }

  return <CombinationEditor detail={detail} processName={processName} />;
}
