create table public.invitation_orders (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  contact_name  text        not null,
  contact_email text        not null,
  contact_phone text,
  quantity      int         not null check (quantity > 0),
  design_hash   text,
  notes         text,
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
