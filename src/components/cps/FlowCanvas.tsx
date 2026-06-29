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

const LANE_W = 210;
const NODE_W = 180;
const ROW_H = 70;
const PHASE_GAP = 60;
const HEADER_Y = 0;
const FIRST_ROW_Y = 110;

export function FlowCanvas({ items }: { items: CpsProcessStatusItem[] }) {
  const router = useRouter();

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // フェーズごとのレーン（メイン + ルート）を組む
    const lanesOf = (phase: ProcessPhase) => {
      const pis = items
        .filter((i) => i.process.phase === phase)
        .sort((a, b) => a.process.sort_order - b.process.sort_order);
      const routes = [
        ...new Set(
          pis.map((i) => i.process.route).filter((r): r is string => Boolean(r))
        ),
      ];
      const lanes: CpsProcessStatusItem[][] = [];
      const main = pis.filter((i) => !i.process.route);
      if (main.length) lanes.push(main);
      routes.forEach((r) => lanes.push(pis.filter((i) => i.process.route === r)));
      return lanes;
    };

    let x = 0;
    let prevExits: string[] = []; // 直前フェーズの出口ノードID群
    let prevHeader: string | null = null;

    PHASE_ORDER.forEach((phase) => {
      const lanes = lanesOf(phase);
      const laneCount = Math.max(1, lanes.length);
      const phaseW = laneCount * LANE_W;
      const headerId = `phase-${phase}`;

      // フェーズ見出し
      nodes.push({
        id: headerId,
        position: { x: x + phaseW / 2 - NODE_W / 2, y: HEADER_Y },
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

      // 直前フェーズ出口 → このフェーズ見出し（合流 → 次へ）
      if (prevExits.length) {
        prevExits.forEach((src, i) =>
          edges.push({
            id: `merge-${src}-${headerId}-${i}`,
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

      const exits: string[] = [];

      lanes.forEach((lane, li) => {
        const laneX = x + li * LANE_W;
        let prevInLane: string | null = null;
        lane.forEach((item, ri) => {
          const color = statusColor[item.status] ?? '#10b981';
          const labelRoute = item.process.route ? `「${item.process.route}」` : '';
          nodes.push({
            id: item.process.id,
            position: { x: laneX, y: FIRST_ROW_Y + ri * ROW_H },
            data: {
              label: `${item.process.name}${
                item.recent_avg_minutes != null
                  ? ` (${item.recent_avg_minutes}分)`
                  : ''
              }${ri === 0 && labelRoute ? `\n${labelRoute}` : ''}`,
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
              whiteSpace: 'pre-line',
            },
          });
          // 見出し → 先頭ノード（分岐）、以降は直列
          const src = prevInLane ?? headerId;
          edges.push({
            id: `seq-${src}-${item.process.id}`,
            source: src,
            target: item.process.id,
            style: { stroke: prevInLane ? '#cbd5e1' : '#a78bfa' },
            animated: !prevInLane && lanes.length > 1,
          });
          prevInLane = item.process.id;
        });
        if (prevInLane) exits.push(prevInLane);
      });

      prevExits = exits;
      prevHeader = headerId;
      x += phaseW + PHASE_GAP;
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
