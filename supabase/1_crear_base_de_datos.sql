-- PASO 1: pega TODO este texto en Supabase > SQL Editor y pulsa "Run".
create table if not exists profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text, rol text not null default 'vendedor' check (rol in ('admin','vendedor')),
  creado timestamptz default now());
create table if not exists productos(
  id uuid primary key default gen_random_uuid(),
  nombre text not null, precio numeric(12,2) not null check (precio>=0),
  stock integer not null default 0 check (stock>=0), activo boolean not null default true);
create table if not exists ventas(
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid references profiles(id), total numeric(12,2) not null,
  creado timestamptz default now());
create table if not exists venta_items(
  id uuid primary key default gen_random_uuid(),
  venta_id uuid references ventas(id) on delete cascade, producto_id uuid references productos(id),
  nombre text, precio numeric(12,2), cantidad integer not null);

create or replace function es_admin() returns boolean language sql security definer set search_path=public as
$$ select exists(select 1 from profiles where id=auth.uid() and rol='admin') $$;

create or replace function crear_perfil() returns trigger language plpgsql security definer set search_path=public as
$$ begin insert into profiles(id,nombre) values(new.id,coalesce(new.raw_user_meta_data->>'nombre',new.email)) on conflict do nothing; return new; end $$;
drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users for each row execute function crear_perfil();

create or replace function registrar_venta(items jsonb) returns uuid language plpgsql security definer set search_path=public as
$$ declare v uuid; it jsonb; p productos; t numeric:=0;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  insert into ventas(vendedor_id,total) values(auth.uid(),0) returning id into v;
  for it in select * from jsonb_array_elements(items) loop
    select * into p from productos where id=(it->>'producto_id')::uuid and activo for update;
    if p.id is null or p.stock<(it->>'cantidad')::int then raise exception 'Sin stock suficiente de %', coalesce(p.nombre,'un producto'); end if;
    update productos set stock=stock-(it->>'cantidad')::int where id=p.id;
    insert into venta_items(venta_id,producto_id,nombre,precio,cantidad) values(v,p.id,p.nombre,p.precio,(it->>'cantidad')::int);
    t:=t+p.precio*(it->>'cantidad')::int;
  end loop;
  update ventas set total=t where id=v; return v;
end $$;

alter table profiles enable row level security; alter table productos enable row level security;
alter table ventas enable row level security; alter table venta_items enable row level security;
create policy "ver perfiles" on profiles for select to authenticated using (true);
create policy "admin edita perfiles" on profiles for update to authenticated using (es_admin());
create policy "ver productos" on productos for select to authenticated using (true);
create policy "admin gestiona productos" on productos for all to authenticated using (es_admin()) with check (es_admin());
create policy "ver ventas" on ventas for select to authenticated using (es_admin() or vendedor_id=auth.uid());
create policy "ver detalle" on venta_items for select to authenticated using (es_admin() or exists(select 1 from ventas v where v.id=venta_id and v.vendedor_id=auth.uid()));
