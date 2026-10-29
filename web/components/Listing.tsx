import Link from "next/link";
import type { PostSummary } from "@/lib/wp";
import { Card } from "./Card";

/** Numbered pagination using WordPress's /page/N/ URLs. */
export function Pager({ base, current, total }: { base: string; current: number; total: number }) {
	if (total <= 1) return null;
	const href = (n: number) => (n === 1 ? base : `${base}page/${n}/`);
	const pages = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
	const sorted = [...pages].sort((a, b) => a - b);
	const items: (number | "dots")[] = [];
	sorted.forEach((n, i) => {
		if (i > 0 && n - sorted[i - 1] > 1) items.push("dots");
		items.push(n);
	});
	return (
		<nav className="pager" aria-label="Pagination">
			<div className="nav-links">
				{current > 1 && (
					<Link className="page-numbers prev" href={href(current - 1)}>
						<span aria-hidden="true">←</span> Newer
					</Link>
				)}
				{items.map((n, i) =>
					n === "dots" ? (
						<span key={`d${i}`} className="page-numbers dots">
							…
						</span>
					) : n === current ? (
						<span key={n} className="page-numbers current" aria-current="page">
							<span className="screen-reader-text">Page </span>
							{n}
						</span>
					) : (
						<Link key={n} className="page-numbers" href={href(n)}>
							<span className="screen-reader-text">Page </span>
							{n}
						</Link>
					),
				)}
				{current < total && (
					<Link className="page-numbers next" href={href(current + 1)}>
						Older <span aria-hidden="true">→</span>
					</Link>
				)}
			</div>
		</nav>
	);
}

/** Archive grid: on page one the first story is featured. */
export function ArchiveGrid({ posts, page }: { posts: PostSummary[]; page: number }) {
	const first = page === 1;
	return (
		<div className={`archive-grid${first ? " is-first-page" : ""}`}>
			{posts.map((post, i) => (
				<Card
					key={post.id}
					post={post}
					variant={first && i === 0 ? "feature" : "standard"}
					as="h2"
					preload={i === 0}
					reveal={i}
					sizes={first && i === 0 ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
				/>
			))}
		</div>
	);
}

export function TopicNav({ topics, current }: { topics: { name: string; slug: string }[]; current?: string }) {
	return (
		<nav className="topic-nav" aria-label="Topics">
			<div className="wrap">
				<ul className="topic-nav__list">
					{topics.map((t) => (
						<li key={t.slug}>
							<Link href={`/category/${t.slug}/`} aria-current={current === t.slug ? "page" : undefined}>
								{t.name}
							</Link>
						</li>
					))}
				</ul>
			</div>
		</nav>
	);
}

/** Parse a trailing "page/N" off a catch-all path. Returns null for malformed paths. */
export function parsePaged(path: string[]): { slug: string; page: number } | null {
	if (path.length === 1) return { slug: path[0], page: 1 };
	if (path.length === 3 && path[1] === "page" && /^\d+$/.test(path[2])) {
		const page = Number(path[2]);
		return page >= 2 && page <= 1000 ? { slug: path[0], page } : null;
	}
	return null;
}
