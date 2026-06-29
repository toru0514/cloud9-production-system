'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { CpsProcessStatusItem, ProcessPhase } from '@/types/cps';

const PHASES: ProcessPhase[] = [
  '企画',
  '製造',
  'コンテンツ',
  '販売',
  '分析',
  '改善',
];

const statusColor: Record<string, string> = {
  normal: '#10b981',
  caution: '#f59e0b',
  stopped: '#ef4444',
};

const COL_W = 220;
const ROW_H = 64;

export function FlowCanvas({ items }: { items: CpsProcessStatusItem[] }) {
  const router = useRouter();

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // フェーズ見出しノード
    PHASES.forEach((phase, col) => {
      nodes.push({
        id: `phase-${phase}`,
        position: { x: col * COL_W, y: 0 },
        data: { label: phase },
        type: 'input',
        sourcePosition: Position.Bottom,
        draggable: false,
        selectable: false,
        style: {
          width: COL_W - 40,
          background: '#0f172a',
          color: 'white',
          fontWeight: 700,
          border: 'none',
          borderRadius: 8,
        },
      });
    });

    // フェーズ間の流れ
    for (let i = 0; i < PHASES.length - 1; i++) {
      edges.push({
        id: `e-${i}`,
        source: `phase-${PHASES[i]}`,
        target: `phase-${PHASES[i + 1]}`,
        animated: true,
        style: { stroke: '#94a3b8' },
      });
    }

    // 工程ノード
    PHASES.forEach((phase, col) => {
      const phaseItems = items
        .filter((it) => it.process.phase === phase)
        .sort((a, b) => a.process.sort_order - b.process.sort_order);
      phaseItems.forEach((it, row) => {
        const color = statusColor[it.status] ?? '#10b981';
        nodes.push({
          id: it.process.id,
          position: { x: col * COL_W, y: (row + 1) * ROW_H + 40 },
          data: {
            label: `${it.process.name}${
              it.recent_avg_minutes != null
                ? ` (${it.recent_avg_minutes}分)`
                : ''
            }`,
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          style: {
            width: COL_W - 40,
            background: 'white',
            borderLeft: `5px solid ${color}`,
            borderTop: '1px solid #e2e8f0',
            borderRight: '1px solid #e2e8f0',
            borderBottom: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 12,
            textAlign: 'left',
            padding: '6px 10px',
          },
        });
      });
    });

    return { nodes, edges };
  }, [items]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      if (!node.id.startsWith('phase-')) {
        router.push(`/process/${node.id}`);
      }
    },
    [router]
  );

  return (
    <div className="h-[70vh] w-full rounded-lg border bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        nodesDraggable={false}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
