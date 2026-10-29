import Link from "next/link";
import { formatAdminDate } from "@/lib/admin-format";
import { db } from "@/lib/db";

type Filters = { q?: string; status?: string; page?: string; deleted?: string };

/** The articles or pages table, with search, status filter and paging. */
export async function ContentList({ type, filters }: { type: "post" | "page"; filters: Filters }) {
	const sql = db();
	const q = (filters.q ?? "").trim().slice(0, 100);
	const status = ["draft", "published", "scheduled"].includes(filters.status ?? "") ? filters.status : "";
	const page = Math.max(1, Number(filters.page) || 1);
	const perPage = 25;
	const base = type === "page" ? "/admin/pages/" : "/admin/posts/";
	const noun = type === "page" ? "page" : "article";

	const rows = await sql<{ id: number; title: string; slug: string; status: string; published_at: Date | null; modified_at: Date; author: string | null; category: string | null; total: string }[]>`
		select p.id, p.title, p.slug, p.status, p.published_at, p.modified_at, a.name as author,
			(select t.name from post_terms pt join terms t on t.id = pt.term_id where pt.post_id = p.id and t.taxonomy = 'category' order by pt.position limit 1) as category,
			count(*) over () as total
		from posts p left join authors a on a.id = p.author_id
		where p.type = ${type}
		${q ? sql`and (p.title ilike ${"%" + q + "%"} or p.slug ilike ${"%" + q + "%"})` : sql``}
		${status === "draft" ? sql`and p.status = 'draft'` : sql``}
		${status === "published" ? sql`and p.status = 'published' and p.published_at <= now()` : sql``}
		${status === "scheduled" ? sql`and p.status = 'published' and p.published_at > now()` : sql``}
		order by coalesce(p.published_at, p.modified_at) desc, p.id desc
		limit ${perPage} offset ${(page - 1) * perPage}`;
	const total = rows.length ? Number(rows[0].total) : 0;
	const pages = Math.ceil(total / perPage);
	const link = (n: number) => `${base}?${new URLSearchParams({ ...(q && { q }), ...(status && { status }), page: String(n) })}`;
	const label = (r: (typeof rows)[number]) =>
		r.status === "draft" ? "Draft" : r.published_at && r.published_at > new Date() ? "Scheduled" : "Published";

	return (
		<>
			{filters.deleted && (
				<p className="adm-alert adm-alert--ok" role="status">
					The {noun} was deleted.
				</p>
			)}
			<form className="adm-filters" role="search" action={base}>
				<div className="adm-field">
					<label htmlFor="q">Search {noun}s</label>
					<input id="q" name="q" type="search" defaultValue={q} />
				</div>
				<div className="adm-field">
					<label htmlFor="status">Status</label>
					<select id="status" name="status" defaultValue={status}>
						<option value="">All</option>
						<option value="published">Published</option>
						<option value="scheduled">Scheduled</option>
						<option value="draft">Drafts</option>
					</select>
				</div>
				<button className="btn btn--ghost" type="submit">
					Filter
				</button>
			</form>
			<p className="adm-hint" role="status">
				{total.toLocaleString("en-GB")} {total === 1 ? noun : `${noun}s`}
				{pages > 1 && ` · page ${page} of ${pages}`}
			</p>
			{rows.length ? (
				<div className="adm-table-wrap">
					<table className="adm-table">
						<thead>
							<tr>
								<th scope="col">Title</th>
								{type === "post" && <th scope="col">Category</th>}
								{type === "post" && <th scope="col">Author</th>}
								<th scope="col">Status</th>
								<th scope="col">Date</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((r) => (
								<tr key={r.id}>
									<td>
										<Link href={`${base}${r.id}/`} className="adm-table__title">
											{r.title || "(untitled)"}
										</Link>
										<span className="adm-table__slug">/{r.slug}/</span>
									</td>
									{type === "post" && <td>{r.category ?? "—"}</td>}
									{type === "post" && <td>{r.author ?? "Stephen Legal"}</td>}
									<td>
										<span className={`adm-pill adm-pill--${label(r).toLowerCase()}`}>{label(r)}</span>
									</td>
									<td>{formatAdminDate(r.published_at ?? r.modified_at)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="adm-empty">No {noun}s match.</p>
			)}
			{pages > 1 && (
				<nav className="adm-pager" aria-label="Pages">
					{page > 1 && <Link href={link(page - 1)}>← Newer</Link>}
					<span aria-current="page">Page {page}</span>
					{page < pages && <Link href={link(page + 1)}>Older →</Link>}
				</nav>
			)}
		</>
	);
}
