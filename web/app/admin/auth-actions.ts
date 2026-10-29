"use server";

import { redirect } from "next/navigation";
import { clearFailures, clientKey, endSession, recordFailure, startSession, tooManyFailures } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";

export type AuthState = { error?: string; email?: string };

// Checked when the email is unknown, so a wrong email and a wrong password take the same time.
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
	const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
	const password = String(form.get("password") ?? "").slice(0, 200);
	const key = await clientKey(email);
	if (tooManyFailures(key)) return { error: "Too many attempts. Wait 15 minutes, then try again.", email };

	const [user] = await db()<{ id: number; password_hash: string }[]>`select id, password_hash from users where email = ${email}`;
	const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
	if (!user || !ok) {
		recordFailure(key);
		return { error: "That email and password don’t match an account.", email };
	}
	clearFailures(key);
	await startSession(user.id);
	const next = String(form.get("next") ?? "");
	redirect(next.startsWith("/admin/") && !next.startsWith("//") ? next : "/admin/");
}

export async function signOut(): Promise<void> {
	await endSession();
	redirect("/admin/login/");
}

/** First run only: creates the first administrator when no accounts exist yet. */
export async function setupFirstAdmin(_prev: AuthState, form: FormData): Promise<AuthState> {
	const setupToken = process.env.ADMIN_SETUP_TOKEN ?? "";
	const name = String(form.get("name") ?? "").trim().slice(0, 100);
	const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
	const password = String(form.get("password") ?? "");
	const token = String(form.get("token") ?? "");

	const key = await clientKey("setup");
	if (tooManyFailures(key)) return { error: "Too many attempts. Wait 15 minutes, then try again.", email };
	if (setupToken.length < 16 || token !== setupToken) {
		recordFailure(key);
		return { error: "The setup code is not correct.", email };
	}
	const sql = db();
	const [{ count }] = await sql<{ count: string }[]>`select count(*) from users`;
	if (Number(count) > 0) return { error: "Setup is already complete. Sign in instead.", email };
	if (!name) return { error: "Enter your name.", email };
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", email };
	const problem = passwordProblem(password, email);
	if (problem) return { error: problem, email };

	const [user] = await sql<{ id: number }[]>`
		insert into users (email, name, password_hash, role) values (${email}, ${name}, ${await hashPassword(password)}, 'admin') returning id`;
	await startSession(user.id);
	redirect("/admin/");
}
