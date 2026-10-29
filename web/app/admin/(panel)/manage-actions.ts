"use server";

/**
 * Categories, tags, authors, messages, users and account settings. Each
 * action checks the signed-in user, then returns to its screen with a short
 * confirmation or error in the address (?ok= / ?error=), so the forms work
 * without JavaScript.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toSlug } from "@/lib/admin-format";
import { endOtherSessions, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";

const str = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);
const back = (path: string, kind: "ok" | "error", message: string): never => redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
const refreshSite = () => revalidatePath("/", "layout");
const isUniqueViolation = (e: unknown) => (e as { code?: string }).code === "23505";

/* ---------- Categories and tags ---------- */

export async function saveTerm(form: FormData): Promise<void> {
	await requireUser();
	const taxonomy = form.get("taxonomy") === "tag" ? "tag" : "category";
	const id = Number(form.get("id")) || null;
	const name = str(form, "name", 80);
	const slug = toSlug(str(form, "slug", 120) || name);
	const description = str(form, "description", 1000);
	const parentId = taxonomy === "category" ? Number(form.get("parent_id")) || null : null;
	const path = `/admin/topics/${taxonomy === "tag" ? "?tab=tags" : ""}`;
	const sep = taxonomy === "tag" ? "&" : "?";
	if (!name || !slug) redirect(`${path}${sep}error=${encodeURIComponent("Enter a name.")}`);
	if (id && parentId === id) redirect(`${path}${sep}error=${encodeURIComponent("A category can’t be its own parent.")}`);
	try {
		if (id) await db()`update terms set name = ${name}, slug = ${slug}, description = ${description}, parent_id = ${parentId} where id = ${id} and taxonomy = ${taxonomy}`;
		else await db()`insert into terms (taxonomy, name, slug, description, parent_id) values (${taxonomy}, ${name}, ${slug}, ${description}, ${parentId})`;
	} catch (e) {
		if (isUniqueViolation(e)) redirect(`${path}${sep}error=${encodeURIComponent(`Another ${taxonomy} already uses the address “${slug}”.`)}`);
		throw e;
	}
	refreshSite();
	redirect(`${path}${sep}ok=${encodeURIComponent(id ? `Saved “${name}”.` : `Added “${name}”.`)}`);
}

export async function deleteTerm(form: FormData): Promise<void> {
	await requireUser();
	const id = Number(form.get("id"));
	const [t] = await db()<{ name: string; taxonomy: string }[]>`delete from terms where id = ${id} returning name, taxonomy`;
	refreshSite();
	const path = `/admin/topics/${t?.taxonomy === "tag" ? "?tab=tags&" : "?"}`;
	redirect(`${path}ok=${encodeURIComponent(t ? `Deleted “${t.name}”. Its articles are unchanged otherwise.` : "Already deleted.")}`);
}

/* ---------- Authors (bylines) ---------- */

export async function saveAuthor(form: FormData): Promise<void> {
	await requireUser();
	const id = Number(form.get("id")) || null;
	const name = str(form, "name", 100);
	const slug = toSlug(str(form, "slug", 120) || name);
	const bio = str(form, "bio", 2000);
	if (!name) back("/admin/authors/", "error", "Enter the author’s name.");
	try {
		if (id) await db()`update authors set name = ${name}, slug = ${slug}, bio = ${bio} where id = ${id}`;
		else await db()`insert into authors (name, slug, bio) values (${name}, ${slug}, ${bio})`;
	} catch (e) {
		if (isUniqueViolation(e)) back("/admin/authors/", "error", `Another author already uses the address “${slug}”.`);
		throw e;
	}
	refreshSite();
	back("/admin/authors/", "ok", id ? `Saved ${name}.` : `Added ${name}.`);
}

export async function deleteAuthor(form: FormData): Promise<void> {
	await requireUser();
	const id = Number(form.get("id"));
	const [a] = await db()<{ name: string }[]>`delete from authors where id = ${id} returning name`;
	refreshSite();
	back("/admin/authors/", "ok", a ? `Removed ${a.name}. Their articles now show “Stephen Legal” as the author.` : "Already removed.");
}

/* ---------- Messages from the site's forms ---------- */

export async function markMessage(form: FormData): Promise<void> {
	await requireUser();
	const id = Number(form.get("id"));
	const read = form.get("read") === "1";
	await db()`update submissions set read_at = ${read ? new Date() : null} where id = ${id}`;
	revalidatePath("/admin/", "layout");
	redirect(`/admin/messages/${form.get("filter") === "unread" ? "?filter=unread" : ""}`);
}

export async function deleteMessage(form: FormData): Promise<void> {
	await requireUser();
	await db()`delete from submissions where id = ${Number(form.get("id"))}`;
	revalidatePath("/admin/", "layout");
	back("/admin/messages/", "ok", "Message deleted.");
}

/* ---------- Users (administrators only) ---------- */

export async function createUser(form: FormData): Promise<void> {
	await requireUser("admin");
	const name = str(form, "name", 100);
	const email = str(form, "email", 200).toLowerCase();
	const role = form.get("role") === "admin" ? "admin" : "editor";
	const password = String(form.get("password") ?? "");
	if (!name) back("/admin/users/", "error", "Enter a name.");
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("/admin/users/", "error", "Enter a valid email address.");
	const problem = passwordProblem(password, email);
	if (problem) back("/admin/users/", "error", `Password: ${problem}`);
	try {
		await db()`insert into users (name, email, role, password_hash) values (${name}, ${email}, ${role}, ${await hashPassword(password)})`;
	} catch (e) {
		if (isUniqueViolation(e)) back("/admin/users/", "error", "There is already an account with that email.");
		throw e;
	}
	back("/admin/users/", "ok", `Account created for ${name}. Share the password with them privately; they can change it under Account.`);
}

export async function updateUser(form: FormData): Promise<void> {
	const me = await requireUser("admin");
	const id = Number(form.get("id"));
	const role = form.get("role") === "admin" ? "admin" : "editor";
	const authorId = Number(form.get("author_id")) || null;
	const sql = db();
	if (id === me.id && role !== "admin") back("/admin/users/", "error", "You can’t remove your own administrator role.");
	await sql`update users set role = ${role}, author_id = ${authorId} where id = ${id}`;
	back("/admin/users/", "ok", "Saved.");
}

export async function deleteUser(form: FormData): Promise<void> {
	const me = await requireUser("admin");
	const id = Number(form.get("id"));
	if (id === me.id) back("/admin/users/", "error", "You can’t delete your own account.");
	const sql = db();
	const [{ admins }] = await sql<{ admins: string }[]>`select count(*) as admins from users where role = 'admin' and id <> ${id}`;
	if (Number(admins) === 0) back("/admin/users/", "error", "Keep at least one administrator.");
	await sql`delete from users where id = ${id}`;
	back("/admin/users/", "ok", "Account deleted. That person is signed out.");
}

/* ---------- My account ---------- */

export async function changePassword(form: FormData): Promise<void> {
	const me = await requireUser();
	const current = String(form.get("current") ?? "");
	const next = String(form.get("password") ?? "");
	const confirm = String(form.get("confirm") ?? "");
	const sql = db();
	const [u] = await sql<{ password_hash: string }[]>`select password_hash from users where id = ${me.id}`;
	if (!u || !(await verifyPassword(current, u.password_hash))) back("/admin/account/", "error", "Your current password is not correct.");
	if (next !== confirm) back("/admin/account/", "error", "The new passwords don’t match.");
	const problem = passwordProblem(next, me.email);
	if (problem) back("/admin/account/", "error", problem);
	await sql`update users set password_hash = ${await hashPassword(next)} where id = ${me.id}`;
	await endOtherSessions(me.id);
	back("/admin/account/", "ok", "Password changed. Other devices have been signed out.");
}

export async function updateProfile(form: FormData): Promise<void> {
	const me = await requireUser();
	const name = str(form, "name", 100);
	if (!name) back("/admin/account/", "error", "Enter your name.");
	await db()`update users set name = ${name} where id = ${me.id}`;
	back("/admin/account/", "ok", "Saved.");
}
