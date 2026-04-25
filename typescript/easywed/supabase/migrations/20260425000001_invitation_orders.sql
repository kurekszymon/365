-- CHECK constraints cannot contain subqueries; use an immutable function instead.
create or replace function public.guest_names_valid(names text[])
  returns boolean
  language sql
  immutable
as $$
  select cardinality(names) <= 500
    and not exists (
      select 1 from unnest(names) n where char_length(n) > 200
    );
$$;

create table public.invitation_orders (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  contact_name  text        not null check (char_length(contact_name) between 1 and 200),
  contact_email text        not null check (char_length(contact_email) between 1 and 320),
  contact_phone text                 check (contact_phone is null or char_length(contact_phone) <= 30),
  quantity      int         not null check (quantity between 1 and 1000),
  design_hash   text                 check (design_hash is null or char_length(design_hash) <= 65535),
  guest_names   text[]               check (guest_names is null or public.guest_names_valid(guest_names)),
  notes         text                 check (notes is null or char_length(notes) <= 4000),
  wedding_id    uuid        references public.weddings(id) on delete set null,
  status        text        not null default 'new'
                check (status in ('new', 'contacted', 'confirmed', 'printed', 'delivered'))
);

alter table public.invitation_orders enable row level security;

-- Anyone (including anonymous visitors) can submit an order.
-- WITH CHECK forces status = 'new' so callers cannot pre-set a different status.
-- SELECT and UPDATE are intentionally omitted: the operator manages orders via the
-- Supabase dashboard, which uses the service role key and bypasses RLS entirely.
create policy "anyone_can_insert_new_order"
  on public.invitation_orders
  for insert
  to anon, authenticated
  with check (status = 'new');
