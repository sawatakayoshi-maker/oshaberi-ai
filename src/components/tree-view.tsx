"use client";

import { useState } from "react";
import {
  createTreeNode,
  renameTreeNode,
  deleteTreeNode,
  moveTreeNode,
} from "@/lib/actions";

export interface TreeNode {
  id: string;
  parent_id: string | null;
  name: string;
  position: number;
}

interface TreeItem extends TreeNode {
  children: TreeItem[];
}

function buildTree(nodes: TreeNode[]): TreeItem[] {
  const map = new Map<string, TreeItem>();
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));
  const roots: TreeItem[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export function TreeView({ nodes }: { nodes: TreeNode[] }) {
  const [dragId, setDragId] = useState<string | null>(null);

  async function reparent(id: string, parentId: string | null) {
    if (id === parentId) return;
    const fd = new FormData();
    fd.set("id", id);
    if (parentId) fd.set("parent_id", parentId);
    await moveTreeNode(fd);
  }

  if (nodes.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-muted">まだ項目がありません。</p>;
  }

  const tree = buildTree(nodes);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => dragId && reparent(dragId, null)}
    >
      {tree.map((node) => (
        <Node key={node.id} node={node} dragId={dragId} setDragId={setDragId} reparent={reparent} />
      ))}
    </div>
  );
}

function Node({
  node,
  dragId,
  setDragId,
  reparent,
}: {
  node: TreeItem;
  dragId: string | null;
  setDragId: (id: string | null) => void;
  reparent: (id: string, parentId: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [over, setOver] = useState(false);

  return (
    <div className="ml-1">
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          setDragId(node.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          if (dragId && dragId !== node.id) reparent(dragId, node.id);
          setDragId(null);
        }}
        className={`group flex items-center gap-1 rounded-lg px-2 py-1 text-sm ${
          over ? "bg-accent-soft" : "hover:bg-surface-sunken"
        }`}
      >
        {node.children.length > 0 ? (
          <button onClick={() => setOpen(!open)} className="w-4 text-ink-muted">
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 text-center text-ink-muted">·</span>
        )}

        {editing ? (
          <form
            action={async (fd) => {
              fd.set("id", node.id);
              await renameTreeNode(fd);
              setEditing(false);
            }}
            className="flex flex-1 gap-1"
          >
            <input name="name" defaultValue={node.name} autoFocus className="flex-1 rounded border border-line px-1 text-sm" />
            <button className="text-xs text-accent">保存</button>
          </form>
        ) : (
          <>
            <span className="flex-1 cursor-grab truncate" onDoubleClick={() => setEditing(true)}>
              {node.name}
            </span>
            <div className="hidden gap-1 group-hover:flex">
              <form action={createTreeNode}>
                <input type="hidden" name="parent_id" value={node.id} />
                <input type="hidden" name="name" value="新規" />
                <button className="text-xs text-ink-muted hover:text-accent" title="子を追加">＋</button>
              </form>
              <button onClick={() => setEditing(true)} className="text-xs text-ink-muted hover:text-accent" title="名前変更">✎</button>
              <form action={deleteTreeNode}>
                <input type="hidden" name="id" value={node.id} />
                <button className="text-xs text-ink-muted hover:text-red-600" title="削除">✕</button>
              </form>
            </div>
          </>
        )}
      </div>

      {open && node.children.length > 0 && (
        <div className="ml-3 border-l border-line pl-2">
          {node.children.map((child) => (
            <Node key={child.id} node={child} dragId={dragId} setDragId={setDragId} reparent={reparent} />
          ))}
        </div>
      )}
    </div>
  );
}
