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
import { PHASE_ORDER } from '@/lib/cps/phases';

const statusColor: Record<string, string> = {
  normal: '#10b981',
  caution: '#f59e0b',
  stopped: '#ef4444',
};

const LANE_W = 200;
const NODE_W = 170;
const ROW_H = 90;
const PHASE_GAP = 70;
const FIRST_ROW_Y = 110;

interface Step {
  items: CpsProcessStatusItem[];
}

export function FlowCanvas({ items }: { items: CpsProcessStatusItem[] }) {
  const router = useRouter();

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const stepsOf = (phase: ProcessPhase): Step[] => {
      const map = new Map<number, CpsProcessStatusItem[]>();
      items
        .filter((i) => i.process.phase === phase)
        .forEach((i) => {
          const k = i.process.sort_order;
          if (!map.has(k)) map.set(k, []);
          map.get(k)!.push(i);
        });
      return [...map.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, list]) => ({ items: list }));
    };

    let x = 0;
    let prevExits: string[] = [];
    let prevHeader: string | null = null;

    PHASE_ORDER.forEach((phase) => {
      const steps = stepsOf(phase);
      const maxPar = Math.max(1, ...steps.map((s) => s.items.length));
      const phaseW = maxPar * LANE_W;
      const headerId = `phase-${phase}`;

      nodes.push({
        id: headerId,
        position: { x: x + phaseW / 2 - NODE_W / 2, y: 0 },
        data: { label: phase },
        draggable: false,
        selectable: false,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          width: NODE_W,
          background: '#0f172a',
          color: 'white',
          fontWeight: 700,
          border: 'none',
          borderRadius: 8,
        },
      });

      if (prevExits.length) {
        prevExits.forEach((src, i) =>
          edges.push({
            id: `m-${src}-${headerId}-${i}`,
            source: src,
            target: headerId,
            style: { stroke: '#94a3b8' },
          })
        );
      } else if (prevHeader) {
        edges.push({
          id: `e-${prevHeader}-${headerId}`,
          source: prevHeader,
          target: headerId,
          animated: true,
          style: { stroke: '#94a3b8' },
        });
      }

      let prevLayer: string[] = [headerId];
      steps.forEach((step, s) => {
        const n = step.items.length;
        const rowW = n * LANE_W;
        const offset = x + (phaseW - rowW) / 2;
        const layer: string[] = [];
        step.items.forEach((item, k) => {
          const color = statusColor[item.status] ?? '#10b981';
          const tag = item.process.route ? `[${item.process.route}] ` : '';
          nodes.push({
            id: item.process.id,
            position: { x: offset + k * LANE_W, y: FIRST_ROW_Y + s * ROW_H },
            data: {
              label: `${tag}${item.process.name}${
                item.recent_avg_minutes != null
                  ? ` (${item.recent_avg_minutes}分)`
                  : ''
              }`,
            },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
            style: {
              width: NODE_W,
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
          layer.push(item.process.id);
        });
        // 前段の各ノード → 今段の各ノード（分岐/合流）
        const fork = prevLayer.length === 1 || layer.length === 1;
        prevLayer.forEach((src) =>
          layer.forEach((dst) =>
            edges.push({
              id: `s-${src}-${dst}`,
              source: src,
              target: dst,
              animated: s === 0 && layer.length > 1,
              style: { stroke: fork ? '#a78bfa' : '#cbd5e1' },
            })
          )
        );
        prevLayer = layer;
      });

      prevExits = steps.length ? prevLayer : [];
      prevHeader = headerId;
      x += phaseW + PHASE_GAP;
    });

    return { nodes, edges };
  }, [items]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      if (!node.id.startsWith('phase-')) router.push(`/process/${node.id}`);
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
