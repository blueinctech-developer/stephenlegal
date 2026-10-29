import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Kicker, Media, Meta } from "@/components/Card";
import { TopicNav } from "@/components/Listing";
import { getPosts, getTopics, optional } from "@/lib/data";

type Props = { searchParams: Promise<{ q?: string | string[]; page?: string }> };

const clean = (q: string | string[] | undefined) => (Array.isArray(q) ? q[0] : q || "").trim().slice(0, 100);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
	const q = clean((await searchParams).q);
	// Search results are never indexed.
	return { title: { absolute: q ? `Search: ${q} - Stephen Legal` : "Search - Stephen Legal" }, robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
	const sp = await searchParams;
	const q = clean(sp.q);
	const page = Math.min(Math.max(Number(sp.page) || 1, 1), 1000);
	const [result, topics] = await Promise.all([q ? getPosts({ search: q, page, perPage: 12 }) : null, optional(getTopics(14, 3), [])]);

	return (
		<main id="main" className="search-page" tabIndex={-1}>
			<header className="wrap archive-header">
				<p className="archive-header__kicker">Search</p>
				<h1 className="archive-header__title">{q ? <>“{q}”</> : "Search the archive"}</h1>
				{result && (
					<p className="meta" role="status">
						{result.total.toLocaleString("en-GB")} {result.total === 1 ? "result" : "results"}
						{page > 1 && ` · page ${page} of ${result.totalPages}`}
					</p>
				)}
				<form className="search-page__form" role="search" action="/search/">
					<label htmlFor="search-q">Search articles</label>
					<div className="field-row">
						<input id="search-q" type="search" name="q" defaultValue={q} required />
						<button type="submit" className="btn">
							Search
						</button>
					</div>
				</form>
			</header>

			<div className="wrap">
				{result && result.items.length > 0 && (
					<ol className="results" aria-label="Search results">
						{result.items.map((p, i) => (
							<li key={p.id} className="result reveal" style={{ "--i": i % 4 } as CSSProperties}>
								<Media image={p.image} sizes="(min-width: 640px) 200px, 100vw" preload={i === 0} />
								<div className="result__body">
									<Kicker post={p} />
									<h2 className="result__title">
										<Link href={p.href}>{p.title}</Link>
									</h2>
									{p.excerpt && <p className="result__excerpt">{p.excerpt}</p>}
									<Meta post={p} />
								</div>
							</li>
						))}
					</ol>
				)}
				{result && result.items.length === 0 && <p className="empty">No articles match “{q}”. Try fewer or different words, or browse a topic:</p>}
				{result && <QueryPager q={q} current={page} total={result.totalPages} />}
			</div>
			{(!result || result.items.length === 0) && <TopicNav topics={topics} />}
		</main>
	);
}

/** Search keeps its query in ?q=, so pages use ?page= rather than /page/N/. */
function QueryPager({ q, current, total }: { q: string; current: number; total: number }) {
	if (total <= 1) return null;
	const href = (n: number) => `/search/?q=${encodeURIComponent(q)}&page=${n}`;
	return (
		<nav className="pager" aria-label="Pagination">
			<div className="nav-links">
				{current > 1 && (
					<Link className="page-numbers prev" href={href(current - 1)}>
						<span aria-hidden="true">←</span> Previous
					</Link>
				)}
				<span className="page-numbers current" aria-current="page">
					Page {current} of {total}
				</span>
				{current < total && (
					<Link className="page-numbers next" href={href(current + 1)}>
						Next <span aria-hidden="true">→</span>
					</Link>
				)}
			</div>
		</nav>
	);
}
