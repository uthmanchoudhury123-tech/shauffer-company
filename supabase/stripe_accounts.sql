-- Stripe account linkage per driver
create table if not exists stripe_accounts (
  driver_id           uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id  text,
  stripe_connect_id   text,
  connect_onboarded   boolean not null default false,
  created_at          timestamptz default now()
);

alter table stripe_accounts enable row level security;
drop policy if exists "own_stripe_account" on stripe_accounts;
create policy "own_stripe_account" on stripe_accounts
  for select using (driver_id = auth.uid());
