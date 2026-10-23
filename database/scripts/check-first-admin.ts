import { Result } from "@/lib/result";
import { drizzlePostgreClient } from "../clients/postgre";

// TODO(better-drizzle): con 0.3.0 esto puede pasar a `client.users.exists(...)`.
export const checkFirstAdmin = async (): Promise<Result<boolean, Error>> => {
  try {
    const admin = await drizzlePostgreClient.query.users.findFirst({
      columns: { id: true },
      where: { role: "admin" },
    });
    return Result.success(admin !== undefined);
  } catch (error) {
    return Result.failure(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
};
