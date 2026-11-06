/**
 * Site-wide settings edited under Admin → Settings, with the values the WordPress
 * site shows today (see WORDPRESS-AUDIT.md) as defaults, so an unedited setting
 * changes nothing on the public pages. No database access here, so tests can load it.
 */

export type MenuItem = { label: string; href: string; icon?: "bolt"; children?: MenuItem[] };

export type SiteSettings = {
	/** The theme's side panel (the two-bar button left of the logo). */
	panel: { address: string; phone: string; email: string };
	/** The footer's "Email Us", "Contact" and copyright lines. */
	footer: { email: string; phone: string; copyright: string };
	social: { facebook: string; x: string; instagram: string; youtube: string; linkedin: string };
	menu: MenuItem[];
	forms: {
		/** Where form notifications go; empty uses FORM_TO / info@stephenlegal.ng. */
		notifyTo: string;
		contactConfirmation: string;
		contributorConfirmation: string;
		newsletterConfirmation: string;
		/** The automatic reply the Contact form sends to the visitor ({name} is replaced). */
		autoReply: { enabled: boolean; subject: string; body: string };
	};
};

const cat = (label: string, slug: string): MenuItem => ({ label, href: `/category/${slug}/` });

export const DEFAULT_SETTINGS: SiteSettings = {
	panel: { address: "Street, City, Country", phone: "+234-80-638-68497", email: "your-email@mail.com" },
	footer: { email: "info@stephenlegal.ng", phone: "+2348063868497", copyright: "© 2025 Stephen Legal Blog | All Rights Reserved" },
	social: {
		facebook: "https://www.facebook.com/stephenlegalblog",
		x: "https://twitter.com/stephen_legal",
		instagram: "https://instagram.com/stephenlegal",
		youtube: "#",
		linkedin: "#",
	},
	// The WordPress "main-menu".
	menu: [
		{ label: "Home", href: "/" },
		{
			label: "Trending",
			href: "#",
			icon: "bolt",
			children: [
				cat("Trending Stories", "trending"),
				cat("Editor’s choice", "editors-choice"),
				cat("Crime Report", "crime-report"),
				cat("Business & Corporate", "business"),
				cat("Technology & Cryptocurrency", "technology"),
			],
		},
		{
			...cat("Law News", "law-news"),
			children: [cat("General News", "news"), cat("Law News", "law-news"), cat("NBA Updates", "nba"), cat("Foreign Issues", "foreign"), cat("Law Students’ Corner", "law-students")],
		},
		{
			...cat("Case Law & Analysis", "case-law"),
			children: [cat("Case Law", "case-law"), cat("Notable Pronouncements", "notable-pronouncements"), cat("Legal Tips", "legal-tips-digest"), cat("Courtroom Drama", "courtroom-drama")],
		},
		{ ...cat("Opinions & Explainers", "opinions"), children: [cat("Legal Explainer", "legal-explainer"), cat("Opinions", "opinions"), cat("Special Feature", "special-feature")] },
		{ label: "Contact", href: "/contact/", children: [{ label: "Contact Form / Enquiries", href: "/contact/" }] },
	],
	// From the Gravity Forms export.
	forms: {
		notifyTo: "",
		contactConfirmation: "Thank you for contacting us! We will get in touch with you shortly.",
		contributorConfirmation: "Thanks for contacting us! We will get in touch with you shortly.",
		newsletterConfirmation: "Thank you for signing up. Be on the lookout for our monthly newsletter!",
		autoReply: {
			enabled: true,
			subject: "We have received your inquiry",
			body: "Hi there {name},\n\nThank you for getting in touch. We have received your inquiry and will get back to you within one business day.",
		},
	},
};

export type SettingKey = keyof SiteSettings;
export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as SettingKey[];

/** Saved values over the defaults, key by key; anything missing keeps its default. */
export function mergeSettings(saved: { key: string; value: unknown }[]): SiteSettings {
	const settings = structuredClone(DEFAULT_SETTINGS);
	for (const { key, value } of saved) {
		if (!SETTING_KEYS.includes(key as SettingKey) || value == null) continue;
		const fallback = settings[key as SettingKey];
		(settings as Record<string, unknown>)[key] = Array.isArray(fallback)
			? Array.isArray(value)
				? value
				: fallback
			: { ...(fallback as object), ...(typeof value === "object" ? (value as object) : {}) };
	}
	return settings;
}

const SAFE_HREF = /^(\/|#|https?:\/\/|mailto:|tel:)/;

/** A link the site may print: a path, an anchor, a web address, email or phone. */
export const safeHref = (href: string) => (SAFE_HREF.test(href.trim()) ? href.trim().slice(0, 300) : "");

/** A menu from the settings form: labels and links present, two levels at most, 30 items. */
export function cleanMenu(items: unknown): MenuItem[] {
	if (!Array.isArray(items)) return [];
	const one = (x: unknown, depth: number): MenuItem | null => {
		const o = (x ?? {}) as Partial<MenuItem>;
		const label = String(o.label ?? "").trim().slice(0, 80);
		const href = safeHref(String(o.href ?? ""));
		if (!label || !href) return null;
		const children = depth === 0 && Array.isArray(o.children) ? o.children.map((c) => one(c, 1)).filter((c): c is MenuItem => Boolean(c)) : [];
		return { label, href, ...(o.icon === "bolt" && { icon: "bolt" as const }), ...(children.length && { children }) };
	};
	return items
		.map((x) => one(x, 0))
		.filter((x): x is MenuItem => Boolean(x))
		.slice(0, 30);
}
