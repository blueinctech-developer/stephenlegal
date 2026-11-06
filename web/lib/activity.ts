/** A record of changes made in the admin, shown on the dashboard. */
import "server-only";
import type { AdminUser } from "./auth";
import { db } from "./db";

/** Never fails the change itself: a missing log line is better than a lost edit. */
export async function logActivity(user: AdminUser, action: string, target = ""): Promise<void> {
	try {
		await db()`insert into activity (user_id, user_name, action, target) values (${user.id}, ${user.name}, ${action.slice(0, 120)}, ${target.slice(0, 300)})`;
	} catch (err) {
		console.warn(`[activity] not recorded: ${(err as Error).message}`);
	}
}
