-- Run this in the Supabase SQL Editor if doctor_profiles does not yet have a crm_number column.
ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS crm_number text;
