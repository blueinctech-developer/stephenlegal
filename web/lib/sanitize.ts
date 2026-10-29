/**
 * The one definition of article HTML that is stored in the database: what the
 * WordPress import produces and what the admin editor may save. Page-builder
 * wrappers (Elementor, block classes) are flattened to plain article markup.
 * No server-only import, so command-line scripts and tests can use it too.
 */
import sanitizeHtml from "sanitize-html";

export const EMBED_HOSTS = ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com", "www.google.com", "maps.google.com", "docs.google.com"];

const BLOCK_TAGS = ["p", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "figure", "figcaption", "hr", "pre", "table", "thead", "tbody", "tr", "th", "td"];
const INLINE_TAGS = ["a", "strong", "b", "em", "i", "u", "s", "del", "ins", "code", "sup", "sub", "mark", "br", "img", "iframe"];

export type CleanOptions = {
	/** Turn links to the old site into site-relative paths (e.g. https://stephenlegal.ng/foo/ → /foo/). */
	siteOrigins?: string[];
	/** Swap file URLs (uploads) for their new addresses. */
	mapUrl?: (url: string) => string | undefined;
};

export function cleanArticleHtml(raw: string, opts: CleanOptions = {}): string {
	const origins = (opts.siteOrigins ?? []).map((o) => o.replace(/\/+$/, ""));
	const localise = (url: string): string => {
		const mapped = opts.mapUrl?.(url);
		if (mapped) return mapped;
		for (const o of origins) {
			if (url.startsWith(`${o}/`) && !url.startsWith(`${o}/wp-content/`)) return url.slice(o.length);
		}
		return url;
	};

	const html = sanitizeHtml(raw, {
		allowedTags: [...BLOCK_TAGS, ...INLINE_TAGS],
		// Wrappers such as div/section/span are dropped but their contents kept.
		disallowedTagsMode: "discard",
		nonTextTags: ["style", "script", "textarea", "option", "noscript", "form", "button", "select", "label", "svg", "template"],
		allowedAttributes: {
			a: ["href", "target", "rel"],
			img: ["src", "alt", "width", "height"],
			iframe: ["src", "title", "width", "height", "allow", "allowfullscreen"],
			td: ["colspan", "rowspan"],
			th: ["colspan", "rowspan", "scope"],
			ol: ["start", "reversed"],
		},
		allowedSchemes: ["http", "https", "mailto", "tel"],
		allowedSchemesByTag: { img: ["http", "https"] },
		allowProtocolRelative: false,
		allowedIframeHostnames: EMBED_HOSTS,
		transformTags: {
			h1: "h2",
			a: (tagName, attribs) => {
				const href = localise(attribs.href || "");
				const external = /^https?:\/\//i.test(href);
				return { tagName, attribs: { href, ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}) } };
			},
			img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, src: localise(attribs.src || "") } }),
		},
		exclusiveFilter: (frame) =>
			(frame.tag === "img" && !frame.attribs.src) ||
			(frame.tag === "iframe" && !frame.attribs.src) ||
			// Empty paragraphs and headings left behind by page builders.
			(["p", "h2", "h3", "h4", "h5", "h6", "li", "figure"].includes(frame.tag) && !frame.text.trim() && !frame.mediaChildren.length) ||
			// Leftover note from the old form plugin.
			(frame.tag === "p" && /^"\*" indicates required fields$/.test(frame.text.trim())),
	});

	// Page builders indent text with tabs and line breaks: collapse them (the archive has
	// no <pre> blocks) and put each block element on its own line.
	const open = new RegExp(String.raw`\s*(<(?:${BLOCK_TAGS.join("|")})(?:\s[^>]*)?\/?>)\s*`, "g");
	const close = new RegExp(String.raw`\s*(</(?:${BLOCK_TAGS.join("|")})>)\s*`, "g");
	return html
		.replace(/\s+/g, " ")
		.replace(open, "\n$1")
		.replace(close, "$1\n")
		.replace(/\n\s*/g, "\n")
		.trim();
}

