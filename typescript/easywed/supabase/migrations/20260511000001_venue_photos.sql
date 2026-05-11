-- venue_photos: per-venue image assets stored in the 'venue-photos' Storage
-- bucket at path {venue_id}/{uuid}.{ext}. display_order controls the sort
-- order in catalog and dashboard views (default 0; drag-reorder can be added
-- later without a schema change).

-- Storage bucket: public for reads; write is gated by storage RLS policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'venue-photos',
  'venue-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create table public.venue_photos (
  id             uuid        primary key default gen_random_uuid(),
  venue_id       uuid        not null references public.venues(id) on delete cascade,
  storage_path   text        not null,
  display_order  integer     not null default 0,
  created_at     timestamptz not null default now()
);

create index venue_photos_venue_id_idx on public.venue_photos (venue_id);
create index venue_photos_order_idx    on public.venue_photos (venue_id, display_order);

alter table public.venue_photos enable row level security;

-- Table RLS: all authenticated users can read; only the venue owner can write.
create policy "authenticated can read venue_photos"
  on public.venue_photos for select
  to authenticated
  using (true);

create policy "venue owners insert venue_photos"
  on public.venue_photos for insert
  with check (
    public.is_venue_owner(venue_id)
    and storage_path like (venue_id::text || '/%')
  );

create policy "venue owners delete venue_photos"
  on public.venue_photos for delete
  using (public.is_venue_owner(venue_id));

-- Storage RLS: path format is {venue_id}/{filename}.
-- storage.foldername(name)[1] extracts the first path segment (the venue_id)
-- and casts it to uuid for is_venue_owner(), reusing the existing helper.

create policy "public can read venue photos"
  on storage.objects for select
  using (bucket_id = 'venue-photos');

-- The regex guard runs before the ::uuid cast so a malformed path segment
-- results in a clean denial rather than a server error.
create policy "venue owners can upload photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'venue-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_venue_owner((storage.foldername(name))[1]::uuid)
  );

create policy "venue owners can delete photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'venue-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_venue_owner((storage.foldername(name))[1]::uuid)
  );
