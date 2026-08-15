-- Grapes / Bakery Tracker — schema Supabase
-- Esegui in ordine in SQL editor su un progetto Supabase (regione UE consigliata per GDPR).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  bakery_name text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'it')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Storage locations (frigo / freezer / dispensa) — per-owner, personalizzabili
-- ---------------------------------------------------------------------------
create table public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('fridge', 'freezer', 'pantry'))
);

alter table public.storage_locations enable row level security;

create policy "storage_locations: owner all" on public.storage_locations
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Ingredients + stock per location
-- ---------------------------------------------------------------------------
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  unit text not null,
  cost_per_unit numeric(10, 2) not null default 0,
  supplier text,
  created_at timestamptz not null default now()
);

alter table public.ingredients enable row level security;

create policy "ingredients: owner all" on public.ingredients
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table public.ingredient_stock (
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  location_id uuid not null references public.storage_locations (id) on delete cascade,
  quantity numeric(10, 2) not null default 0,
  min_threshold numeric(10, 2) not null default 0,
  primary key (ingredient_id, location_id)
);

alter table public.ingredient_stock enable row level security;

create policy "ingredient_stock: owner all" on public.ingredient_stock
  for all using (
    exists (select 1 from public.ingredients i where i.id = ingredient_id and i.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.ingredients i where i.id = ingredient_id and i.owner_id = auth.uid())
  );

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  from_location_id uuid not null references public.storage_locations (id),
  to_location_id uuid not null references public.storage_locations (id),
  quantity numeric(10, 2) not null,
  moved_at timestamptz not null default now()
);

alter table public.stock_movements enable row level security;

create policy "stock_movements: owner all" on public.stock_movements
  for all using (
    exists (select 1 from public.ingredients i where i.id = ingredient_id and i.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.ingredients i where i.id = ingredient_id and i.owner_id = auth.uid())
  );

-- Sposta una quantità di un ingrediente tra due location in una singola transazione
-- (decremento/incremento stock + riga di log), rispettando la RLS dell'utente chiamante.
create function public.move_stock(
  p_ingredient_id uuid,
  p_from_location uuid,
  p_to_location uuid,
  p_quantity numeric
) returns void as $$
begin
  if p_quantity <= 0 then
    raise exception 'La quantità da spostare deve essere maggiore di zero';
  end if;

  update public.ingredient_stock
    set quantity = quantity - p_quantity
    where ingredient_id = p_ingredient_id and location_id = p_from_location;

  if not found or (select quantity from public.ingredient_stock
                    where ingredient_id = p_ingredient_id and location_id = p_from_location) < 0 then
    raise exception 'Quantità insufficiente nella location di origine';
  end if;

  insert into public.ingredient_stock (ingredient_id, location_id, quantity, min_threshold)
    values (p_ingredient_id, p_to_location, p_quantity, 0)
  on conflict (ingredient_id, location_id)
    do update set quantity = public.ingredient_stock.quantity + excluded.quantity;

  insert into public.stock_movements (ingredient_id, from_location_id, to_location_id, quantity)
    values (p_ingredient_id, p_from_location, p_to_location, p_quantity);
end;
$$ language plpgsql security invoker;

-- ---------------------------------------------------------------------------
-- Componenti/preparazioni riutilizzabili (es. frolla, lemon curd, glassa):
-- hanno un costo/unità calcolato dai propri ingredienti, come una mini-ricetta,
-- e possono poi essere usati come "ingrediente" dentro le ricette.
-- ---------------------------------------------------------------------------
create table public.components (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  unit text not null default 'kg',
  batch_yield numeric(10, 3) not null,
  created_at timestamptz not null default now()
);

alter table public.components enable row level security;

create policy "components: owner all" on public.components
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table public.component_ingredients (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.components (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  quantity numeric(10, 3) not null
);

alter table public.component_ingredients enable row level security;

create policy "component_ingredients: owner all" on public.component_ingredients
  for all using (
    exists (select 1 from public.components c where c.id = component_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.components c where c.id = component_id and c.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Recipes + varianti (dosi multiple) + ingredienti per variante
-- ---------------------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  description text,
  sell_price numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

create policy "recipes: owner all" on public.recipes
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table public.recipe_variants (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  label text not null,
  total_weight numeric(10, 2) not null,
  portions integer not null default 1
);

alter table public.recipe_variants enable row level security;

create policy "recipe_variants: owner all" on public.recipe_variants
  for all using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid())
  );

-- Ogni riga fa riferimento a un ingrediente grezzo OPPURE a un componente/preparazione
-- (mai entrambi), per permettere ricette composte da semi-lavorati con costo proprio.
create table public.recipe_variant_ingredients (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.recipe_variants (id) on delete cascade,
  ingredient_id uuid references public.ingredients (id) on delete restrict,
  component_id uuid references public.components (id) on delete restrict,
  quantity numeric(10, 3) not null,
  constraint recipe_variant_ingredients_source_check check (
    (ingredient_id is not null and component_id is null) or
    (ingredient_id is null and component_id is not null)
  )
);

alter table public.recipe_variant_ingredients enable row level security;

create policy "recipe_variant_ingredients: owner all" on public.recipe_variant_ingredients
  for all using (
    exists (
      select 1 from public.recipe_variants v
      join public.recipes r on r.id = v.recipe_id
      where v.id = variant_id and r.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.recipe_variants v
      join public.recipes r on r.id = v.recipe_id
      where v.id = variant_id and r.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Stock dei prodotti finiti (componenti e varianti di ricetta), per location —
-- popolato dal completamento dei task del piano di lavoro (vedi più sotto).
-- ---------------------------------------------------------------------------
create table public.component_stock (
  component_id uuid not null references public.components (id) on delete cascade,
  location_id uuid not null references public.storage_locations (id) on delete cascade,
  quantity numeric(10, 3) not null default 0,
  min_threshold numeric(10, 3) not null default 0,
  primary key (component_id, location_id)
);

alter table public.component_stock enable row level security;

create policy "component_stock: owner all" on public.component_stock
  for all using (
    exists (select 1 from public.components c where c.id = component_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.components c where c.id = component_id and c.owner_id = auth.uid())
  );

create table public.recipe_variant_stock (
  variant_id uuid not null references public.recipe_variants (id) on delete cascade,
  location_id uuid not null references public.storage_locations (id) on delete cascade,
  quantity numeric(10, 3) not null default 0,
  min_threshold numeric(10, 3) not null default 0,
  primary key (variant_id, location_id)
);

alter table public.recipe_variant_stock enable row level security;

create policy "recipe_variant_stock: owner all" on public.recipe_variant_stock
  for all using (
    exists (
      select 1 from public.recipe_variants v
      join public.recipes r on r.id = v.recipe_id
      where v.id = variant_id and r.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.recipe_variants v
      join public.recipes r on r.id = v.recipe_id
      where v.id = variant_id and r.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  customer_name text not null,
  cake_name text not null,
  recipe_id uuid references public.recipes (id) on delete set null,
  variant_id uuid references public.recipe_variants (id) on delete set null,
  quantity integer not null default 1,
  pickup_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'ready', 'delivered', 'cancelled')),
  total_price numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "orders: owner all" on public.orders
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index orders_pickup_date_idx on public.orders (owner_id, pickup_date);

-- ---------------------------------------------------------------------------
-- Cost history (per i grafici di Cost Analysis)
-- ---------------------------------------------------------------------------
create table public.cost_history (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  cost numeric(10, 2) not null,
  recorded_at timestamptz not null default now()
);

alter table public.cost_history enable row level security;

create policy "cost_history: owner all" on public.cost_history
  for all using (
    exists (select 1 from public.ingredients i where i.id = ingredient_id and i.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.ingredients i where i.id = ingredient_id and i.owner_id = auth.uid())
  );

-- Ogni variazione di cost_per_unit viene registrata automaticamente per lo storico.
create function public.log_ingredient_cost_change() returns trigger as $$
begin
  if tg_op = 'INSERT' or new.cost_per_unit is distinct from old.cost_per_unit then
    insert into public.cost_history (ingredient_id, cost) values (new.id, new.cost_per_unit);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger ingredients_log_cost
  after insert or update of cost_per_unit on public.ingredients
  for each row execute function public.log_ingredient_cost_change();

-- ---------------------------------------------------------------------------
-- Piano di lavoro: task giornalieri, opzionalmente legati alla produzione di
-- un componente o di una variante di ricetta.
-- ---------------------------------------------------------------------------
create table public.work_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  task_date date not null,
  title text not null,
  notes text,
  production_type text check (production_type in ('component', 'recipe_variant')),
  component_id uuid references public.components (id) on delete cascade,
  variant_id uuid references public.recipe_variants (id) on delete cascade,
  quantity numeric(10, 3),
  target_location_id uuid references public.storage_locations (id),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint work_plan_tasks_production_check check (
    (production_type is null and component_id is null and variant_id is null)
    or (production_type = 'component' and component_id is not null and variant_id is null
        and quantity is not null and target_location_id is not null)
    or (production_type = 'recipe_variant' and variant_id is not null and component_id is null
        and quantity is not null and target_location_id is not null)
  )
);

alter table public.work_plan_tasks enable row level security;

create policy "work_plan_tasks: owner all" on public.work_plan_tasks
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index work_plan_tasks_date_idx on public.work_plan_tasks (owner_id, task_date);

-- Completa un task di produzione: scala gli ingredienti/componenti grezzi usati
-- (dalla location di origine indicata) e aggiunge il prodotto finito allo stock
-- (nella location di destinazione salvata sul task), in un'unica transazione.
create function public.complete_work_plan_task(
  p_task_id uuid,
  p_source_location_id uuid
) returns void as $$
declare
  v_task record;
  v_scale numeric;
  v_line record;
begin
  select * into v_task from public.work_plan_tasks where id = p_task_id;
  if v_task is null then
    raise exception 'Task non trovato';
  end if;
  if v_task.status = 'completed' then
    raise exception 'Task già completato';
  end if;

  if v_task.production_type = 'component' then
    select (v_task.quantity / batch_yield) into v_scale from public.components where id = v_task.component_id;

    for v_line in
      select ingredient_id, quantity from public.component_ingredients where component_id = v_task.component_id
    loop
      update public.ingredient_stock
        set quantity = quantity - (v_line.quantity * v_scale)
        where ingredient_id = v_line.ingredient_id and location_id = p_source_location_id;
      if not found or (select quantity from public.ingredient_stock
                        where ingredient_id = v_line.ingredient_id and location_id = p_source_location_id) < 0 then
        raise exception 'Quantità insufficiente di un ingrediente nella location di origine';
      end if;
    end loop;

    insert into public.component_stock (component_id, location_id, quantity, min_threshold)
      values (v_task.component_id, v_task.target_location_id, v_task.quantity, 0)
    on conflict (component_id, location_id)
      do update set quantity = public.component_stock.quantity + excluded.quantity;

  elsif v_task.production_type = 'recipe_variant' then
    for v_line in
      select ingredient_id, component_id, quantity from public.recipe_variant_ingredients where variant_id = v_task.variant_id
    loop
      if v_line.ingredient_id is not null then
        update public.ingredient_stock
          set quantity = quantity - (v_line.quantity * v_task.quantity)
          where ingredient_id = v_line.ingredient_id and location_id = p_source_location_id;
        if not found or (select quantity from public.ingredient_stock
                          where ingredient_id = v_line.ingredient_id and location_id = p_source_location_id) < 0 then
          raise exception 'Quantità insufficiente di un ingrediente nella location di origine';
        end if;
      else
        update public.component_stock
          set quantity = quantity - (v_line.quantity * v_task.quantity)
          where component_id = v_line.component_id and location_id = p_source_location_id;
        if not found or (select quantity from public.component_stock
                          where component_id = v_line.component_id and location_id = p_source_location_id) < 0 then
          raise exception 'Quantità insufficiente di un componente nella location di origine';
        end if;
      end if;
    end loop;

    insert into public.recipe_variant_stock (variant_id, location_id, quantity, min_threshold)
      values (v_task.variant_id, v_task.target_location_id, v_task.quantity, 0)
    on conflict (variant_id, location_id)
      do update set quantity = public.recipe_variant_stock.quantity + excluded.quantity;
  end if;

  update public.work_plan_tasks set status = 'completed', completed_at = now() where id = p_task_id;
end;
$$ language plpgsql security invoker;

-- ---------------------------------------------------------------------------
-- Acquisti: ordini di materie prime ai fornitori. Alla ricezione, lo stock
-- degli ingredienti viene aggiornato automaticamente nelle location indicate.
-- ---------------------------------------------------------------------------
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  supplier text not null,
  status text not null default 'ordered' check (status in ('ordered', 'arrived', 'cancelled')),
  order_date date not null default current_date,
  expected_date date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.purchase_orders enable row level security;

create policy "purchase_orders: owner all" on public.purchase_orders
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  quantity numeric(10, 3) not null,
  location_id uuid not null references public.storage_locations (id),
  unit_cost numeric(10, 2)
);

alter table public.purchase_order_items enable row level security;

create policy "purchase_order_items: owner all" on public.purchase_order_items
  for all using (
    exists (select 1 from public.purchase_orders o where o.id = purchase_order_id and o.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.purchase_orders o where o.id = purchase_order_id and o.owner_id = auth.uid())
  );

-- Segna un ordine fornitore come arrivato: aggiunge le quantità allo stock
-- ingredienti nelle location indicate e, se presente, aggiorna il costo/unità
-- (che a sua volta alimenta lo storico costi tramite il trigger già esistente).
create function public.receive_purchase_order(p_order_id uuid) returns void as $$
declare
  v_status text;
  v_item record;
begin
  select status into v_status from public.purchase_orders where id = p_order_id;
  if v_status is null then
    raise exception 'Ordine non trovato';
  end if;
  if v_status = 'arrived' then
    raise exception 'Ordine già ricevuto';
  end if;

  for v_item in select * from public.purchase_order_items where purchase_order_id = p_order_id loop
    insert into public.ingredient_stock (ingredient_id, location_id, quantity, min_threshold)
      values (v_item.ingredient_id, v_item.location_id, v_item.quantity, 0)
    on conflict (ingredient_id, location_id)
      do update set quantity = public.ingredient_stock.quantity + excluded.quantity;

    if v_item.unit_cost is not null then
      update public.ingredients set cost_per_unit = v_item.unit_cost where id = v_item.ingredient_id;
    end if;
  end loop;

  update public.purchase_orders set status = 'arrived' where id = p_order_id;
end;
$$ language plpgsql security invoker;

-- ---------------------------------------------------------------------------
-- Onboarding: alla creazione di un utente, crea il profilo e le 3 location di default.
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, bakery_name, preferred_language)
  values (new.id, new.raw_user_meta_data ->> 'bakery_name', 'en');

  insert into public.storage_locations (owner_id, name, type) values
    (new.id, 'Fridge', 'fridge'),
    (new.id, 'Freezer', 'freezer'),
    (new.id, 'Pantry', 'pantry');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
