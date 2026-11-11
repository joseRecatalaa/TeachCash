-- La API REST de Supabase, sin permisos de escritura (auditoría run-2).
--
-- Las migraciones 0004/0005 y 0007/0008 dejaron solo políticas de LECTURA, y
-- con RLS activo eso ya impide escribir. Esto es la segunda red: si algún día
-- se añade por error una política de escritura, sin el permiso de tabla sigue
-- sin poder escribirse nada por la API. La app no lo nota: se conecta con un
-- rol propio (DATABASE_URL), no con anon ni authenticated.
--
-- Supabase da de serie TODOS los permisos de las tablas nuevas de `public` a
-- estos roles; por eso también se quitan para las que se creen en adelante.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated;
