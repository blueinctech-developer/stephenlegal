/**
 * Pure text helpers (no imports, so they run under `node --test` as well as Next).
 */

const NAMED: Record<string, string> = {
	amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…",
	ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»",
	copy: "©", reg: "®", trade: "™", sect: "§", para: "¶", middot: "·", bull: "•",
};

/** Decode HTML entities as WordPress emits them in titles and excerpts. */
export function decodeEntities(input: string): string {
	return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
		if (code[0] === "#") {
			const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
			return Number.isFinite(n) ? String.fromCodePoint(n) : match;
		}
		return NAMED[code.toLowerCase()] ?? match;
	});
}

/** HTML → plain text with collapsed whitespace. */
export function toText(html: string): string {
	return decodeEntities(
		html
			.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
			.replace(/<[^>]+>/g, " "),
	)
		.replace(/\s+/g, " ")
		.trim();
}

/** About 220 words per minute, never less than one minute. */
export function readingMinutes(html: string): number {
	const words = toText(html).split(" ").filter(Boolean).length;
	return Math.max(1, Math.round(words / 220));
}

/** Trim to a word boundary, ending with an ellipsis when shortened. */
export function truncateWords(text: string, max: number): string {
	const words = text.split(/\s+/);
	return words.length <= max ? text : words.slice(0, max).join(" ").replace(/[,;:.\s]+$/, "") + "…";
}

/** WordPress excerpts end with "[…]" or "[&hellip;]"; drop it. */
export function cleanExcerpt(html: string): string {
	return toText(html).replace(/\s*\[(…|\.\.\.)\]\s*$/, "…").replace(/\s*(Read More|Continue reading)\s*»?$/i, "");
}

export function slugify(text: string): string {
	return (
		text
			.toLowerCase()
			.normalize("NFKD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 64) || "section"
	);
}

export type TocItem = { id: string; text: string; level: 2 | 3 };

/**
 * Give every H2/H3 an id (keeping existing ones) and return the table of contents.
 */
export function addHeadingIds(html: string): { html: string; toc: TocItem[] } {
	const toc: TocItem[] = [];
	const used = new Set<string>();
	const out = html.replace(/<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (match, lvl: string, attrs = "", inner: string) => {
		const text = toText(inner);
		if (!text) return match;
		const existing = /\sid=["']([^"']+)["']/i.exec(attrs)?.[1];
		let id = existing || slugify(text);
		if (!existing) {
			let n = 2;
			const base = id;
			while (used.has(id)) id = `${base}-${n++}`;
		}
		used.add(id);
		toc.push({ id, text, level: Number(lvl) as 2 | 3 });
		const nextAttrs = existing ? attrs : `${attrs} id="${id}"`;
		return `<h${lvl}${nextAttrs}>${inner}</h${lvl}>`;
	});
	return { html: out, toc };
}

/** Show a table of contents only on long articles with real structure. */
export function shouldShowToc(toc: TocItem[], minutes: number): boolean {
	return toc.length >= 3 && minutes >= 4;
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
const DATE_LONG = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });

export function formatDate(iso: string, long = false): string {
	return (long ? DATE_LONG : DATE_FMT).format(new Date(iso));
}
