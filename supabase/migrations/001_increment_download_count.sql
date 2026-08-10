-- Bump download_count when an asset is downloaded.
create or replace function public.increment_download_count(p_asset_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.assets
  set download_count = download_count + 1,
      updated_at = now()
  where id = p_asset_id;
$$;

-- Allow app roles to execute it (service role bypasses RLS anyway).
grant execute on function public.increment_download_count(uuid) to authenticated, anon, service_role;