create table if not exists public.phones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  price numeric(12, 2) not null check (price >= 0),
  image_path text not null,
  created_at timestamptz not null default now()
);

alter table public.phones enable row level security;

grant select, insert, update, delete on public.phones to authenticated;

create policy "Users can view their own phones"
  on public.phones for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can add their own phones"
  on public.phones for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own phones"
  on public.phones for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own phones"
  on public.phones for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'phones-images',
  'phones-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "Users can view their own phone photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'phones-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can upload their own phone photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'phones-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update their own phone photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'phones-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'phones-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own phone photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'phones-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
