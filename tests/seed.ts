import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { seed, reset } from "drizzle-seed";
import { env } from "@/env/server";
import * as schema from "@/database/schema";

const seedPool = new Pool({
  host: env.BETTER_AUTH_DATABASE_HOST,
  port: env.BETTER_AUTH_DATABASE_PORT,
  user: env.BETTER_AUTH_DATABASE_USER,
  password: env.BETTER_AUTH_DATABASE_PASS,
  database: env.BETTER_AUTH_DATABASE_NAME,
});

const db = drizzle({ client: seedPool });

function randomNotionistAvatar(): string {
  const DICEBEAR_BASE_URL = "https://api.dicebear.com/9.x/notionists/svg";
  const seed = crypto.randomUUID();
  const params = new URLSearchParams({ seed });
  return `${DICEBEAR_BASE_URL}?${params.toString()}`;
}

async function seedTestData(count: number = 10) {
  console.log(`🌱 Seeding ${count} users...`);

  await seed(db, schema, { count, seed: 1234 }).refine((ctx) => ({
    users: {
      columns: {
        name: ctx.fullName(),
        email: ctx.email(),
        image: ctx.valuesFromArray({
          values: Array.from({ length: 100 }, () => randomNotionistAvatar()),
        }),
        banned: ctx.boolean(),
        banReason: ctx.loremIpsum(),
        emailVerified: ctx.boolean(),
        role: ctx.valuesFromArray({ values: ["admin", "moderator", "user"] }),
      },
    },
  }));

  console.log(`✅ Seeded ${count} users`);
}

async function resetTestData() {
  console.log("🔄 Resetting database...");
  await reset(db, schema);
  console.log("✅ Reset complete");
}

async function close() {
  await seedPool.end();
}

export { seedTestData, resetTestData, close };

if (import.meta.main) {
  console.log("Starting seed script...");

  const args = process.argv.slice(2);
  const command = args[0] || "seed";
  const count = parseInt(args[1]) || 20;

  if (command === "seed") {
    await seedTestData(count);
  } else if (command === "reset") {
    await resetTestData();
  }

  await close();
}
