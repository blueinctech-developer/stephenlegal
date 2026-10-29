import Link from "next/link";
import { TopicNav } from "@/components/Listing";
import { getTopics } from "@/lib/data";

export default async function NotFound() {
	const topics = await getTopics(14, 3).catch(() => []);
	return (
		<main id="main" className="search-page" tabIndex={-1}>
			<header className="wrap archive-header">
				<p className="archive-header__kicker">Error 404</p>
				<h1 className="archive-header__title">This page isn’t here</h1>
				<p className="archive-header__desc">The link may be old or mistyped. Search the archive or pick a topic below.</p>
				<form className="search-page__form" role="search" action="/search/">
					<label htmlFor="nf-q">Search articles</label>
					<div className="field-row">
						<input id="nf-q" type="search" name="q" required />
						<button type="submit" className="btn">
							Search
						</button>
					</div>
				</form>
				<p className="more">
					<Link className="btn" href="/">
						Go to the homepage <span aria-hidden="true">→</span>
					</Link>
				</p>
			</header>
			<TopicNav topics={topics} />
		</main>
	);
}
