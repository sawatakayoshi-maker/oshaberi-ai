-- ============================================================
-- Personal Brain OS — 初期スキーマ
--   全テーブル RLS 有効 / user_id = auth.uid() で隔離
--   実行: Supabase SQL Editor、または `supabase db push`
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------
do $$ begin
  create type item_kind as enum ('memo', 'task', 'idea', 'log');
exception when duplicate_object then null; end $$;

-- ---------- updated_at トリガ関数 ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- profiles
-- ============================================================
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  settings     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- 新規ユーザ作成時に profiles を自動生成
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- projects
-- ============================================================
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  color       text,
  status      text not null default 'active',  -- active / archived / done
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_projects_user on projects(user_id);
create trigger trg_projects_updated before update on projects
  for each row execute function set_updated_at();

-- ============================================================
-- tree_nodes (メモリーツリー / 自己参照階層)
-- ============================================================
create table if not exists tree_nodes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  parent_id  uuid references tree_nodes(id) on delete cascade,
  name       text not null,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_tree_user on tree_nodes(user_id);
create index if not exists idx_tree_parent on tree_nodes(parent_id);

-- ============================================================
-- items (memo / task / idea / log の統合)
-- ============================================================
create table if not exists items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         item_kind not null default 'memo',
  title        text not null default '',
  body         text not null default '',
  status       text,                              -- task: todo/doing/done
  priority     smallint not null default 0,       -- 0なし 1低 2中 3高
  due_at       timestamptz,
  remind_at    timestamptz,
  project_id   uuid references projects(id) on delete set null,
  tree_node_id uuid references tree_nodes(id) on delete set null,
  source       text not null default 'manual',    -- quick_capture / manual
  ai_summary   text,
  scores       jsonb,                              -- idea: {market,feasibility,profitability,future}
  url          text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- 全文検索（simple 構成 — 将来 pgroonga/pg_bigm を検討）
  search_tsv   tsvector generated always as (
                 to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(body,''))
               ) stored
);
create index if not exists idx_items_user on items(user_id);
create index if not exists idx_items_kind on items(user_id, kind);
create index if not exists idx_items_project on items(project_id);
create index if not exists idx_items_tree on items(tree_node_id);
create index if not exists idx_items_due on items(user_id, due_at);
create index if not exists idx_items_search on items using gin(search_tsv);
create trigger trg_items_updated before update on items
  for each row execute function set_updated_at();

-- ============================================================
-- tags / item_tags (N:M)
-- ============================================================
create table if not exists tags (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name    text not null,
  color   text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists idx_tags_user on tags(user_id);

create table if not exists item_tags (
  item_id uuid not null references items(id) on delete cascade,
  tag_id  uuid not null references tags(id) on delete cascade,
  primary key (item_id, tag_id)
);

-- ============================================================
-- attachments
-- ============================================================
create table if not exists attachments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  item_id      uuid not null references items(id) on delete cascade,
  kind         text not null default 'file',  -- file / url / audio / image
  url          text,
  storage_path text,
  mime         text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_attachments_item on attachments(item_id);

-- ============================================================
-- links (ナレッジグラフ: item ⇄ item の有向エッジ)
-- ============================================================
create table if not exists links (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  source_item_id uuid not null references items(id) on delete cascade,
  target_item_id uuid not null references items(id) on delete cascade,
  relation       text not null default 'related',
  created_at     timestamptz not null default now(),
  unique (source_item_id, target_item_id, relation),
  check (source_item_id <> target_item_id)
);
create index if not exists idx_links_user on links(user_id);
create index if not exists idx_links_source on links(source_item_id);
create index if not exists idx_links_target on links(target_item_id);

-- ============================================================
-- timeline_events (人生タイムライン)
-- ============================================================
create table if not exists timeline_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  event_date  date not null,
  item_id     uuid references items(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_timeline_user on timeline_events(user_id, event_date);

-- ============================================================
-- notifications
-- ============================================================
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,           -- overdue / stale_task / stale_idea / ai_suggestion
  title      text not null,
  body       text,
  item_id    uuid references items(id) on delete cascade,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on notifications(user_id, read_at);

-- ============================================================
-- ai_suggestions (知識進化: 類似/関連/再提案)
-- ============================================================
create table if not exists ai_suggestions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,           -- related / revive / new_idea
  payload    jsonb not null default '{}'::jsonb,
  item_id    uuid references items(id) on delete cascade,
  status     text not null default 'open',  -- open / dismissed / accepted
  created_at timestamptz not null default now()
);
create index if not exists idx_suggestions_user on ai_suggestions(user_id, status);

-- ============================================================
-- Row Level Security
--   直接 user_id を持つテーブルは user_id = auth.uid()
--   item 経由（item_tags）は親 items の所有を確認
-- ============================================================
alter table profiles        enable row level security;
alter table projects        enable row level security;
alter table tree_nodes      enable row level security;
alter table items           enable row level security;
alter table tags            enable row level security;
alter table item_tags       enable row level security;
alter table attachments     enable row level security;
alter table links           enable row level security;
alter table timeline_events enable row level security;
alter table notifications   enable row level security;
alter table ai_suggestions  enable row level security;

-- profiles（自分の行のみ）
create policy "profiles_self_select" on profiles for select using (id = auth.uid());
create policy "profiles_self_update" on profiles for update using (id = auth.uid());
create policy "profiles_self_insert" on profiles for insert with check (id = auth.uid());

-- user_id 直結テーブル共通ポリシー
do $$
declare t text;
begin
  foreach t in array array[
    'projects','tree_nodes','items','tags','attachments',
    'links','timeline_events','notifications','ai_suggestions'
  ] loop
    execute format($f$
      create policy "%1$s_owner_all" on %1$s
        for all using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- item_tags（親 item の所有で判定）
create policy "item_tags_owner_all" on item_tags
  for all
  using (exists (select 1 from items i where i.id = item_tags.item_id and i.user_id = auth.uid()))
  with check (exists (select 1 from items i where i.id = item_tags.item_id and i.user_id = auth.uid()));
