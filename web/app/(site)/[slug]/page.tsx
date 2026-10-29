import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Article, StaticPage } from "@/components/ArticleView";
import { UNSUPPORTED_PAGES } from "@/lib/config";
import { getPageBySlug, getPostBySlug, type Page, type Post } from "@/lib/data";
import { seoMetadata } from "@/lib/seo";

export const revalidate = 300;

// Render on first request, then cache (575 articles; no need to build them all up front).
export function generateStaticParams() {
	return [];
}

type Props = { params: Promise<{ slug: string }> };

async function resolve(slug: string): Promise<{ post: Post } | { page: Page } | null> {
	if (!/^[a-z0-9%_-]+$/i.test(slug)) return null;
	const post = await getPostBySlug(slug);
	if (post) return { post };
	if (UNSUPPORTED_PAGES.includes(slug)) return null;
	const page = await getPageBySlug(slug);
	return page ? { page } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const found = await resolve(slug);
	if (!found) return { title: "Not found", robots: { index: false } };
	if ("post" in found) {
		const p = found.post;
		return seoMetadata(p.seo, { title: p.title, description: p.excerpt, path: p.href, image: p.image?.url, article: { published: p.date, modified: p.modified } });
	}
	return seoMetadata(found.page.seo, { title: found.page.title, path: `/${found.page.slug}/` });
}

export default async function SlugPage({ params }: Props) {
	const { slug } = await params;
	const found = await resolve(slug);
	if (!found) notFound();
	return "post" in found ? <Article post={found.post} /> : <StaticPage page={found.page} />;
}
