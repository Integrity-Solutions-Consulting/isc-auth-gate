CREATE TABLE "oauth_client_organizations" (
	"id" text PRIMARY KEY,
	"client_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "oauthClientOrganizations_clientId_organizationId_uidx" ON "oauth_client_organizations" ("client_id","organization_id");--> statement-breakpoint
CREATE INDEX "oauthClientOrganizations_organizationId_idx" ON "oauth_client_organizations" ("organization_id");--> statement-breakpoint
ALTER TABLE "oauth_client_organizations" ADD CONSTRAINT "oauth_client_organizations_IWlVVn3dgMPP_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_client_organizations" ADD CONSTRAINT "oauth_client_organizations_jBmOyRDgx4m7_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;