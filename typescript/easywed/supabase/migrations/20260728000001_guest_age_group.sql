-- Guests get an age group alongside their dietary tags: "adult" (the implicit
-- default), the "0-3" / "3-6" child brackets offered in the UI, or any bracket
-- the user typed ("6-12"). Catering and seating both need to tell children from
-- adults, and the dietary array is the wrong place for it - a guest has exactly
-- one age group.
--
-- NULL means adult, so every pre-existing row is already correct and no
-- backfill is needed. The client mirrors this (see `toStoredAgeGroup` in
-- src/lib/ageGroup.ts) and never writes the literal 'adult'.
--
-- Like `guests_dietary_shape`, the constraint is a bounded-length rule rather
-- than an allowlist: the set of brackets is user-editable, so pinning it here
-- would just mean another migration every time someone needs "12-18".

alter table public.guests add column age_group text;

alter table public.guests
  add constraint guests_age_group_shape check (
    age_group is null or char_length(age_group) between 1 and 24
  );
