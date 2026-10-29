import Link from "next/link";
import type { CSSProperties } from "react";
import { Card, Media, SectionHead } from "@/components/Card";
import { TopicFilter } from "@/components/TopicFilter";
import { DESK_CATEGORIES, FEATURE_CATEGORY, SITE_NAME } from "@/lib/config";
import { formatDate } from "@/lib/text";
import { getCategoryBySlug, getPosts, getTopics, optional, type PostSummary } from "@/lib/wp";

export const revalidate = 300;

/** Hands out each story once, so no article repeats across homepage sections. */
class StoryPool {
	private used = new Set<number>();
	take(posts: PostSummary[], n: number) {
		const out = posts.filter((p) => !this.used.has(p.id)).slice(0, n);
		out.forEach((p) => this.used.add(p.id));
		return out;
	}
}

export default async function HomePage() {
	// Recent stories are required; the other sections are left out if WordPress can't supply them.
	const [sticky, recent, featureCat, topics, ...deskCats] = await Promise.all([
		optional(getPosts({ sticky: true, perPage: 3 }), null),
		getPosts({ perPage: 40 }),
		optional(getCategoryBySlug(FEATURE_CATEGORY), null),
		optional(getTopics(12, 3), []),
		...DESK_CATEGORIES.map((slug) => optional(getCategoryBySlug(slug), null)),
	]);
	const [featurePosts, ...deskPosts] = await Promise.all([
		featureCat ? optional(getPosts({ categories: [featureCat.id], perPage: 8 }), null) : null,
		...deskCats.map((c) => (c ? optional(getPosts({ categories: [c.id], perPage: 10 }), null) : null)),
	]);

	const pool = new StoryPool();
	const lead = pool.take([...(sticky?.items ?? []), ...recent.items], 3);
	const latest = pool.take(recent.items, 30);
	const [feature] = pool.take(featurePosts?.items ?? [], 1);
	const desks = deskCats
		.map((cat, i) => (cat ? { cat, posts: pool.take(deskPosts[i]?.items ?? [], 4) } : null))
		.filter((d): d is NonNullable<typeof d> => Boolean(d?.posts.length));
	const more = pool.take(recent.items, 10);

	return (
		<main id="main" className="home" tabIndex={-1}>
			<h1 className="screen-reader-text">{SITE_NAME} — latest legal news and analysis</h1>

			{lead.length > 0 && (
				<section className="wrap lead-zone" aria-label="Top stories">
					<div className="lead-zone__lead">
						<Card post={lead[0]} variant="lead" as="h2" preload sizes="(min-width: 1024px) 64vw, 100vw" />
					</div>
					{lead.length > 1 && (
						<div className="lead-zone__rail">
							<p className="rail-label">Also leading</p>
							{lead.slice(1).map((p) => (
								<Card key={p.id} post={p} variant="rail" as="h2" sizes="(min-width: 1024px) 28vw, 100vw" />
							))}
						</div>
					)}
				</section>
			)}

			{latest.length > 0 && (
				<section className="wrap section" aria-labelledby="latest-title">
					<SectionHead title="Latest analysis" id="latest-title" link="/blog/" label="All stories" />
					<TopicFilter posts={latest} />
				</section>
			)}

			{topics.length > 0 && (
				<section className="wrap section" aria-labelledby="topics-title">
					<SectionHead title="Browse by topic" id="topics-title" />
					<ul className="topics">
						{topics.map((t, i) => (
							<li key={t.slug} className="topics__item reveal" style={{ "--i": i % 4 } as CSSProperties}>
								<Link href={`/category/${t.slug}/`}>
									<span className="topics__name">{t.name}</span>
									<span className="topics__count">
										{t.count?.toLocaleString("en-GB")} {t.count === 1 ? "article" : "articles"} <span aria-hidden="true">→</span>
									</span>
								</Link>
							</li>
						))}
					</ul>
				</section>
			)}

			{feature && (
				<section className="insight surface-dark" aria-labelledby="insight-title">
					<div className="wrap insight__grid">
						<div className="insight__text reveal">
							<p className="insight__label">Featured insight{featureCat ? ` · ${featureCat.name}` : ""}</p>
							<h2 className="insight__title" id="insight-title">
								<Link href={feature.href}>{feature.title}</Link>
							</h2>
							{feature.excerpt && <p className="insight__dek">{feature.excerpt}</p>}
							<p className="meta">
								{feature.author}
								<span className="meta__sep" aria-hidden="true">·</span>
								<time dateTime={feature.date}>{formatDate(feature.date)}</time>
							</p>
							<Link className="btn btn--accent" href={feature.href} aria-describedby="insight-title">
								Read the analysis <span aria-hidden="true">→</span>
							</Link>
						</div>
						<div className="insight__media">
							<Media image={feature.image} sizes="(min-width: 1024px) 55vw, 100vw" />
						</div>
					</div>
				</section>
			)}

			{desks.length > 0 && (
				<section className="wrap section" aria-labelledby="desks-title">
					<SectionHead title="From the desks" id="desks-title" />
					<div className="desks">
						{desks.map(({ cat, posts }, d) => (
							<div className="desk reveal" key={cat.slug} style={{ "--i": d } as CSSProperties}>
								<h3 className="desk__title">
									<Link href={`/category/${cat.slug}/`}>
										{cat.name} <span aria-hidden="true">→</span>
									</Link>
								</h3>
								{posts.map((p, i) => (
									<Card key={p.id} post={p} variant={i === 0 ? "standard" : "headline"} as="h4" showKicker={false} sizes="(min-width: 1024px) 30vw, 100vw" />
								))}
							</div>
						))}
					</div>
				</section>
			)}

			{more.length > 0 && (
				<section className="wrap section" aria-labelledby="recent-title">
					<SectionHead title="More stories" id="recent-title" />
					<div className="rows">
						{more.map((p, i) => (
							<Card key={p.id} post={p} variant="row" reveal={i} />
						))}
					</div>
					<p className="more">
						<Link className="btn" href="/blog/">
							Browse all stories <span aria-hidden="true">→</span>
						</Link>
					</p>
				</section>
			)}
		</main>
	);
}
