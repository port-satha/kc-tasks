-- ============================================
-- Member Profile System — Schema Changes
-- ============================================

-- Add new profile fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS team text,
  ADD COLUMN IF NOT EXISTS squad text,
  ADD COLUMN IF NOT EXISTS avatar_color text,
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Also add nickname + position to members table for denormalized display
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS position text,
  ADD COLUMN IF NOT EXISTS team text,
  ADD COLUMN IF NOT EXISTS squad text,
  ADD COLUMN IF NOT EXISTS avatar_color text;

-- Create storage bucket for profile avatars (run this manually in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Update existing profiles to set profile_completed = true if they have a full_name
-- (so existing users don't get blocked)
UPDATE public.profiles
SET profile_completed = true
WHERE full_name IS NOT NULL AND full_name != '';
