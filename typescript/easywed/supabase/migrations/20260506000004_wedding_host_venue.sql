-- Link a wedding to its hosting venue. Set when a couple starts a wedding
-- from a venue hall via start_wedding_from_hall(); null for self-organised
-- weddings. on delete set null lets a venue be removed without dropping
-- its couples' weddings.
alter table public.weddings
  add column host_venue_id uuid references public.venues(id) on delete set null;

create index weddings_host_venue_id_idx on public.weddings (host_venue_id);
