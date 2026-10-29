import Link from "next/link";
import { db } from "@/lib/db";
import { MediaLibrary } from "./MediaLibrary";

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
	const sp = await searchParams;
	const q = (sp.q ?? "").trim().slice(0, 100);
	const page = Math.max(1, Number(sp.page) || 1);
	const perPage = 48;
	const sql = db();
	const rows = await sql<{ id: number; url: string; alt: string; caption: string; width: number | null; height: number | null; mime: string; size_bytes: number | null; created_at: Date; total: string }[]>`
		select id, url, alt, caption, width, height, mime, size_bytes, created_at, count(*) over () as total from media
		${q ? sql`where alt ilike ${"%" + q + "%"} or storage_key ilike ${"%" + q + "%"}` : sql``}
		order by created_at desc, id desc limit ${perPage} offset ${(page - 1) * perPage}`;
	const total = rows.length ? Number(rows[0].total) : 0;
	const missingAlt = rows.filter((r) => r.mime.startsWith("image/") && !r.alt).length;

	return (
		<main className="adm-page">
			<header className="adm-head">
				<h1>Media</h1>
			</header>
			<form className="adm-filters" role="search" action="/admin/media/">
				<div className="adm-field">
					<label htmlFor="q">Search files</label>
					<input id="q" name="q" type="search" defaultValue={q} placeholder="File name or description" />
				</div>
				<button className="btn btn--ghost" type="submit">
					Search
				</button>
			</form>
			<p className="adm-hint" role="status">
				{total.toLocaleString("en-GB")} files{missingAlt > 0 && ` · ${missingAlt} on this page need a description for screen-reader users`}
			</p>
			<MediaLibrary
				items={rows.map((r) => ({
					id: r.id,
					url: r.url,
					alt: r.alt,
					caption: r.caption,
					width: r.width,
					height: r.height,
					mime: r.mime,
					size: r.size_bytes,
					created: r.created_at.toISOString(),
				}))}
			/>
			{total > perPage && (
				<nav className="adm-pager" aria-label="Pages">
					{page > 1 && <Link href={`/admin/media/?q=${encodeURIComponent(q)}&page=${page - 1}`}>← Newer</Link>}
					<span aria-current="page">
						Page {page} of {Math.ceil(total / perPage)}
					</span>
					{page * perPage < total && <Link href={`/admin/media/?q=${encodeURIComponent(q)}&page=${page + 1}`}>Older →</Link>}
				</nav>
			)}
		</main>
	);
}
