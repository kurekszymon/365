create table public.invitation_orders (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  contact_name  text        not null,
  contact_email text        not null,
  contact_phone text,
  quantity      int         not null check (quantity > 0),
  design_hash   text,
  notes         text,
  wedding_id    uuid        references public.weddings(id),
  status        text        not null default 'new'
                check (status in ('new', 'contacted', 'confirmed', 'printed', 'delivered'))
);

alter table public.invitation_orders enable row level security;

-- Anyone (including anonymous visitors) can submit an order
create policy "anyone_can_submit_order"
  on public.invitation_orders
  for insert
  to anon, authenticated
  with check (true);

-- Authenticated users can view all orders (operator dashboard use)
create policy "authenticated_can_view_orders"
  on public.invitation_orders
  for select
  to authenticated
  using (true);

-- Authenticated users can update order status
create policy "authenticated_can_update_order_status"
  on public.invitation_orders
  for update
  to authenticated
  using (true)
  with check (true);
