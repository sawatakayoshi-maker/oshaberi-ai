import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Empty } from "@/components/ui";
import { createTimelineEvent } from "@/lib/actions";

export const dynamic = "force-dynamic";

interface Ev {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
}

export default async function TimelinePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timeline_events")
    .select("id, title, description, event_date")
    .order("event_date", { ascending: false });
  const events = (data ?? []) as Ev[];

  // 年でグループ化
  const byYear = new Map<string, Ev[]>();
  for (const e of events) {
    const y = e.event_date.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(e);
  }

  return (
    <AppShell title="人生タイムライン" description="出来事を時系列で記録し、人生ログとして蓄積。">
      <form action={createTimelineEvent} className="mb-6 flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-3">
        <input type="date" name="event_date" required className="rounded-lg border border-line px-2 py-2 text-sm" />
        <input name="title" required placeholder="出来事" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
        <input name="description" placeholder="詳細（任意）" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">記録</button>
      </form>

      {events.length === 0 ? (
        <Empty>まだ記録がありません。</Empty>
      ) : (
        <div className="space-y-6">
          {[...byYear.entries()].map(([year, evs]) => (
            <div key={year}>
              <h2 className="mb-2 text-lg font-semibold">{year}</h2>
              <ul className="space-y-2 border-l-2 border-line pl-4">
                {evs.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                    <p className="text-sm font-medium">
                      {e.title}
                      <span className="ml-2 text-xs text-ink-muted">
                        {new Date(e.event_date).toLocaleDateString("ja-JP")}
                      </span>
                    </p>
                    {e.description && <p className="text-xs text-ink-muted">{e.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
