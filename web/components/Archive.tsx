import Link from "next/link";
import { notFound } from "next/navigation";
import { getPosts, getTopics, optional, type PostQuery } from "@/lib/wp";
import { ArchiveGrid, Pager, TopicNav } from "./Listing";

type ArchiveProps = {
	kicker: string;
	title: string;
	description?: string;
	base: string;
	page: number;
	query: PostQuery;
	currentTopic?: string;
	crumb?: boolean;
};

/** Shared layout for category, tag, author and all-stories archives. */
export async function Archive({ kicker, title, description, base, page, query, currentTopic, crumb }: ArchiveProps) {
	const [result, topics] = await Promise.all([getPosts({ ...query, page, perPage: 12 }), optional(getTopics(14, 3), [])]);
	if (!result.items.length && page > 1) notFound();

	return (
		<main id="main" className="archive" tabIndex={-1}>
			<header className="wrap archive-header">
				{crumb && (
					<nav className="crumbs" aria-label="Breadcrumb">
						<ol>
							<li>
								<Link href="/">Home</Link>
							</li>
							<li aria-current="page">{title}</li>
						</ol>
					</nav>
				)}
				<p className="archive-header__kicker">{kicker}</p>
				<h1 className="archive-header__title">{title}</h1>
				{description && <p className="archive-header__desc">{description}</p>}
				<p className="meta">
					{result.total.toLocaleString("en-GB")} {result.total === 1 ? "article" : "articles"}
					{page > 1 && (
						<>
							<span className="meta__sep" aria-hidden="true">·</span>
							Page {page} of {result.totalPages}
						</>
					)}
				</p>
			</header>
			<TopicNav topics={topics} current={currentTopic} />
			<div className="wrap section">
				{result.items.length ? <ArchiveGrid posts={result.items} page={page} /> : <p className="empty">No articles here yet.</p>}
				<Pager base={base} current={page} total={result.totalPages} />
			</div>
		</main>
	);
}
