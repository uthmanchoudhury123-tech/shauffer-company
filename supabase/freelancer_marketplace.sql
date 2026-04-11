-- ============================================================
-- Freelancer Marketplace
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Driver Wallets (one per driver)
create table if not exists public.driver_wallets (
  driver_id   uuid primary key references public.drivers(id) on delete cascade,
  balance     numeric(10, 2) not null default 0.00,
  updated_at  timestamptz default now()
);

alter table public.driver_wallets enable row level security;

create policy "driver owns wallet"
  on public.driver_wallets for all
  using (driver_id = auth.uid());

-- 2. Wallet Transactions
create table if not exists public.wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  driver_id     uuid not null references public.drivers(id) on delete cascade,
  amount        numeric(10, 2) not null,  -- positive = credit, negative = debit
  type          text not null check (type in ('topup','withdrawal','escrow_hold','escrow_release','escrow_refund','payment_received')),
  description   text,
  reference_id  uuid,  -- links to freelancer_jobs.id if relevant
  created_at    timestamptz default now()
);

alter table public.wallet_transactions enable row level security;

create policy "driver owns transactions"
  on public.wallet_transactions for select
  using (driver_id = auth.uid());

-- 3. Freelancer Jobs (jobs posted by drivers for other drivers to take)
create table if not exists public.freelancer_jobs (
  id                  uuid primary key default gen_random_uuid(),
  posted_by           uuid not null references public.drivers(id) on delete cascade,
  pickup_address      text not null,
  dropoff_address     text not null,
  job_date            date not null,
  job_time            time not null,
  price               numeric(10, 2) not null,  -- amount paid to doing driver
  preferred_car_type  text,  -- general car type (saloon, suv etc)
  required_car_make   text,  -- specific make e.g. Mercedes
  required_car_model  text,  -- specific model e.g. S Class
  notes               text,
  status              text not null default 'open'
                      check (status in ('open','filled','in_progress','completed','cancelled')),
  accepted_driver_id  uuid references public.drivers(id) on delete set null,
  escrow_held         boolean not null default false,
  funds_released      boolean not null default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.freelancer_jobs enable row level security;

-- Anyone (authenticated driver) can view open jobs
create policy "drivers can view open jobs"
  on public.freelancer_jobs for select
  using (auth.uid() is not null);

-- Only poster can insert
create policy "driver can post job"
  on public.freelancer_jobs for insert
  with check (posted_by = auth.uid());

-- Poster can update their own jobs
create policy "poster can update own job"
  on public.freelancer_jobs for update
  using (posted_by = auth.uid());

-- 4. Job Applications
create table if not exists public.job_applications (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.freelancer_jobs(id) on delete cascade,
  applicant_id  uuid not null references public.drivers(id) on delete cascade,
  message       text,
  status        text not null default 'pending'
                check (status in ('pending','accepted','rejected')),
  created_at    timestamptz default now(),
  unique (job_id, applicant_id)
);

alter table public.job_applications enable row level security;

-- Applicant can see their own applications
create policy "applicant sees own applications"
  on public.job_applications for select
  using (applicant_id = auth.uid());

-- Job poster can see all applications for their jobs
create policy "poster sees applications for their jobs"
  on public.job_applications for select
  using (
    job_id in (
      select id from public.freelancer_jobs where posted_by = auth.uid()
    )
  );

-- Driver can apply (insert)
create policy "driver can apply"
  on public.job_applications for insert
  with check (applicant_id = auth.uid());

-- Poster can update application status (accept/reject)
create policy "poster can update application"
  on public.job_applications for update
  using (
    job_id in (
      select id from public.freelancer_jobs where posted_by = auth.uid()
    )
  );

-- 5. Auto-create wallet when driver record is created
create or replace function public.create_driver_wallet()
returns trigger language plpgsql security definer as $$
begin
  insert into public.driver_wallets (driver_id, balance)
  values (new.id, 0.00)
  on conflict (driver_id) do nothing;
  return new;
end;
$$;

create trigger on_driver_created_create_wallet
  after insert on public.drivers
  for each row execute procedure public.create_driver_wallet();

-- Create wallets for existing drivers who don't have one
insert into public.driver_wallets (driver_id, balance)
select id, 0.00 from public.drivers
on conflict (driver_id) do nothing;
