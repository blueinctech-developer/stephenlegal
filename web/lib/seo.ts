import type { Metadata } from "next";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "./config";
import type { Post, Seo } from "./data";

type Fallback = { title: string; description?: string; path: string; image?: string | null; article?: { published: string; modified: string } };

/** Page metadata: the editor's search title/description when set, otherwise sensible defaults. */
export function seoMetadata(seo: Seo | null, fallback: Fallback): Metadata {
	const canonical = `${SITE_URL}${fallback.path}`;
	const title = seo?.title || `${fallback.title} - ${SITE_NAME}`;
	const description = seo?.description || fallback.description || undefined;
	const images = fallback.image ? [{ url: fallback.image }] : undefined;

	return {
		title: { absolute: title },
		description,
		alternates: { canonical },
		openGraph: {
			title: seo?.title || fallback.title,
			description,
			url: canonical,
			siteName: SITE_NAME,
			type: fallback.article ? "article" : "website",
			images,
			...(fallback.article && { publishedTime: fallback.article.published, modifiedTime: fallback.article.modified }),
		},
		twitter: { card: "summary_large_image", title: seo?.title || fallback.title, description, images: images?.map((i) => i.url) },
	};
}

const absolute = (url: string) => (url.startsWith("/") ? `${SITE_URL}${url}` : url);

/** schema.org description of an article, for search engines' rich results. */
export function articleSchema(post: Post): object {
	const url = `${SITE_URL}${post.href}`;
	const publisher = { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: `${SITE_URL}/`, description: SITE_TAGLINE };
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "Article",
				"@id": `${url}#article`,
				headline: post.title,
				description: post.seo.description || post.excerpt,
				datePublished: post.date,
				dateModified: post.modified,
				mainEntityOfPage: url,
				url,
				inLanguage: "en-GB",
				...(post.image && { image: { "@type": "ImageObject", url: absolute(post.image.url), width: post.image.width, height: post.image.height } }),
				author: {
					"@type": "Person",
					name: post.author,
					...(post.authorInfo.slug && { url: `${SITE_URL}/author/${post.authorInfo.slug}/` }),
				},
				publisher: { "@id": publisher["@id"] },
				...(post.category && { articleSection: post.category.name }),
				...(post.tags.length && { keywords: post.tags.map((t) => t.name).join(", ") }),
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
					...(post.category ? [{ "@type": "ListItem", position: 2, name: post.category.name, item: `${SITE_URL}/category/${post.category.slug}/` }] : []),
					{ "@type": "ListItem", position: post.category ? 3 : 2, name: post.title },
				],
			},
			publisher,
		],
	};
}

/** JSON-LD for a <script> tag, with "<" escaped so it can't close the tag. */
export function jsonLd(schema: unknown): string | null {
	if (!schema) return null;
	return JSON.stringify(schema).replace(/</g, "\\u003c");
}
