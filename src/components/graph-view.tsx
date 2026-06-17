"use client";

import { useEffect, useRef, useState } from "react";
import type { ItemKind } from "@/lib/types";

export interface GraphNode {
  id: string;
  title: string;
  kind: ItemKind;
}
export interface GraphEdge {
  id: string;
  source_item_id: string;
  target_item_id: string;
  relation: string;
}

const KIND_COLOR: Record<ItemKind, string> = {
  memo: "#5b5bd6",
  task: "#0ea5a4",
  idea: "#e0883d",
  log: "#8e8e93",
};

const W = 800;
const H = 560;

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** 依存ライブラリなしの簡易フォースレイアウト */
export function GraphView({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const posRef = useRef<Map<string, P>>(new Map());
  const dragRef = useRef<string | null>(null);
  const [, force] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 位置を初期化（円状）
  if (posRef.current.size !== nodes.length) {
    const next = new Map<string, P>();
    nodes.forEach((n, i) => {
      const prev = posRef.current.get(n.id);
      const a = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      next.set(
        n.id,
        prev ?? { x: W / 2 + Math.cos(a) * 180, y: H / 2 + Math.sin(a) * 180, vx: 0, vy: 0 }
      );
    });
    posRef.current = next;
  }

  useEffect(() => {
    let raf = 0;
    const step = () => {
      const pos = posRef.current;
      // 反発
      const arr = nodes.map((n) => n.id);
      for (let i = 0; i < arr.length; i++) {
        const a = pos.get(arr[i])!;
        for (let j = i + 1; j < arr.length; j++) {
          const b = pos.get(arr[j])!;
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          const d2 = dx * dx + dy * dy || 0.01;
          const f = 1800 / d2;
          const d = Math.sqrt(d2);
          dx /= d;
          dy /= d;
          a.vx += dx * f;
          a.vy += dy * f;
          b.vx -= dx * f;
          b.vy -= dy * f;
        }
      }
      // バネ（リンク）
      for (const e of edges) {
        const a = pos.get(e.source_item_id);
        const b = pos.get(e.target_item_id);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - 110) * 0.01;
        a.vx += (dx / d) * f;
        a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f;
        b.vy -= (dy / d) * f;
      }
      // 中心引力 + 減衰 + 積分
      for (const id of arr) {
        const p = pos.get(id)!;
        if (dragRef.current === id) continue;
        p.vx += (W / 2 - p.x) * 0.002;
        p.vy += (H / 2 - p.y) * 0.002;
        p.vx *= 0.85;
        p.vy *= 0.85;
        p.x += p.vx;
        p.y += p.vy;
      }
      force((v) => v + 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [nodes, edges]);

  function toSvg(e: React.PointerEvent) {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  }

  const pos = posRef.current;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="h-[560px] w-full touch-none"
      onPointerMove={(e) => {
        if (!dragRef.current) return;
        const p = pos.get(dragRef.current);
        if (p) {
          const m = toSvg(e);
          p.x = m.x;
          p.y = m.y;
          p.vx = 0;
          p.vy = 0;
        }
      }}
      onPointerUp={() => (dragRef.current = null)}
      onPointerLeave={() => (dragRef.current = null)}
    >
      {edges.map((e) => {
        const a = pos.get(e.source_item_id);
        const b = pos.get(e.target_item_id);
        if (!a || !b) return null;
        return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#e7e7ea" strokeWidth={1.5} />;
      })}
      {nodes.map((n) => {
        const p = pos.get(n.id)!;
        const active = selected === n.id;
        return (
          <g
            key={n.id}
            transform={`translate(${p.x},${p.y})`}
            className="cursor-grab"
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture?.(e.pointerId);
              dragRef.current = n.id;
              setSelected(n.id);
            }}
          >
            <circle r={active ? 9 : 6} fill={KIND_COLOR[n.kind]} opacity={0.9} />
            <text x={11} y={4} fontSize={11} fill="#3a3a3c">
              {n.title.length > 16 ? n.title.slice(0, 16) + "…" : n.title}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
