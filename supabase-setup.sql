create table if not exists public.catalog_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.catalog_admins enable row level security;
grant select on public.catalog_admins to authenticated;

drop policy if exists "Admins can see their own access" on public.catalog_admins;
create policy "Admins can see their own access"
  on public.catalog_admins for select
  to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.catalog_phones (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  price numeric(12, 2) check (price is null or price >= 0),
  currency text check (currency is null or char_length(currency) <= 8),
  image_path text not null,
  created_at timestamptz not null default now()
);

alter table public.catalog_phones enable row level security;
alter table public.catalog_phones
  add column if not exists image_text jsonb;
grant select on public.catalog_phones to anon, authenticated;
grant insert, update, delete on public.catalog_phones to authenticated;

drop policy if exists "Anyone can view the public catalog" on public.catalog_phones;
create policy "Anyone can view the public catalog"
  on public.catalog_phones for select
  to anon, authenticated
  using (true);

drop policy if exists "Only catalog admins can add phones" on public.catalog_phones;
create policy "Only catalog admins can add phones"
  on public.catalog_phones for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Only catalog admins can update phones" on public.catalog_phones;
create policy "Only catalog admins can update phones"
  on public.catalog_phones for update
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Only catalog admins can delete phones" on public.catalog_phones;
create policy "Only catalog admins can delete phones"
  on public.catalog_phones for delete
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  );

create table if not exists public.catalog_settings (
  singleton boolean primary key default true check (singleton),
  initialized boolean not null default false
);

insert into public.catalog_settings (singleton, initialized)
values (true, false)
on conflict (singleton) do nothing;

alter table public.catalog_settings enable row level security;
grant select on public.catalog_settings to anon, authenticated;
grant update on public.catalog_settings to authenticated;

drop policy if exists "Anyone can check catalog initialization" on public.catalog_settings;
create policy "Anyone can check catalog initialization"
  on public.catalog_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Only catalog admins can initialize the catalog" on public.catalog_settings;
create policy "Only catalog admins can initialize the catalog"
  on public.catalog_settings for update
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'phones-images',
  'phones-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Anyone can view catalog photos" on storage.objects;
create policy "Anyone can view catalog photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'phones-images');

drop policy if exists "Only catalog admins can upload photos" on storage.objects;
create policy "Only catalog admins can upload photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'phones-images'
    and exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Only catalog admins can delete photos" on storage.objects;
create policy "Only catalog admins can delete photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'phones-images'
    and exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  );

create table if not exists public.catalog_phone_costs (
  phone_id uuid primary key references public.catalog_phones (id) on delete cascade,
  cost numeric(12, 2) check (cost is null or cost >= 0),
  distributor text check (distributor is null or char_length(distributor) <= 100),
  updated_at timestamptz not null default now()
);

alter table public.catalog_phone_costs alter column cost drop not null;
alter table public.catalog_phone_costs
  add column if not exists distributor text
  check (distributor is null or char_length(distributor) <= 100);

alter table public.catalog_phone_costs enable row level security;
revoke all on public.catalog_phone_costs from anon, public;
grant select, insert, update, delete on public.catalog_phone_costs to authenticated;

drop policy if exists "Only catalog admins can view phone costs" on public.catalog_phone_costs;
create policy "Only catalog admins can view phone costs"
  on public.catalog_phone_costs for select
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Only catalog admins can add phone costs" on public.catalog_phone_costs;
create policy "Only catalog admins can add phone costs"
  on public.catalog_phone_costs for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Only catalog admins can update phone costs" on public.catalog_phone_costs;
create policy "Only catalog admins can update phone costs"
  on public.catalog_phone_costs for update
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  );

drop policy if exists "Only catalog admins can delete phone costs" on public.catalog_phone_costs;
create policy "Only catalog admins can delete phone costs"
  on public.catalog_phone_costs for delete
  to authenticated
  using (
    exists (
      select 1
      from public.catalog_admins
      where user_id = (select auth.uid())
    )
  );
