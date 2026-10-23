CREATE TABLE "hero_progress" (
	"user_id" uuid NOT NULL,
	"level_id" text NOT NULL,
	"stars" smallint DEFAULT 0 NOT NULL,
	"best_score" smallint DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hero_progress_user_id_level_id_pk" PRIMARY KEY("user_id","level_id"),
	CONSTRAINT "hero_progress_stars" CHECK ("hero_progress"."stars" between 0 and 3)
);
--> statement-breakpoint
ALTER TABLE "hero_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hero_progress" ADD CONSTRAINT "hero_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "hero_progress_solo_suyo" ON "hero_progress" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);