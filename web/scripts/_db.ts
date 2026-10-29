/** Database connection for command-line scripts (the app uses lib/db.ts). */
import postgres from "postgres";

export function connect(): postgres.Sql {
	const url = process.env.DATABASE_URL;
	if (!url) {
		console.error("DATABASE_URL is not set. Add it to .env.local, or start a local database with `npm run db:local`.");
		process.exit(1);
	}
	const local = /@(127\.0\.0\.1|localhost)[:/]/.test(url);
	return postgres(url, { max: 4, ssl: local ? false : "require", onnotice: () => {} });
}
