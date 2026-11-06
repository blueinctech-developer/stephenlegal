"use server";

/** Admin → Settings. Administrators only; each section saves separately and refreshes the public site. */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cleanMenu, safeHref, type MenuItem, type SettingKey } from "@/lib/site-settings";

const str = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);
const back = (kind: "ok" | "error", message: string, section: string): never =>
	redirect(`/admin/settings/?${kind}=${encodeURIComponent(message)}#${section}`);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LABELS: Record<string, string> = {
	panel: "Side panel contact details",
	footer: "Footer",
	social: "Social links",
	menu: "Header menu",
	forms: "Form settings",
};

/** Menu rows (position, label, link, level) → the menu tree; a sub-item joins the nearest top-level item above it. */
function menuFromRows(form: FormData): MenuItem[] {
	const rows: { order: number; item: MenuItem; sub: boolean }[] = [];
	for (let i = 0; i < 60; i++) {
		const label = str(form, `label_${i}`, 80);
		const href = str(form, `href_${i}`, 300);
		if (!label && !href) continue;
		if (form.get(`remove_${i}`)) continue;
		rows.push({
			order: Number(form.get(`order_${i}`)) || i + 1,
			sub: form.get(`level_${i}`) === "sub",
			item: { label, href, ...(form.get(`bolt_${i}`) && { icon: "bolt" as const }) },
		});
	}
	rows.sort((a, b) => a.order - b.order);
	const tree: MenuItem[] = [];
	for (const r of rows) {
		const parent = tree[tree.length - 1];
		if (r.sub && parent) (parent.children ??= []).push({ label: r.item.label, href: r.item.href });
		else tree.push({ ...r.item });
	}
	return tree;
}

export async function saveSettings(form: FormData): Promise<void> {
	const user = await requireUser("admin");
	const section = str(form, "section", 20) as SettingKey;
	let value: unknown;

	switch (section) {
		case "panel":
			value = { address: str(form, "address", 200), phone: str(form, "phone", 40), email: str(form, "email", 200) };
			break;
		case "footer": {
			const email = str(form, "email", 200);
			if (email && !EMAIL.test(email)) back("error", "The footer email address doesn’t look right.", section);
			value = { email, phone: str(form, "phone", 40), copyright: str(form, "copyright", 200) };
			break;
		}
		case "social": {
			const links: Record<string, string> = {};
			for (const key of ["facebook", "x", "instagram", "youtube", "linkedin"]) {
				const raw = str(form, key, 300) || "#";
				const href = safeHref(raw);
				if (!href) back("error", `The ${key === "x" ? "X" : key} link must start with https://`, section);
				links[key] = href;
			}
			value = links;
			break;
		}
		case "menu": {
			const raw = menuFromRows(form);
			const menu = cleanMenu(raw);
			if (!menu.length) back("error", "The menu needs at least one item with a label and a link.", section);
			if (menu.length < raw.length) back("error", "Each link must start with /, #, https://, mailto: or tel:.", section);
			value = menu;
			break;
		}
		case "forms": {
			const notifyTo = str(form, "notifyTo", 200);
			if (notifyTo && !EMAIL.test(notifyTo)) back("error", "The notification email address doesn’t look right.", section);
			value = {
				notifyTo,
				contactConfirmation: str(form, "contactConfirmation", 500),
				contributorConfirmation: str(form, "contributorConfirmation", 500),
				newsletterConfirmation: str(form, "newsletterConfirmation", 500),
				autoReply: { enabled: form.get("autoReplyEnabled") === "on", subject: str(form, "autoReplySubject", 200), body: str(form, "autoReplyBody", 3000) },
			};
			break;
		}
		default:
			back("error", "Unknown settings section.", "panel");
	}

	await db()`
		insert into settings (key, value, updated_at, updated_by) values (${section}, ${db().json(value as never)}, now(), ${user.id})
		on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`;
	await logActivity(user, "Changed settings", LABELS[section] ?? section);
	revalidatePath("/", "layout");
	back("ok", `${LABELS[section]} saved.`, section);
}

/** Puts one section back to the values the WordPress site used. */
export async function resetSettings(form: FormData): Promise<void> {
	const user = await requireUser("admin");
	const section = str(form, "section", 20);
	if (!LABELS[section]) back("error", "Unknown settings section.", "panel");
	await db()`delete from settings where key = ${section}`;
	await logActivity(user, "Reset settings", LABELS[section]);
	revalidatePath("/", "layout");
	back("ok", `${LABELS[section]} reset to the original.`, section);
}
