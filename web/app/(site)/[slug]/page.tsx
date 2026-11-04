import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegacyPage } from "@/components/legacy/LegacyPage";
import { renderSingle, renderStaticPage } from "@/lib/legacy/pages";
import { renderPage, T } from "@/lib/legacy/render";
import { articleSchema, jsonLd, seoMetadata } from "@/lib/seo";
import { UNSUPPORTED_PAGES } from "@/lib/config";
import { getPageBySlug, getPostBySlug, type Page, type Post } from "@/lib/data";

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
	if ("post" in found) {
		const schema = jsonLd(articleSchema(found.post));
		return (
			<>
				{schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schema }} />}
				<LegacyPage html={await renderSingle(found.post)} bodyClass={T.single.bodyClass.replace(/postid-d+/, `postid-${found.post.id}`)} />
			</>
		);
	}
	// The contact page is an Elementor layout (details, form, map); other pages use the theme's page layout.
	if (found.page.slug === "contact") return <LegacyPage html={await renderPage(T.contact.main)} bodyClass={T.contact.bodyClass} />;
	return <LegacyPage html={await renderStaticPage(found.page.slug, found.page.title, found.page.contentHtml)} bodyClass={`page-template-default page page-id-${found.page.id} wp-theme-forcast ori-inner-page elementor-default elementor-kit-7`} />;
}
