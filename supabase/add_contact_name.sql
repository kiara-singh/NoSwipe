-- Optional: run in Supabase SQL editor if `profiles.contact_name` is missing.
alter table public.profiles
  add column if not exists contact_name text;
