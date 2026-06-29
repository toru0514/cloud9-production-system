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
const NODE_W = 175;
const ROW_H = 92;
const PHASE_GAP = 80;
const FIRST_ROW_Y = 110;

export function FlowCanvas({ items }: { items: CpsProcessStatusItem[] }) {
  const router = useRouter();

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const link = (source: string, target: string, accent = false) =>
      edges.push({
        id: `e-${source}-${target}`,
        source,
        target,
        style: { stroke: accent ? '#a78bfa' : '#cbd5e1' },
      });

    let x = 0;
    let prevExits: string[] = [];
    let prevHeader: string | null = null;

    PHASE_ORDER.forEach((phase) => {
      const pis = items.filter((i) => i.process.phase === phase);
      const rowVals = [...new Set(pis.map((i) => i.process.sort_order))].sort(
        (a, b) => a - b
      );
      const minSortFor = (r: string) =>
        Math.min(
          ...pis.filter((i) => i.process.route === r).map((i) => i.process.sort_order)
        );
      const routeCols = [
        ...new Set(
          pis.map((i) => i.process.route).filter((r): r is string => Boolean(r))
        ),
      ].sort((a, b) => minSortFor(a) - minSortFor(b) || a.localeCompare(b));
      const phaseW = Math.max(1, routeCols.length) * LANE_W;
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

      if (prevExits.length)
        prevExits.forEach((s) => link(s, headerId));
      else if (prevHeader)
        edges.push({
          id: `e-${prevHeader}-${headerId}`,
          source: prevHeader,
          target: headerId,
          animated: true,
          style: { stroke: '#94a3b8' },
        });

      // ノード配置
      const nodeOf = new Map<string, CpsProcessStatusItem>();
      pis.forEach((it) => nodeOf.set(it.process.id, it));
      rowVals.forEach((rv, r) => {
        const row = pis.filter((i) => i.process.sort_order === rv);
        const backbone = row.length === 1 && !row[0].process.route;
        row.forEach((item) => {
          const ci = item.process.route
            ? routeCols.indexOf(item.process.route)
            : -1;
          const nx = backbone
            ? x + phaseW / 2 - NODE_W / 2
            : x + (ci < 0 ? 0 : ci) * LANE_W + (LANE_W - NODE_W) / 2;
          const color = statusColor[item.status] ?? '#10b981';
          const tag = item.process.route ? `[${item.process.route}] ` : '';
          nodes.push({
            id: item.process.id,
            position: { x: nx, y: FIRST_ROW_Y + r * ROW_H },
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
        });
      });

      // エッジ: 区間（backbone と backbone の間）を route ごとに連結し、分岐/合流
      let lastBackbone: string = headerId;
      let region = new Map<string, string[]>(); // route -> node ids（行順）
      const closeRegion = (mergeInto: string | null) => {
        region.forEach((chain) => {
          link(lastBackbone, chain[0], true);
          for (let i = 1; i < chain.length; i++) link(chain[i - 1], chain[i]);
          if (mergeInto) link(chain[chain.length - 1], mergeInto, true);
        });
        region = new Map();
      };

      rowVals.forEach((rv) => {
        const row = pis.filter((i) => i.process.sort_order === rv);
        const backbone = row.length === 1 && !row[0].process.route;
        if (backbone) {
          const b = row[0].process.id;
          if (region.size) closeRegion(b);
          else link(lastBackbone, b);
          lastBackbone = b;
        } else {
          row.forEach((item) => {
            const key = item.process.route ?? `__${item.process.id}`;
            if (!region.has(key)) region.set(key, []);
            region.get(key)!.push(item.process.id);
          });
        }
      });

      let exits: string[];
      if (region.size) {
        closeRegion(null);
        // 末端ノード = 各 route 列で最大 sort_order のノード
        exits = routeCols
          .map((rc) => {
            const inCol = pis
              .filter((i) => i.process.route === rc)
              .sort((a, b) => a.process.sort_order - b.process.sort_order);
            return inCol[inCol.length - 1]?.process.id;
          })
          .filter((v): v is string => Boolean(v));
        if (!exits.length && lastBackbone !== headerId) exits = [lastBackbone];
      } else {
        exits = lastBackbone !== headerId ? [lastBackbone] : [];
      }

      prevExits = exits;
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
