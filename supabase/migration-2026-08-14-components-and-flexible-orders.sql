-- Migrazione per progetti Supabase creati con la versione precedente di schema.sql.
-- Esegui questo script una sola volta nell'SQL editor del tuo progetto.

-- 1) Componenti/preparazioni riutilizzabili (es. frolla, lemon curd, glassa):
--    hanno un costo/unità calcolato dai propri ingredienti, come una mini-ricetta.
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

-- 2) recipe_variant_ingredients: ogni riga fa riferimento a un ingrediente grezzo
--    OPPURE a un componente (mai entrambi).
alter table public.recipe_variant_ingredients
  alter column ingredient_id drop not null,
  add column component_id uuid references public.components (id) on delete restrict,
  add constraint recipe_variant_ingredients_source_check check (
    (ingredient_id is not null and component_id is null) or
    (ingredient_id is null and component_id is not null)
  );

-- 3) orders: nome torta libero (obbligatorio) + ricetta collegata opzionale
alter table public.orders add column cake_name text;

update public.orders o
set cake_name = r.name
from public.recipes r
where r.id = o.recipe_id and o.cake_name is null;

alter table public.orders alter column cake_name set not null;

alter table public.orders drop constraint orders_recipe_id_fkey;
alter table public.orders alter column recipe_id drop not null;
alter table public.orders add constraint orders_recipe_id_fkey
  foreign key (recipe_id) references public.recipes (id) on delete set null;
