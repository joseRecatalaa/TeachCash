CREATE TABLE "hero_items" (
	"user_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"price_paid" integer NOT NULL,
	"equipped" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hero_items_user_id_item_id_pk" PRIMARY KEY("user_id","item_id"),
	CONSTRAINT "hero_items_price" CHECK ("hero_items"."price_paid" >= 0)
);
--> statement-breakpoint
ALTER TABLE "hero_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hero_items" ADD CONSTRAINT "hero_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "hero_items_solo_suyo" ON "hero_items" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);