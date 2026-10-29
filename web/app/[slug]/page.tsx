import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackToTop, ReadProgress, ShareBar, Toc } from "@/components/ArticleTools";
import { Card, Kicker, SectionHead, SplitTitle } from "@/components/Card";
import { SiteForm } from "@/components/SiteForm";
import { CONTACT, DISCLAIMER, SITE_URL, UNSUPPORTED_PAGES } from "@/lib/config";
import { prepareContent } from "@/lib/content";
import { FORM_BY_SLUG } from "@/lib/forms";
import { jsonLd, seoMetadata } from "@/lib/seo";
import { formatDate, readingMinutes, shouldShowToc } from "@/lib/text";
import { getAdjacent, getPageBySlug, getPostBySlug, getRelated, optional, type Page, type Post } from "@/lib/wp";

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
		return seoMetadata(p.seo, { title: p.title, description: p.excerpt, path: p.href, image: p.image?.url });
	}
	return seoMetadata(found.page.seo, { title: found.page.title, path: `/${found.page.slug}/` });
}

export default async function SlugPage({ params }: Props) {
	const { slug } = await params;
	const found = await resolve(slug);
	if (!found) notFound();
	return "post" in found ? <Article post={found.post} /> : <StaticPage page={found.page} />;
}

async function Article({ post }: { post: Post }) {
	const { html, toc } = prepareContent(post.contentHtml);
	const minutes = readingMinutes(post.contentHtml);
	const hasToc = shouldShowToc(toc, minutes);
	const updated = new Date(post.modified).getTime() - new Date(post.date).getTime() > 86_400_000;
	const [{ prev, next }, related] = await Promise.all([optional(getAdjacent(post), { prev: null, next: null }), optional(getRelated(post, 3), [])]);
	const ld = jsonLd(post.seo?.schema);

	return (
		<main id="main" className="article-page" tabIndex={-1}>
			<ReadProgress />
			{ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
			<article className="article">
				<header className="wrap article-header">
					<nav className="crumbs" aria-label="Breadcrumb">
						<ol>
							<li>
								<Link href="/">Home</Link>
							</li>
							{post.category && (
								<li>
									<Link href={`/category/${post.category.slug}/`}>{post.category.name}</Link>
								</li>
							)}
						</ol>
					</nav>
					<Kicker post={post} />
					<h1 className="article-header__title">
						<SplitTitle text={post.title} />
					</h1>
					{post.manualExcerpt && <p className="article-header__dek">{post.excerpt}</p>}
					<div className="byline">
						<p className="byline__author">
							By{" "}
							{post.authorInfo.slug ? (
								<Link href={`/author/${post.authorInfo.slug}/`} rel="author">
									{post.author}
								</Link>
							) : (
								post.author
							)}
						</p>
						<p className="byline__meta meta">
							<time dateTime={post.date}>{formatDate(post.date, true)}</time>
							{updated && (
								<>
									<span className="meta__sep" aria-hidden="true">·</span>
									<span>
										Updated <time dateTime={post.modified}>{formatDate(post.modified, true)}</time>
									</span>
								</>
							)}
							<span className="meta__sep" aria-hidden="true">·</span>
							<span>{minutes} min read</span>
						</p>
					</div>
				</header>

				{post.image && (
					<figure className="wrap article-hero">
						<div className="media media--hero">
							<Image src={post.image.url} alt={post.image.alt} fill preload fetchPriority="high" sizes="(min-width: 1360px) 1264px, 100vw" />
						</div>
						{post.image.caption && <figcaption>{post.image.caption}</figcaption>}
					</figure>
				)}

				<div className={`wrap article-layout${hasToc ? " has-toc" : ""}`}>
					{hasToc && <Toc items={toc} />}
					<div className="article-main">
						<div className="entry-content" dangerouslySetInnerHTML={{ __html: html }} />

						<aside className="disclaimer" aria-label="Disclaimer">
							<p>
								<strong>Not legal advice.</strong> {DISCLAIMER}
							</p>
						</aside>

						<div className="article-foot">
							{post.tags.length > 0 && (
								<ul className="tags" aria-label="Tags">
									{post.tags.map((t) => (
										<li key={t.id}>
											<Link href={`/tag/${t.slug}/`}>{t.name}</Link>
										</li>
									))}
								</ul>
							)}
							<ShareBar url={`${SITE_URL}${post.href}`} title={post.title} href={post.href} category={post.category?.name ?? null} date={post.date} />
							{post.authorInfo.description && (
								<section className="author-box" aria-label="About the author">
									{post.authorInfo.avatar && <Image src={post.authorInfo.avatar} alt="" width={72} height={72} />}
									<div>
										<p className="author-box__name">{post.author}</p>
										<p>{post.authorInfo.description}</p>
									</div>
								</section>
							)}
						</div>
					</div>
				</div>
			</article>

			{(prev || next) && (
				<nav className="wrap post-nav" aria-label="More articles">
					{prev && (
						<Link className="post-nav__link reveal" href={prev.href} rel="prev">
							<span className="post-nav__dir">
								<span aria-hidden="true">←</span> Previous
							</span>
							<span className="post-nav__title">{prev.title}</span>
						</Link>
					)}
					{next && (
						<Link className="post-nav__link post-nav__link--next reveal" href={next.href} rel="next">
							<span className="post-nav__dir">
								Next <span aria-hidden="true">→</span>
							</span>
							<span className="post-nav__title">{next.title}</span>
						</Link>
					)}
				</nav>
			)}

			{related.length > 0 && post.category && (
				<section className="wrap section related" aria-labelledby="related-title">
					<SectionHead title="Related reading" id="related-title" link={`/category/${post.category.slug}/`} label={`More in ${post.category.name}`} />
					<div className="grid-3">
						{related.map((p, i) => (
							<Card key={p.id} post={p} reveal={i} />
						))}
					</div>
				</section>
			)}
			<BackToTop />
		</main>
	);
}

function StaticPage({ page }: { page: Page }) {
	const { html, hadForm } = prepareContent(page.contentHtml);
	const ld = jsonLd(page.seo?.schema);
	const form = FORM_BY_SLUG[page.slug];
	return (
		<main id="main" className="wrap page" tabIndex={-1}>
			{ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
			<header className="page-header">
				<h1 className="page-header__title">{page.title}</h1>
			</header>
			<div className="page-content">
				<div className="entry-content" dangerouslySetInnerHTML={{ __html: html }} />
				{form && <SiteForm kind={form} />}
				{hadForm && !form && (
					<p className="form-note">
						The online form for this page is being moved to the new site. Until then, email{" "}
						<a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or call <a href={`tel:${CONTACT.phone}`}>{CONTACT.phone}</a>.
					</p>
				)}
			</div>
		</main>
	);
}
