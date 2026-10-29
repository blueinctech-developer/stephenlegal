import "server-only";
import postgres from "postgres";

/**
 * One Postgres connection pool per server process. Production uses a hosted
 * Postgres (DATABASE_URL); local development uses the embedded Postgres from
 * `npm run db:local`.
 */
const url = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

function connect(): postgres.Sql {
	if (!url) throw new Error("DATABASE_URL is not set. Run `npm run db:local` for a local database, or see README.md.");
	const local = /@(127\.0\.0\.1|localhost)[:/]/.test(url);
	return postgres(url, {
		max: 5,
		ssl: local ? false : "require",
		idle_timeout: 20,
		onnotice: () => {},
	});
}

export function db(): postgres.Sql {
	globalForDb.sql ??= connect();
	return globalForDb.sql;
}
