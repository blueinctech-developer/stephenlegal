import "server-only";
import sanitizeHtml from "sanitize-html";
import { SITE_URL, WP_URL } from "./config";
import { addHeadingIds, type TocItem } from "./text";

const EMBED_HOSTS = ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com", "www.google.com", "docs.google.com", "maps.google.com"];

/**
 * Article and page HTML from WordPress, made safe to render: scripts, styles,
 * inline event handlers and WordPress-only forms are removed; embeds are limited
 * to known video/document hosts. Elementor wrapper classes are kept so the
 * stylesheet can neutralise their spacing.
 */
export function prepareContent(raw: string): { html: string; toc: TocItem[]; hadForm: boolean } {
	const hadForm = /<form[\s>]/i.test(raw);

	const clean = sanitizeHtml(raw, {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "figure", "figcaption", "iframe", "video", "source", "picture", "del", "ins", "sup", "sub", "mark"]),
		disallowedTagsMode: "discard",
		nonTextTags: ["style", "script", "textarea", "option", "noscript", "form", "button", "select", "label"],
		allowedAttributes: {
			"*": ["id", "class", "title", "lang", "dir"],
			a: ["href", "name", "target", "rel"],
			img: ["src", "srcset", "sizes", "alt", "width", "height", "loading", "decoding"],
			iframe: ["src", "width", "height", "allow", "allowfullscreen", "title", "loading"],
			video: ["src", "controls", "poster", "width", "height", "preload"],
			source: ["src", "srcset", "type", "media"],
			td: ["colspan", "rowspan"],
			th: ["colspan", "rowspan", "scope"],
			ol: ["start", "reversed", "type"],
			blockquote: ["cite"],
		},
		allowedSchemes: ["http", "https", "mailto", "tel"],
		allowedIframeHostnames: EMBED_HOSTS,
		transformTags: {
			a: (tagName, attribs) => {
				const href = rewriteHref(attribs.href || "");
				const external = /^https?:\/\//i.test(href) && !href.startsWith(SITE_URL);
				return {
					tagName,
					attribs: {
						...attribs,
						href,
						...(external || attribs.target === "_blank" ? { target: "_blank", rel: "noopener noreferrer" } : {}),
					},
				};
			},
			img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
			iframe: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", title: attribs.title || "Embedded media" } }),
		},
		// Embeds from hosts not on the list, and empty Elementor spacer/form wrappers left behind by removed widgets.
		exclusiveFilter: (frame) =>
			(frame.tag === "iframe" && !frame.attribs.src) ||
			(frame.tag === "div" && !frame.text.trim() && !frame.mediaChildren.length && /elementor-(spacer|widget-html|widget-form|shortcode)/.test(frame.attribs.class || "")),
	});

	const { html, toc } = addHeadingIds(clean);
	return { html, toc, hadForm };
}

/** Links to WordPress permalinks become links on this site (uploads stay on WordPress). */
function rewriteHref(href: string): string {
	if (WP_URL === SITE_URL || !href.startsWith(WP_URL)) return href;
	if (href.startsWith(`${WP_URL}/wp-content/`) || href.startsWith(`${WP_URL}/wp-admin`)) return href;
	return SITE_URL + href.slice(WP_URL.length);
}
