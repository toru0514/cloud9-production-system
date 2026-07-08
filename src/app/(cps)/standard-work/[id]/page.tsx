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
  const [detail, processes] = await Promise.all([
    getWorkCombination(id),
    listProcesses(),
  ]);
  if (!detail) notFound();

  const processName = detail.combination.process_id
    ? processes.find((p) => p.id === detail.combination.process_id)?.name ?? null
    : null;

  return (
    <CombinationEditor
      detail={detail}
      processName={processName}
      processes={processes}
    />
  );
}
