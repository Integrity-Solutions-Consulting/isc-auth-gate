ALTER TABLE "apikeys" ADD COLUMN "organization_id" text;--> statement-breakpoint
CREATE INDEX "apikeys_organization_id_idx" ON "apikeys" USING btree ("organization_id");