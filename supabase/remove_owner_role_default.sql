-- =========================================================
-- Amna's Edit - Owner role hardening
-- Run ONCE in the Supabase SQL Editor.
--
-- Purpose:
-- Prevent future profile rows from automatically receiving
-- the privileged 'owner' role.
--
-- This does NOT change or delete the existing owner account.
-- =========================================================

begin;

alter table public.profiles
  alter column role drop default;

-- Keep the current allowed-role rule explicit.
-- This is safe to run even if a role check already exists,
-- because the migration only needs to remove the default.

commit;
