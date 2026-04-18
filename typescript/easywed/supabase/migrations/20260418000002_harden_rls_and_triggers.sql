-- Prevent privilege escalation via weddings UPDATE: editors (and owners)
-- cannot change owner_id through a plain UPDATE. Transferring ownership,
-- if/when needed, must go through a dedicated SECURITY DEFINER function.
revoke update (owner_id) on public.weddings from authenticated;
