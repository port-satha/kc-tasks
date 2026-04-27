-- ============================================================
-- Profile completion fields (chunk 2 of UX/UI rollout)
-- ============================================================
-- Adds two optional self-completed fields used by the Profile Gate
-- modal. The other fields the brief lists already exist in the schema:
--   nickname     ✓ exists
--   full_name    ✓ exists
--   position     ✓ exists  (UI label = "Position / job title")
--   avatar_url   ✓ exists  (UI = profile photo)
--   team         ✓ exists  (admin-set)
--   squad        ✓ exists  (UI label = "Brand")
--   manager_id   ✓ exists  (UI label = "Reports to")
--   role         ✓ exists  (UI label = "System role")
--   profile_completed ✓ exists  (boolean flag the gate flips on save)
--
-- Chapter is not stored — derived from `team` via TEAM_TO_CHAPTER in code.

alter table public.profiles
  add column if not exists start_date date,
  add column if not exists line_id   text;
