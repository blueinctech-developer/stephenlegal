import { SITE_NAME, SITE_URL } from "@/lib/config";
import { getPosts, getSiteInfo } from "@/lib/data";

export const revalidate = 300;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0 at the same /feed/ URL WordPress used, so existing subscribers keep receiving articles. */
export async function GET() {
	const [{ items }, info] = await Promise.all([getPosts({ perPage: 20 }), getSiteInfo()]);
	const entries = items
		.map(
			(p) => `<item>
<title>${esc(p.title)}</title>
<link>${SITE_URL}${p.href}</link>
<guid isPermaLink="true">${SITE_URL}${p.href}</guid>
<pubDate>${new Date(p.date).toUTCString()}</pubDate>
<dc:creator>${esc(p.author)}</dc:creator>
${p.category ? `<category>${esc(p.category.name)}</category>` : ""}
<description>${esc(p.excerpt)}</description>
</item>`,
		)
		.join("\n");
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${esc(SITE_NAME)}</title>
<link>${SITE_URL}/</link>
<atom:link href="${SITE_URL}/feed/" rel="self" type="application/rss+xml"/>
<description>${esc(info.description)}</description>
<language>en-GB</language>
${entries}
</channel>
</rss>`;
	return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
