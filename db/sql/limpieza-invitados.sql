-- Limpieza de invitados caducados.
--
-- Se ejecuta UNA VEZ en Supabase → SQL Editor, con la extensión pg_cron
-- activada (Database → Extensions → pg_cron). No va en las migraciones de
-- Drizzle porque toca el esquema `auth`, que es de Supabase.
--
-- Programa un job que corre al principio de cada hora y borra los usuarios
-- anónimos creados hace más de 4 días. Sus categorías y movimientos caen con
-- ellos por la clave ajena `on delete cascade` de `user_id`.
--
-- Los 4 días tienen que coincidir con VIDA_INVITADO_DIAS en
-- src/types/cuenta.types.ts, que es lo que se le enseña al invitado.
--
-- Volver a ejecutarlo no duplica nada: `cron.schedule` con el mismo nombre
-- sustituye el job existente.

select cron.schedule(
  'limpieza-invitados',
  '0 * * * *',
  $$
    delete from auth.users
    where is_anonymous
      and created_at < now() - interval '4 days'
  $$
);
