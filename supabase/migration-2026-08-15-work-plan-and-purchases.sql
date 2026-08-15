-- Migrazione: stock prodotti finiti, piano di lavoro e acquisti fornitori.
-- Esegui questo script una sola volta nell'SQL editor del tuo progetto,
-- dopo la migrazione del 2026-08-14 (componenti e ordini con nome libero).

-- ---------------------------------------------------------------------------
-- Stock dei prodotti finiti (componenti e varianti di ricetta), per location.
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
