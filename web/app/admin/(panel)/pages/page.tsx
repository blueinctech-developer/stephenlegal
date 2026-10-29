import Link from "next/link";
import { ContentList } from "../ContentList";

export default async function ListPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; deleted?: string }> }) {
	return (
		<main className="adm-page">
			<header className="adm-head">
				<h1>Pages</h1>
				<Link className="btn" href="/admin/pages/new/">
					New page
				</Link>
			</header>
			<ContentList type="page" filters={await searchParams} />
		</main>
	);
}
