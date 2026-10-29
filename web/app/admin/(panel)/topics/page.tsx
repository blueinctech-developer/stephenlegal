import Link from "next/link";
import { db } from "@/lib/db";
import { Flash } from "../Flash";
import { deleteTerm, saveTerm } from "../manage-actions";

type Term = { id: number; name: string; slug: string; description: string; parent_id: number | null; count: string; total?: string };

export default async function TopicsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; page?: string; ok?: string; error?: string }> }) {
	const sp = await searchParams;
	const tab = sp.tab === "tags" ? "tags" : "categories";
	const sql = db();
	const q = (sp.q ?? "").trim().slice(0, 80);
	const page = Math.max(1, Number(sp.page) || 1);
	const perPage = 50;

	const rows = await sql<Term[]>`
		select t.id, t.name, t.slug, t.description, t.parent_id,
			(select count(*) from post_terms pt where pt.term_id = t.id) as count, count(*) over () as total
		from terms t where t.taxonomy = ${tab === "tags" ? "tag" : "category"}
		${q ? sql`and t.name ilike ${"%" + q + "%"}` : sql``}
		order by ${tab === "tags" ? sql`count desc, t.name` : sql`t.name`}
		${tab === "tags" ? sql`limit ${perPage} offset ${(page - 1) * perPage}` : sql``}`;
	const total = rows.length ? Number(rows[0].total) : 0;
	const categories = tab === "categories" ? rows : [];
	const nameOf = (id: number | null) => categories.find((c) => c.id === id)?.name;

	return (
		<main className="adm-page">
			<header className="adm-head">
				<h1>Categories &amp; tags</h1>
				<nav className="adm-seg" aria-label="Choose list">
					<Link href="/admin/topics/" aria-current={tab === "categories" ? "page" : undefined}>
						Categories
					</Link>
					<Link href="/admin/topics/?tab=tags" aria-current={tab === "tags" ? "page" : undefined}>
						Tags
					</Link>
				</nav>
			</header>
			<p className="adm-hint">
				{tab === "categories"
					? "Categories are the site’s sections: they appear in the menu, on article labels and at /category/name/."
					: "Tags are finer labels shown under each article and at /tag/name/. New tags can also be added while editing an article."}
			</p>
			<Flash ok={sp.ok} error={sp.error} />

			<details className="adm-box">
				<summary>Add a {tab === "tags" ? "tag" : "category"}</summary>
				<TermForm taxonomy={tab === "tags" ? "tag" : "category"} categories={categories} />
			</details>

			{tab === "tags" && (
				<form className="adm-filters" role="search" action="/admin/topics/">
					<input type="hidden" name="tab" value="tags" />
					<div className="adm-field">
						<label htmlFor="q">Search tags</label>
						<input id="q" name="q" type="search" defaultValue={q} />
					</div>
					<button className="btn btn--ghost" type="submit">
						Search
					</button>
				</form>
			)}
			<p className="adm-hint" role="status">
				{total.toLocaleString("en-GB")} {tab === "tags" ? "tags" : "categories"}
			</p>

			<div className="adm-table-wrap">
				<table className="adm-table">
					<thead>
						<tr>
							<th scope="col">Name</th>
							{tab === "categories" && <th scope="col">Parent</th>}
							<th scope="col">Articles</th>
							<th scope="col">
								<span className="screen-reader-text">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((t) => (
							<tr key={t.id}>
								<td>
									<strong>{t.name}</strong>
									<span className="adm-table__slug">
										/{tab === "tags" ? "tag" : "category"}/{t.slug}/
									</span>
								</td>
								{tab === "categories" && <td>{nameOf(t.parent_id) ?? "—"}</td>}
								<td>{Number(t.count).toLocaleString("en-GB")}</td>
								<td>
									<details className="adm-inline-edit">
										<summary>Edit</summary>
										<TermForm taxonomy={tab === "tags" ? "tag" : "category"} term={t} categories={categories} />
										<form action={deleteTerm} className="adm-delete">
											<input type="hidden" name="id" value={t.id} />
											<button className="adm-link adm-link--danger" type="submit">
												Delete “{t.name}”
											</button>
											<span className="adm-hint">Articles keep their other labels.</span>
										</form>
									</details>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{tab === "tags" && total > perPage && (
				<nav className="adm-pager" aria-label="Pages">
					{page > 1 && <Link href={`/admin/topics/?tab=tags&q=${encodeURIComponent(q)}&page=${page - 1}`}>← Previous</Link>}
					<span aria-current="page">
						Page {page} of {Math.ceil(total / perPage)}
					</span>
					{page * perPage < total && <Link href={`/admin/topics/?tab=tags&q=${encodeURIComponent(q)}&page=${page + 1}`}>Next →</Link>}
				</nav>
			)}
		</main>
	);
}

function TermForm({ taxonomy, term, categories }: { taxonomy: "category" | "tag"; term?: Term; categories: Term[] }) {
	const p = term ? `t${term.id}` : `new-${taxonomy}`;
	return (
		<form action={saveTerm} className="adm-stack">
			<input type="hidden" name="taxonomy" value={taxonomy} />
			{term && <input type="hidden" name="id" value={term.id} />}
			<div className="adm-field">
				<label htmlFor={`${p}-name`}>Name</label>
				<input id={`${p}-name`} name="name" defaultValue={term?.name} required maxLength={80} />
			</div>
			<div className="adm-field">
				<label htmlFor={`${p}-slug`}>Web address</label>
				<input id={`${p}-slug`} name="slug" defaultValue={term?.slug} placeholder="Made from the name if empty" />
			</div>
			{taxonomy === "category" && (
				<>
					<div className="adm-field">
						<label htmlFor={`${p}-parent`}>Parent category</label>
						<select id={`${p}-parent`} name="parent_id" defaultValue={term?.parent_id ?? ""}>
							<option value="">None</option>
							{categories
								.filter((c) => c.id !== term?.id)
								.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
						</select>
					</div>
					<div className="adm-field">
						<label htmlFor={`${p}-desc`}>Description</label>
						<textarea id={`${p}-desc`} name="description" rows={2} defaultValue={term?.description} />
					</div>
				</>
			)}
			<button className="btn" type="submit">
				{term ? "Save" : "Add"}
			</button>
		</form>
	);
}
