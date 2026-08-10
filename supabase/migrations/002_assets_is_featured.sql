-- Feature flag: mark assets that appear in the landing hero card.
alter table public.assets
  add column if not exists is_featured boolean not null default false;

-- Partial index so the landing's featured=true query stays cheap.
create index if not exists assets_is_featured_idx
  on public.assets (id)
  where is_featured = true;
