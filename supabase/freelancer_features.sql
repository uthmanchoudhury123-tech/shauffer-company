-- ============================================================
-- Freelancer Feature Tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- Driver Vehicles
create table if not exists driver_vehicles (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references auth.users(id) on delete cascade,
  make        text not null,
  model       text not null,
  year        int,
  color       text,
  reg_plate   text not null,
  vehicle_type text not null default 'saloon',
  is_primary  boolean not null default false,
  created_at  timestamptz default now()
);
alter table driver_vehicles enable row level security;
drop policy if exists "drivers_own_vehicles" on driver_vehicles;
create policy "drivers_own_vehicles" on driver_vehicles
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- Driver Documents
create table if not exists driver_documents (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references auth.users(id) on delete cascade,
  doc_type    text not null,
  file_name   text not null,
  file_url    text,
  expiry_date date,
  status      text not null default 'pending',
  uploaded_at timestamptz default now()
);
alter table driver_documents enable row level security;
drop policy if exists "drivers_own_documents" on driver_documents;
create policy "drivers_own_documents" on driver_documents
  using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- Freelancer Notifications
create table if not exists freelancer_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text,
  type       text not null default 'general',
  read       boolean not null default false,
  link       text,
  created_at timestamptz default now()
);
alter table freelancer_notifications enable row level security;
drop policy if exists "users_own_notifications_select" on freelancer_notifications;
drop policy if exists "users_own_notifications_update" on freelancer_notifications;
create policy "users_own_notifications_select" on freelancer_notifications
  for select using (user_id = auth.uid());
create policy "users_own_notifications_update" on freelancer_notifications
  for update using (user_id = auth.uid());
-- Allow server-side inserts (service role bypasses RLS automatically)

-- Chat Rooms
create table if not exists chat_rooms (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid references freelancer_jobs(id) on delete set null,
  poster_id  uuid not null references auth.users(id) on delete cascade,
  driver_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (job_id)
);
alter table chat_rooms enable row level security;
drop policy if exists "chat_room_members_select" on chat_rooms;
drop policy if exists "chat_room_members_insert" on chat_rooms;
create policy "chat_room_members_select" on chat_rooms
  for select using (poster_id = auth.uid() or driver_id = auth.uid());
create policy "chat_room_members_insert" on chat_rooms
  for insert with check (poster_id = auth.uid() or driver_id = auth.uid());

-- Chat Messages
create table if not exists chat_messages (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references chat_rooms(id) on delete cascade,
  sender_id      uuid not null references auth.users(id) on delete cascade,
  body           text not null,
  read_by_other  boolean not null default false,
  created_at     timestamptz default now()
);
alter table chat_messages enable row level security;
drop policy if exists "chat_message_read" on chat_messages;
drop policy if exists "chat_message_send" on chat_messages;
create policy "chat_message_read" on chat_messages
  for select using (
    room_id in (
      select id from chat_rooms
      where poster_id = auth.uid() or driver_id = auth.uid()
    )
  );
create policy "chat_message_send" on chat_messages
  for insert with check (
    sender_id = auth.uid() and
    room_id in (
      select id from chat_rooms
      where poster_id = auth.uid() or driver_id = auth.uid()
    )
  );
