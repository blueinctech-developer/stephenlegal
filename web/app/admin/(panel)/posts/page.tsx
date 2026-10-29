import Link from "next/link";
import { ContentList } from "../ContentList";

export default async function ListPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; deleted?: string }> }) {
	return (
		<main className="adm-page">
			<header className="adm-head">
				<h1>Articles</h1>
				<Link className="btn" href="/admin/posts/new/">
					New article
				</Link>
			</header>
			<ContentList type="post" filters={await searchParams} />
		</main>
	);
}
