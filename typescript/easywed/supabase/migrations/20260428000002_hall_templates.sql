-- hall_templates: reusable hall layouts created by venue/planner accounts.
-- Couples can browse public templates and apply them to their wedding.
create table public.hall_templates (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  description text,
  hall_preset text not null check (hall_preset in ('rectangle', 'l-shape', 'u-shape', 'custom')),
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hall_templates_creator_id_idx on public.hall_templates (creator_id);
create index hall_templates_is_public_idx on public.hall_templates (is_public) where is_public = true;

create trigger hall_templates_set_updated_at
  before update on public.hall_templates
  for each row execute function public.set_updated_at();

-- Pre-positioned tables within a template.
create table public.hall_template_tables (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.hall_templates(id) on delete cascade,
  name text not null default '',
  shape text not null check (shape in ('round', 'rectangular')),
  capacity integer not null check (capacity > 0),
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  pos_x numeric not null,
  pos_y numeric not null,
  rotation smallint not null default 0 check (rotation in (0, 90))
);

create index hall_template_tables_template_id_idx on public.hall_template_tables (template_id);

-- Pre-positioned fixtures (stage, DJ booth, bar, etc.) within a template.
create table public.hall_template_fixtures (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.hall_templates(id) on delete cascade,
  name text not null default '',
  shape text not null check (shape in ('rectangle', 'circle', 'rounded')),
  width numeric not null check (width > 0),
  height numeric not null check (height > 0),
  pos_x numeric not null,
  pos_y numeric not null,
  rotation smallint not null default 0 check (rotation in (0, 90))
);

create index hall_template_fixtures_template_id_idx on public.hall_template_fixtures (template_id);

-- RLS -------------------------------------------------------------------------

alter table public.hall_templates enable row level security;
alter table public.hall_template_tables enable row level security;
alter table public.hall_template_fixtures enable row level security;

-- Templates: public ones are readable by everyone; owners manage their own.
create policy "anyone can view public hall templates"
  on public.hall_templates for select
  using (is_public = true or creator_id = auth.uid());

create policy "creators can insert hall templates"
  on public.hall_templates for insert
  with check (
    creator_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and user_type in ('venue', 'planner')
    )
  );

create policy "creators can update their hall templates"
  on public.hall_templates for update
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

create policy "creators can delete their hall templates"
  on public.hall_templates for delete
  using (creator_id = auth.uid());

-- Template tables: follow parent template visibility.
create policy "anyone can view template tables of public templates"
  on public.hall_template_tables for select
  using (
    exists (
      select 1 from public.hall_templates t
      where t.id = template_id and (t.is_public = true or t.creator_id = auth.uid())
    )
  );

create policy "creators can insert template tables"
  on public.hall_template_tables for insert
  with check (
    exists (
      select 1 from public.hall_templates t
      where t.id = template_id and t.creator_id = auth.uid()
    )
  );

create policy "creators can update template tables"
  on public.hall_template_tables for update
  using (
    exists (
      select 1 from public.hall_templates t
      where t.id = template_id and t.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.hall_templates t
      where t.id = template_id and t.creator_id = auth.uid()
    )
  );

create policy "creators can delete template tables"
  on public.hall_template_tables for delete
  using (
    exists (
      select 1 from public.hall_templates t
      where t.id = template_id and t.creator_id = auth.uid()
    )
  );

-- Template fixtures: follow parent template visibility.
create policy "anyone can view template fixtures of public templates"
  on public.hall_template_fixtures for select
  using (
    exists (
      select 1 from public.hall_templates t
      where t.id = template_id and (t.is_public = true or t.creator_id = auth.uid())
    )
  );

create policy "creators can insert template fixtures"
  on public.hall_template_fixtures for insert
  with check (
    exists (
      select 1 from public.hall_templates t
      where t.id = template_id and t.creator_id = auth.uid()
    )
  );

create policy "creators can update template fixtures"
  on public.hall_template_fixtures for update
  using (
    exists (
      select 1 from public.hall_templates t
      where t.id = template_id and t.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.hall_templates t
      where t.id = template_id and t.creator_id = auth.uid()
    )
  );

create policy "creators can delete template fixtures"
  on public.hall_template_fixtures for delete
  using (
    exists (
      select 1 from public.hall_templates t
      where t.id = template_id and t.creator_id = auth.uid()
    )
  );
