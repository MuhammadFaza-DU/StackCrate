-- ============================================================================
-- StackCrate — Initial Schema (PRD Section 5)
-- Tables: profiles, categories, assets, favorites, downloads
-- Enums: asset_type, asset_status, user_role
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================================
-- Enums
-- ============================================================================

create type asset_type as enum ('audio', 'video');
create type asset_status as enum ('draft', 'published');
create type user_role as enum ('admin', 'user');

-- ============================================================================
-- profiles — mirrors auth.users with role + display name
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  role user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- categories — admin-managed taxonomy
-- ============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index categories_sort_idx on public.categories(sort_order);

-- ============================================================================
-- assets — the catalog (PRD 1.6: audio + video for v1)
-- ============================================================================

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  asset_type asset_type not null,
  status asset_status not null default 'draft',
  -- R2 storage
  file_key text not null unique,         -- path inside R2 bucket
  file_size_bytes bigint not null,
  mime_type text not null,
  duration_seconds numeric,
  -- Public download URL (presigned or public)
  download_url text,
  thumbnail_url text,
  -- Metadata
  tags text[] not null default '{}',
  download_count int not null default 0,
  view_count int not null default 0,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index assets_status_idx on public.assets(status);
create index assets_category_idx on public.assets(category_id);
create index assets_type_idx on public.assets(asset_type);
create index assets_created_idx on public.assets(created_at desc);
create index assets_downloads_idx on public.assets(download_count desc);

-- Full-text search index (Postgres FTS)
-- to_tsvector is STABLE, so we wrap in an IMMUTABLE function for index eligibility
create or replace function public.asset_search_vector(title text, description text, tags text[])
returns tsvector
language sql
immutable
as $$
  select to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || array_to_string(coalesce(tags, '{}'), ' '));
$$;

create index assets_search_idx on public.assets
  using gin (public.asset_search_vector(title, description, tags));

-- ============================================================================
-- favorites — per-user bookmarks (PRD 3.4)
-- ============================================================================

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, asset_id)
);

create index favorites_user_idx on public.favorites(user_id);
create index favorites_asset_idx on public.favorites(asset_id);

-- ============================================================================
-- downloads — rate-limit + tracking log (PRD 1.8 + 3.3)
-- 10 downloads per IP per hour; 429 if exceeded
-- ============================================================================

create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  ip_address inet not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index downloads_ip_created_idx on public.downloads(ip_address, created_at desc);
create index downloads_asset_idx on public.downloads(asset_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.assets enable row level security;
alter table public.favorites enable row level security;
alter table public.downloads enable row level security;

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles policies
create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- categories policies (public read, admin write)
create policy "categories_select_all" on public.categories
  for select using (true);

create policy "categories_admin_write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- assets policies
-- Public can read only published assets
create policy "assets_select_published" on public.assets
  for select using (status = 'published' or public.is_admin());

-- Only admins can write
create policy "assets_admin_write" on public.assets
  for all using (public.is_admin()) with check (public.is_admin());

-- favorites policies (user-scoped)
create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);

create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);

create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);

-- downloads policies
-- Anyone (even anon) can insert a download log — needed for rate-limit by IP
create policy "downloads_insert_any" on public.downloads
  for insert with check (true);

-- Only admins can view download logs
create policy "downloads_admin_select" on public.downloads
  for select using (public.is_admin());

-- ============================================================================
-- Updated_at trigger
-- ============================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger assets_touch
  before update on public.assets
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Seed: default categories (admin can edit/delete later)
-- ============================================================================

insert into public.categories (slug, name, description, icon, sort_order) values
  ('intro', 'Intro', 'Opening sequences and title cards', '🎬', 1),
  ('outro', 'Outro', 'End screens and credits sequences', '🎞️', 2),
  ('transition', 'Transition', 'Scene transitions and wipes', '✨', 3),
  ('overlay', 'Overlay', 'Visual overlays and effects', '🌟', 4),
  ('sound-effect', 'Sound Effect', 'One-shot audio effects', '🔊', 5),
  ('music', 'Music', 'Background music and themes', '🎵', 6),
  ('ambient', 'Ambient', 'Atmospheric and ambient audio', '🌿', 7),
  ('stock-video', 'Stock Video', 'B-roll and stock footage', '📹', 8);

-- ============================================================================
-- Storage bucket placeholder note
-- The R2 bucket 'stackcrate-assets' lives in Cloudflare (not Supabase Storage).
-- Bucket public access is configured in Cloudflare dashboard.
-- ============================================================================