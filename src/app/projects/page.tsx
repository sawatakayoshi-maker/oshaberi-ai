import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Empty } from "@/components/ui";
import { createProject } from "@/lib/actions";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
  const projects = (data ?? []) as Project[];

  // プロジェクトごとの item 件数
  const counts: Record<string, number> = {};
  if (projects.length) {
    const { data: items } = await supabase.from("items").select("project_id");
    for (const it of items ?? []) {
      if (it.project_id) counts[it.project_id] = (counts[it.project_id] ?? 0) + 1;
    }
  }

  return (
    <AppShell title="プロジェクト" description="複数プロジェクトを横断管理。">
      <form action={createProject} className="mb-6 flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-3">
        <input name="name" required placeholder="プロジェクト名" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
        <input name="description" placeholder="説明（任意）" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">作成</button>
      </form>

      {projects.length === 0 ? (
        <Empty>プロジェクトはありません。</Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block rounded-2xl border border-line bg-surface p-4 transition hover:border-accent"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{p.name}</p>
                  <span className="text-xs text-ink-muted">{counts[p.id] ?? 0} 件</span>
                </div>
                {p.description && <p className="mt-1 text-sm text-ink-muted">{p.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
