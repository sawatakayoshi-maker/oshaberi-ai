import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Empty } from "@/components/ui";
import { createContact, deleteContact } from "@/lib/actions";

export const dynamic = "force-dynamic";

interface Contact {
  id: string;
  name: string;
  email: string;
}

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, name, email")
    .order("created_at", { ascending: false });
  const contacts = (data ?? []) as Contact[];

  return (
    <AppShell title="連絡先" description="お話のメール下書きで宛先に使えます。">
      <form action={createContact} className="mb-6 flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-3">
        <input name="name" required placeholder="名前" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
        <input name="email" type="email" required placeholder="メールアドレス" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">追加</button>
      </form>

      {contacts.length === 0 ? (
        <Empty>連絡先はありません。</Empty>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-ink-muted">{c.email}</p>
              </div>
              <form action={deleteContact}>
                <input type="hidden" name="id" value={c.id} />
                <button className="rounded-md px-2 py-1 text-xs text-ink-muted hover:text-red-600">削除</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
