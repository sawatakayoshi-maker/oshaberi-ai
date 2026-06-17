-- ============================================================
-- 連絡先（機能B: メール宛先の選択用）
-- ============================================================
create table if not exists contacts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_contacts_user on contacts(user_id);

alter table contacts enable row level security;

create policy "contacts_owner_all" on contacts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
