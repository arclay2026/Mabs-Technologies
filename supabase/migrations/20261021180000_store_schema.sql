-- =====================================================================
-- Mabs Technologies — store schema
-- ---------------------------------------------------------------------
-- Catalogue (categories, brands, products), store settings, and orders.
-- Shoppers can read the active catalogue; they can't write any table
-- directly. Orders are created only through place_order(), which checks
-- stock and recalculates every price and fee on the server.
-- =====================================================================

-- ---------- catalogue ----------
create table public.categories (
  id    text primary key,               -- e.g. 'computers'
  name  text not null,
  blurb text,
  sort  int  not null default 0
);

create table public.brands (
  id          text primary key,         -- e.g. 'samsung'
  name        text not null unique,     -- matches products.brand display name
  logo_url    text,                     -- full-colour logo (featured brands strip)
  logo_height int,                      -- display height in px, tuned per logo
  sort        int not null default 0
);

create table public.products (
  id          text primary key,         -- URL slug, e.g. 'apple-iphone-15'
  name        text not null,
  brand_id    text not null references public.brands (id),
  category_id text not null references public.categories (id),
  type        text not null,            -- 'Laptop', 'Smartphone', …
  price       numeric(12,2) not null check (price >= 0),          -- rand, VAT inclusive
  was_price   numeric(12,2) check (was_price is null or was_price > price),
  stock       int  not null default 0 check (stock >= 0),
  featured    boolean not null default false,
  badge       text,                     -- 'New', 'Gaming', 'Hot'
  summary     text,
  specs       jsonb not null default '[]'::jsonb,                 -- [["Memory","8 GB RAM"], …]
  image_url   text,                     -- product photo; null = drawn placeholder
  art         jsonb,                    -- placeholder illustration settings
  active      boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index products_category_idx on public.products (category_id) where active;
create index products_brand_idx    on public.products (brand_id) where active;

-- single row of shop-wide settings
create table public.store_settings (
  id          boolean primary key default true check (id),
  courier_fee numeric(12,2) not null default 120,
  free_over   numeric(12,2) not null default 1500,
  collect     boolean not null default true
);
insert into public.store_settings default values;

-- ---------- orders ----------
create type public.order_status as enum (
  'placed', 'confirmed', 'out_for_delivery', 'ready_for_collection', 'delivered', 'collected', 'cancelled'
);

create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  number         text not null unique,                 -- e.g. 'MB261021-4821'
  user_id        uuid references auth.users (id) on delete set null,  -- null for guest checkout
  status         public.order_status not null default 'placed',
  fulfilment     text not null check (fulfilment in ('delivery', 'collect')),
  payment_method text not null check (payment_method in ('eft', 'on_receipt')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  customer_name  text not null,
  customer_phone text not null,
  customer_email text not null,
  address        jsonb,                                -- {street, suburb, city, province, postal}
  notes          text,
  subtotal       numeric(12,2) not null,
  delivery_fee   numeric(12,2) not null,
  total          numeric(12,2) not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);

create table public.order_items (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  product_id text references public.products (id) on delete set null,
  name       text not null,                            -- copied at order time
  unit_price numeric(12,2) not null,
  qty        int not null check (qty > 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- keep updated_at current
create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger orders_touch   before update on public.orders   for each row execute function public.touch_updated_at();

-- ---------- row-level security ----------
alter table public.categories     enable row level security;
alter table public.brands         enable row level security;
alter table public.products       enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;

create policy "catalogue is public" on public.categories     for select to anon, authenticated using (true);
create policy "brands are public"   on public.brands         for select to anon, authenticated using (true);
create policy "active products are public" on public.products for select to anon, authenticated using (active);
create policy "settings are public" on public.store_settings for select to anon, authenticated using (true);

-- signed-in customers see only their own orders; nobody can write directly
create policy "customers read own orders" on public.orders for select to authenticated
  using (user_id = (select auth.uid()));
create policy "customers read own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

-- ---------- placing an order ----------
-- p_items: [{"id": "apple-iphone-15", "qty": 1}, …]
-- p_customer: {"name": …, "phone": …, "email": …}
-- p_address: {"street", "suburb", "city", "province", "postal"} (delivery only)
-- Returns the saved order as JSON. Raises:
--   EMPTY_CART, BAD_ITEM, UNKNOWN_PRODUCT:<id>, OUT_OF_STOCK:<id>,
--   MISSING_DETAILS, MISSING_ADDRESS, BAD_FULFILMENT, BAD_PAYMENT
create function public.place_order(
  p_items      jsonb,
  p_customer   jsonb,
  p_fulfilment text,
  p_payment    text,
  p_address    jsonb default null,
  p_notes      text  default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s          public.store_settings;
  line       record;
  p          public.products;
  v_subtotal numeric(12,2) := 0;
  v_fee      numeric(12,2);
  v_order    public.orders;
  v_number   text;
  v_items    jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if p_fulfilment not in ('delivery', 'collect') then raise exception 'BAD_FULFILMENT'; end if;
  if p_payment not in ('eft', 'on_receipt') then raise exception 'BAD_PAYMENT'; end if;
  if coalesce(trim(p_customer->>'name'), '') = '' or coalesce(trim(p_customer->>'phone'), '') = ''
     or coalesce(p_customer->>'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'MISSING_DETAILS';
  end if;
  if p_fulfilment = 'delivery' and (
       coalesce(trim(p_address->>'street'), '') = '' or coalesce(trim(p_address->>'city'), '') = ''
    or coalesce(trim(p_address->>'province'), '') = '' or coalesce(p_address->>'postal', '') !~ '^[0-9]{4}$') then
    raise exception 'MISSING_ADDRESS';
  end if;

  select * into s from public.store_settings limit 1;
  if p_fulfilment = 'collect' and not s.collect then raise exception 'BAD_FULFILMENT'; end if;

  -- price every line from the database (never from the browser) and lock stock rows
  for line in
    select x.id, sum(x.qty)::int as qty
    from jsonb_to_recordset(p_items) as x(id text, qty int)
    group by x.id
    order by x.id
  loop
    if line.id is null or line.qty is null or line.qty < 1 or line.qty > 50 then raise exception 'BAD_ITEM'; end if;
    select * into p from public.products where id = line.id and active for update;
    if not found then raise exception 'UNKNOWN_PRODUCT:%', line.id; end if;
    if p.stock < line.qty then raise exception 'OUT_OF_STOCK:%', line.id; end if;
    v_subtotal := v_subtotal + p.price * line.qty;
    v_items := v_items || jsonb_build_object('id', p.id, 'name', p.name, 'price', p.price, 'qty', line.qty);
  end loop;

  v_fee := case when p_fulfilment = 'collect' or v_subtotal >= s.free_over then 0 else s.courier_fee end;

  -- order number like MB261021-4821; retry the rare clash
  loop
    v_number := 'MB' || to_char(now() at time zone 'Africa/Johannesburg', 'YYMMDD') || '-' ||
                lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.orders where number = v_number);
  end loop;

  insert into public.orders (number, user_id, fulfilment, payment_method, customer_name, customer_phone,
                             customer_email, address, notes, subtotal, delivery_fee, total)
  values (v_number, auth.uid(), p_fulfilment, p_payment, trim(p_customer->>'name'), trim(p_customer->>'phone'),
          lower(trim(p_customer->>'email')), case when p_fulfilment = 'delivery' then p_address end,
          nullif(trim(coalesce(p_notes, '')), ''), v_subtotal, v_fee, v_subtotal + v_fee)
  returning * into v_order;

  insert into public.order_items (order_id, product_id, name, unit_price, qty)
  select v_order.id, i->>'id', i->>'name', (i->>'price')::numeric, (i->>'qty')::int
  from jsonb_array_elements(v_items) as i;

  update public.products pr set stock = pr.stock - (i->>'qty')::int
  from jsonb_array_elements(v_items) as i
  where pr.id = i->>'id';

  return jsonb_build_object(
    'number', v_order.number, 'placed', v_order.created_at, 'status', v_order.status,
    'fulfilment', v_order.fulfilment, 'payment', v_order.payment_method,
    'subtotal', v_order.subtotal, 'fee', v_order.delivery_fee, 'total', v_order.total,
    'items', v_items);
end $$;

revoke all on function public.place_order(jsonb, jsonb, text, text, jsonb, text) from public;
grant execute on function public.place_order(jsonb, jsonb, text, text, jsonb, text) to anon, authenticated;
