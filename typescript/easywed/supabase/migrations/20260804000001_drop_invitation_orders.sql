-- Drop invitation_orders: the leftover of the removed invitation designer /
-- print-ordering flow. Nothing in the app reads or writes it - the table only
-- ever had INSERT policies, and the client code that submitted orders is gone.
--
-- public.guest_names_valid() existed solely to back the guest_names CHECK on
-- this table, so it goes with it.

drop table if exists public.invitation_orders;

drop function if exists public.guest_names_valid(text[]);
