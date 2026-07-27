-- Dietary tags become free-form. The old `guests_dietary_values` CHECK pinned
-- `dietary` to a five-value allowlist (vegetarian/vegan/gluten-free/halal/
-- kosher); that closed set can't express real needs ("bez laktozy", allergies).
-- Replace it with a shape rule - a bounded count of bounded-length tags - so the
-- column stays safe from unbounded input while allowing arbitrary tags.
--
-- The client is the source of truth for canonicalizing tags (see
-- `canonicalizeDietary` in src/lib/dietary.ts); this mirrors only the hard
-- limits (MAX_DIETARY_TAGS / MAX_DIETARY_TAG_LENGTH). Any pre-existing rows
-- satisfy the shape rule, so no data migration is needed.
--
-- A CHECK constraint can't contain a subquery, so the per-element validation
-- lives in an immutable helper that unnests the array.

create function public.dietary_tags_valid(tags text[])
returns boolean
language sql
immutable
as $$
  select coalesce(array_length(tags, 1), 0) <= 12
     and not exists (
       select 1 from unnest(tags) as tag
       where char_length(tag) < 1 or char_length(tag) > 24
     );
$$;

alter table public.guests drop constraint guests_dietary_values;

alter table public.guests
  add constraint guests_dietary_shape check (public.dietary_tags_valid(dietary));
