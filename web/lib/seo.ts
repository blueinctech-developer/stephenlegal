import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./config";
import type { YoastHead } from "./wp";

/**
 * Metadata from Yoast's head data (kept as the editors wrote it), with sensible
 * fallbacks for archives and pages Yoast doesn't describe.
 */
export function seoMetadata(seo: YoastHead | null, fallback: { title: string; description?: string; path: string; image?: string | null }): Metadata {
	const canonical = seo?.canonical || `${SITE_URL}${fallback.path}`;
	const title = seo?.title || `${fallback.title} - ${SITE_NAME}`;
	const description = seo?.description || seo?.og_description || fallback.description;
	const images = seo?.og_image?.length ? seo.og_image.map((i) => ({ url: i.url, width: i.width, height: i.height })) : fallback.image ? [{ url: fallback.image }] : undefined;
	const noindex = seo?.robots?.index === "noindex";

	return {
		title: { absolute: title },
		description,
		alternates: { canonical },
		robots: noindex ? { index: false, follow: true } : undefined,
		openGraph: {
			title: seo?.og_title || fallback.title,
			description: seo?.og_description || description,
			url: canonical,
			siteName: SITE_NAME,
			type: seo?.og_type === "article" ? "article" : "website",
			images,
			...(seo?.og_type === "article" && {
				publishedTime: seo.article_published_time,
				modifiedTime: seo.article_modified_time,
			}),
		},
		twitter: { card: "summary_large_image", title: seo?.og_title || fallback.title, description: seo?.og_description || description, images: images?.map((i) => i.url) },
	};
}

/** Yoast's schema.org graph as JSON-LD, with "<" escaped so it can't close the script tag. */
export function jsonLd(schema: unknown): string | null {
	if (!schema) return null;
	return JSON.stringify(schema).replace(/</g, "\\u003c");
}
