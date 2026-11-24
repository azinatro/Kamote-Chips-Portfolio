create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tracking_code uuid,
  created_at timestamptz not null default now(),
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  contact text not null check (char_length(contact) between 1 and 120),
  flavor text not null check (flavor in ('Cheese', 'Sour Cream', 'BBQ', 'Mixed flavors')),
  size text not null check (size in ('Small', 'Medium', 'Large')),
  quantity integer not null check (quantity between 1 and 1000),
  total_amount integer generated always as (
    (case size when 'Small' then 15 when 'Medium' then 30 when 'Large' then 50 end) * quantity
  ) stored,
  notes text check (notes is null or char_length(notes) <= 1000),
  receipt_path text not null,
  status text not null default 'needs_review'
);

-- Keep this constraint updateable for projects that already have the orders table.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('needs_review', 'paid', 'preparing', 'ready', 'delivered', 'picked_up', 'cancelled'));

alter table public.orders add column if not exists tracking_code uuid;
update public.orders set tracking_code = gen_random_uuid() where tracking_code is null;
alter table public.orders alter column tracking_code set not null;
create unique index if not exists orders_tracking_code_uidx on public.orders (tracking_code);

alter table public.orders enable row level security;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;

create or replace function public.is_kamote_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt()->>'email', '')) = lower('ADMIN_EMAIL_HERE');
$$;

grant execute on function public.is_kamote_admin() to authenticated;

drop policy if exists "Public can submit preorders" on public.orders;
create policy "Public can submit preorders"
  on public.orders for insert to anon, authenticated
  with check (status = 'needs_review');

drop policy if exists "Admin can view preorders" on public.orders;
create policy "Admin can view preorders"
  on public.orders for select to authenticated
  using (public.is_kamote_admin());

drop policy if exists "Admin can update preorder status" on public.orders;
create policy "Admin can update preorder status"
  on public.orders for update to authenticated
  using (public.is_kamote_admin())
  with check (public.is_kamote_admin());

create or replace function public.get_preorder_status(p_tracking_code uuid)
returns table (
  status text,
  created_at timestamptz,
  flavor text,
  size text,
  quantity integer,
  total_amount integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.status, o.created_at, o.flavor, o.size, o.quantity, o.total_amount
  from public.orders as o
  where o.tracking_code = p_tracking_code
  limit 1;
$$;

revoke all on function public.get_preorder_status(uuid) from public;
grant execute on function public.get_preorder_status(uuid) to anon, authenticated;

-- Allow a customer who knows the name and phone number on the preorder to
-- replace the latest matching order's tracking code without exposing order data.
create or replace function public.recover_preorder_tracking_code(
  p_customer_name text,
  p_contact text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_tracking_code uuid := gen_random_uuid();
begin
  if nullif(pg_catalog.btrim(p_customer_name), '') is null
    or nullif(pg_catalog.btrim(p_contact), '') is null then
    return null;
  end if;

  select o.id into v_order_id
  from public.orders as o
  where lower(pg_catalog.btrim(o.customer_name)) = lower(pg_catalog.btrim(p_customer_name))
    and pg_catalog.regexp_replace(o.contact, '[^0-9]', '', 'g') =
        pg_catalog.regexp_replace(p_contact, '[^0-9]', '', 'g')
  order by o.created_at desc
  limit 1
  for update;

  if v_order_id is null then
    return null;
  end if;

  update public.orders
  set tracking_code = v_tracking_code
  where id = v_order_id;

  return v_tracking_code;
end;
$$;

revoke all on function public.recover_preorder_tracking_code(text, text) from public;
grant execute on function public.recover_preorder_tracking_code(text, text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-receipts',
  'order-receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can upload payment receipts" on storage.objects;
create policy "Public can upload payment receipts"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'order-receipts');

drop policy if exists "Admin can view payment receipts" on storage.objects;
create policy "Admin can view payment receipts"
  on storage.objects for select to authenticated
  using (bucket_id = 'order-receipts' and public.is_kamote_admin());

drop policy if exists "Admin can delete payment receipts" on storage.objects;
create policy "Admin can delete payment receipts"
  on storage.objects for delete to authenticated
  using (bucket_id = 'order-receipts' and public.is_kamote_admin());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;
