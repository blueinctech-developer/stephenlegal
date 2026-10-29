/**
 * Site-wide settings. Infrastructure values come from the environment; editorial
 * defaults carry over from the old site.
 */

const trimSlash = (url: string) => url.replace(/\/+$/, "");

/** The public URL of this site, used for canonicals, sitemaps and feeds. */
export const SITE_URL = trimSlash(process.env.NEXT_PUBLIC_SITE_URL || "https://stephenlegal.ng");

export const SITE_NAME = "Stephen Legal";

/** The publication's tagline, as it read on the old site. */
export const SITE_TAGLINE = "Law is dynamic and we're at the corridors of this dynamism.";

/** Seconds before cached pages are rebuilt (saving in the admin refreshes them at once). */
export const REVALIDATE = 300;

/** Categories that describe placement rather than subject; never shown as a story's label. */
export const PLACEMENT_CATEGORIES = ["trending", "most-viewed", "editors-choice", "uncategorized", "sponsored"];

/** Category feeding the homepage "Featured insight" band. */
export const FEATURE_CATEGORY = "legal-explainer";

/** The three homepage desk columns. */
export const DESK_CATEGORIES = ["case-law", "opinions", "law-news"];

/**
 * WordPress pages that only work inside the old Forcast theme (front-end
 * accounts). They are not rendered here.
 */
export const UNSUPPORTED_PAGES = ["login", "register", "edit-profile", "password-reset", "sample-page"];

export const DISCLAIMER =
	"Articles on Stephen Legal are for general information and public education only. They are not legal advice and do not create a lawyer–client relationship. For advice on your own situation, consult a qualified legal practitioner.";

/** Contact details published on the live site's Contact and Privacy Policy pages. */
export const CONTACT = { email: "info@stephenlegal.ng", phone: "+2348063868497" };

export const SOCIAL = [
	{ label: "Facebook", url: "https://www.facebook.com/stephenlegalblog" },
	{ label: "Instagram", url: "https://www.instagram.com/stephenlegal" },
	{ label: "X", url: "https://twitter.com/stephen_legal" },
];

/** Publication pages linked from the footer and menu (all exist on the live site). */
export const PUBLICATION_LINKS = [
	{ label: "Contact", href: "/contact/" },
	{ label: "Become a Contributor", href: "/become-a-contributor/" },
	{ label: "Privacy Policy", href: "/privacy-policy/" },
	{ label: "Saved articles", href: "/bookmark/" },
	{ label: "RSS feed", href: "/feed/" },
];
