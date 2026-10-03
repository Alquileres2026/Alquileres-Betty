-- PASO 3: cambia el correo por el del usuario que creaste en Authentication y pulsa "Run".
insert into profiles(id,nombre,rol)
select id,'Administrador','admin' from auth.users where email='TU-CORREO@ejemplo.com'
on conflict (id) do update set rol='admin';
