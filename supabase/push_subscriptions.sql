-- Push subscriptions table
-- Run this in: Supabase Dashboard → SQL Editor

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references public.drivers(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now()
);

-- Only the driver who owns the subscription can read/insert/delete it
alter table public.push_subscriptions enable row level security;

create policy "driver owns subscription"
  on public.push_subscriptions
  for all
  using (driver_id = auth.uid());
