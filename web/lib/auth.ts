import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";

export type Role = "admin" | "editor";
export type AdminUser = { id: number; email: string; name: string; role: Role; authorId: number | null };

const COOKIE = "sl_admin";
const SESSION_DAYS = 30;

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

/** Starts a session: only a hash of the token is stored, the token itself lives in an HttpOnly cookie. */
export async function startSession(userId: number): Promise<void> {
	const token = randomBytes(32).toString("base64url");
	const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
	const sql = db();
	await sql`insert into sessions (id, user_id, expires_at) values (${digest(token)}, ${userId}, ${expires})`;
	await sql`update users set last_login_at = now() where id = ${userId}`;
	// Tidy up: expired sessions are useless.
	await sql`delete from sessions where expires_at < now()`;
	(await cookies()).set(COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		expires,
	});
}

export async function endSession(): Promise<void> {
	const jar = await cookies();
	const token = jar.get(COOKIE)?.value;
	if (token) await db()`delete from sessions where id = ${digest(token)}`;
	jar.delete(COOKIE);
}

/** Signs a user out everywhere (after a password change, for example), except the current session. */
export async function endOtherSessions(userId: number): Promise<void> {
	const token = (await cookies()).get(COOKIE)?.value;
	await db()`delete from sessions where user_id = ${userId} and id <> ${token ? digest(token) : ""}`;
}

export const currentUser = cache(async (): Promise<AdminUser | null> => {
	const token = (await cookies()).get(COOKIE)?.value;
	if (!token) return null;
	const [u] = await db()<{ id: number; email: string; name: string; role: Role; author_id: number | null }[]>`
		select u.id, u.email, u.name, u.role, u.author_id from sessions s join users u on u.id = s.user_id
		where s.id = ${digest(token)} and s.expires_at > now()`;
	return u ? { id: u.id, email: u.email, name: u.name, role: u.role, authorId: u.author_id } : null;
});

/** For admin pages and every admin action: signed-in users only (and admins only, when asked). */
export async function requireUser(role?: Role): Promise<AdminUser> {
	const user = await currentUser();
	if (!user) redirect("/admin/login/");
	if (role === "admin" && user.role !== "admin") redirect("/admin/?denied=1");
	return user;
}

/* ---------- Sign-in throttling (per server process, best effort) ---------- */

const attempts = new Map<string, number[]>();
const WINDOW = 15 * 60 * 1000;
const MAX_FAILURES = 5;

export async function clientKey(email: string): Promise<string> {
	const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
	return `${ip}|${email.toLowerCase()}`;
}

export function tooManyFailures(key: string): boolean {
	const now = Date.now();
	const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW);
	attempts.set(key, recent);
	return recent.length >= MAX_FAILURES;
}

export function recordFailure(key: string): void {
	attempts.set(key, [...(attempts.get(key) ?? []), Date.now()]);
	if (attempts.size > 10_000) attempts.clear();
}

export function clearFailures(key: string): void {
	attempts.delete(key);
}
