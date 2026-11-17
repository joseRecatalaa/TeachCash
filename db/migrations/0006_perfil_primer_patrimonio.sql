-- La base ya no es "el inicial": es el patrimonio sin los movimientos (lo que
-- escribe la persona menos lo anotado). Se renombra para que el nombre no mienta.
ALTER TABLE "profiles" RENAME COLUMN "initial_net_worth" TO "net_worth_without_movements";--> statement-breakpoint
-- Se añade sin NOT NULL, se rellena con la base que ya había (hasta hoy era el
-- único patrimonio que se había elegido) y solo entonces se exige. Un NOT NULL
-- directo falla en cuanto exista una fila.
ALTER TABLE "profiles" ADD COLUMN "first_net_worth" integer;--> statement-breakpoint
UPDATE "profiles" SET "first_net_worth" = "net_worth_without_movements";--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "first_net_worth" SET NOT NULL;
