/**
 * Small pure helpers for the admin (dates in Lagos time, web addresses).
 * No imports, so they run in the browser, on the server and under tests.
 */

/** Lagos is UTC+1 all year (no daylight saving). */
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

/** A stored date → the value of an <input type="datetime-local"> in Lagos time. */
export function toLagosInput(iso: string | Date | null): string {
	if (!iso) return "";
	const d = new Date(new Date(iso).getTime() + LAGOS_OFFSET_MS);
	return d.toISOString().slice(0, 16);
}

/** An <input type="datetime-local"> value in Lagos time → a Date, or null when empty/invalid. */
export function fromLagosInput(value: string): Date | null {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
	const d = new Date(`${value}:00+01:00`);
	return Number.isNaN(d.getTime()) ? null : d;
}

/** Web address segment: lower case letters, numbers and hyphens, up to 120 characters. */
export function toSlug(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/['’]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 120)
		.replace(/-+$/g, "");
}

/** Addresses the site itself uses; articles and pages can't take them. */
export const RESERVED_SLUGS = ["admin", "api", "blog", "category", "tag", "author", "search", "bookmark", "feed", "uploads", "wp-content", "wp-admin", "page", "login", "sitemap-xml", "robots-txt"];

export function formatAdminDate(iso: string | Date | null): string {
	if (!iso) return "—";
	return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(iso));
}
