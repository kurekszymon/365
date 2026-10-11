-- Provision a venue (tenant) and hand it to its owner's account.
--
-- `tenants` has no INSERT policy and `tenant_members` must never grow one, so
-- this runs as `postgres` and nowhere else. The owner signs up on the apex
-- first; this script never creates an auth user.
--
--   psql "$DB_URL" \
--     -v slug=bagatelka -v name='Sala Bagatelka' -v owner_email=owner@example.com \
--     [-v open_linking=true] [-v tagline='...'] [-v primary_color='#7c3f58'] \
--     [-v accent_color='#e8c3b0'] [-v logo_url='https://...'] [-v locale=en] \
--     -f scripts/provision-venue.sql
--
-- All of it is one transaction: a typo'd email or a taken slug leaves nothing
-- behind. Re-running for an existing slug fails on the unique constraint -
-- branding changes afterwards are a plain `update public.tenants`.
--
-- The database is only half of it. The subdomain still needs a Cloudflare
-- Pages custom domain for <slug>.easywed.app before anyone can reach the CRM.

\set ON_ERROR_STOP 1

\if :{?slug}
\else
  do $$ begin raise exception 'missing -v slug=...'; end $$;
\endif
\if :{?name}
\else
  do $$ begin raise exception 'missing -v name=...'; end $$;
\endif
\if :{?owner_email}
\else
  do $$ begin raise exception 'missing -v owner_email=...'; end $$;
\endif

-- Optional, '' meaning "leave the column default". Every value still has to
-- pass the CHECK constraints on `tenants` - the colour and logo regexes are the
-- CSS-injection guard, so they are not re-validated here.
\if :{?open_linking}
\else
  \set open_linking false
\endif
\if :{?locale}
\else
  \set locale pl
\endif
\if :{?tagline}
\else
  \set tagline ''
\endif
\if :{?primary_color}
\else
  \set primary_color ''
\endif
\if :{?accent_color}
\else
  \set accent_color ''
\endif
\if :{?logo_url}
\else
  \set logo_url ''
\endif

begin;

-- psql variables do not interpolate inside a DO body, so the inputs ride in as
-- transaction-local settings.
select
  set_config('provision.slug', :'slug', true),
  set_config('provision.name', :'name', true),
  set_config('provision.owner_email', :'owner_email', true),
  set_config('provision.open_linking', :'open_linking', true),
  set_config('provision.locale', :'locale', true),
  set_config('provision.tagline', :'tagline', true),
  set_config('provision.primary_color', :'primary_color', true),
  set_config('provision.accent_color', :'accent_color', true),
  set_config('provision.logo_url', :'logo_url', true)
\gset discard_

do $$
declare
  _owner uuid;
  _existing text;
  _tenant uuid;
begin
  select id into _owner
  from auth.users
  where lower(email) = lower(current_setting('provision.owner_email'));

  if _owner is null then
    raise exception 'no account for %: the owner has to sign up on easywed.app first',
      current_setting('provision.owner_email');
  end if;

  -- tenant_members_one_per_user would refuse this anyway; checked first so the
  -- message names the venue instead of an index. A 'customer' row counts: a
  -- couple who later opens a venue has to leave the old one (or be removed
  -- from its roster) before they can own one.
  select t.slug || ' (' || m.role || ')' into _existing
  from public.tenant_members m
  join public.tenants t on t.id = m.tenant_id
  where m.user_id = _owner;

  if _existing is not null then
    raise exception '% already belongs to %', current_setting('provision.owner_email'), _existing;
  end if;

  insert into public.tenants (
    slug, name, locale, open_linking,
    tagline, primary_color, accent_color, logo_url
  ) values (
    lower(current_setting('provision.slug')),
    btrim(current_setting('provision.name')),
    current_setting('provision.locale'),
    current_setting('provision.open_linking')::boolean,
    nullif(btrim(current_setting('provision.tagline')), ''),
    nullif(lower(current_setting('provision.primary_color')), ''),
    nullif(lower(current_setting('provision.accent_color')), ''),
    nullif(current_setting('provision.logo_url'), '')
  )
  returning id into _tenant;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (_tenant, _owner, 'owner');
end
$$;

select t.id, t.slug, t.name, t.locale, t.open_linking, u.email as owner
from public.tenants t
join public.tenant_members m on m.tenant_id = t.id and m.role = 'owner'
join auth.users u on u.id = m.user_id
where t.slug = lower(:'slug');

commit;
