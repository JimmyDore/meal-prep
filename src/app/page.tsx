import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  let dbStatus: { connected: boolean; serverTime: string; recipeCount: number } | null = null;
  let dbError: string | null = null;

  try {
    const timeResult = await db.execute<{ current_time: string }>(
      sql`SELECT NOW() AS current_time`,
    );
    const countResult = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*)::text AS count FROM recipes`,
    );

    dbStatus = {
      connected: true,
      serverTime: timeResult[0].current_time,
      recipeCount: Number.parseInt(countResult[0].count, 10),
    };
  } catch (error) {
    dbError = error instanceof Error ? error.message : "Unknown database error";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-8 px-8 py-16">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Meal Prep
        </h1>

        {dbStatus ? (
          <div className="flex flex-col gap-4 rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950">
            <p className="text-lg font-medium text-green-800 dark:text-green-200">
              Database connected successfully
            </p>
            <dl className="flex flex-col gap-2 text-sm text-green-700 dark:text-green-300">
              <div className="flex gap-2">
                <dt className="font-medium">Server time:</dt>
                <dd>{dbStatus.serverTime}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">Recipes in database:</dt>
                <dd>{dbStatus.recipeCount}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
            <p className="text-lg font-medium text-red-800 dark:text-red-200">
              Database connection failed
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">{dbError}</p>
          </div>
        )}
      </main>
    </div>
  );
}
