import { db } from "@/lib/db";
import { Flash } from "../Flash";
import { deleteAuthor, saveAuthor } from "../manage-actions";

type Author = { id: number; name: string; slug: string; bio: string; count: string };

export default async function AuthorsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
	const sp = await searchParams;
	const authors = await db()<Author[]>`
		select a.id, a.name, a.slug, a.bio, (select count(*) from posts p where p.author_id = a.id) as count from authors a order by a.name`;

	return (
		<main className="adm-page">
			<header className="adm-head">
				<h1>Authors</h1>
			</header>
			<p className="adm-hint">The names shown in article bylines and at /author/name/. They are separate from sign-in accounts.</p>
			<Flash ok={sp.ok} error={sp.error} />
			<details className="adm-box">
				<summary>Add an author</summary>
				<AuthorForm />
			</details>
			<ul className="adm-cards">
				{authors.map((a) => (
					<li key={a.id} className="adm-box">
						<h2>{a.name}</h2>
						<p className="adm-hint">
							/author/{a.slug}/ · {Number(a.count).toLocaleString("en-GB")} articles
						</p>
						<details className="adm-inline-edit">
							<summary>Edit</summary>
							<AuthorForm author={a} />
							<form action={deleteAuthor} className="adm-delete">
								<input type="hidden" name="id" value={a.id} />
								<button className="adm-link adm-link--danger" type="submit">
									Remove {a.name}
								</button>
								<span className="adm-hint">Their articles stay, credited to Stephen Legal.</span>
							</form>
						</details>
					</li>
				))}
			</ul>
		</main>
	);
}

function AuthorForm({ author }: { author?: Author }) {
	const p = author ? `a${author.id}` : "new-author";
	return (
		<form action={saveAuthor} className="adm-stack">
			{author && <input type="hidden" name="id" value={author.id} />}
			<div className="adm-field">
				<label htmlFor={`${p}-name`}>Name</label>
				<input id={`${p}-name`} name="name" defaultValue={author?.name} required />
			</div>
			<div className="adm-field">
				<label htmlFor={`${p}-slug`}>Web address</label>
				<input id={`${p}-slug`} name="slug" defaultValue={author?.slug} placeholder="Made from the name if empty" />
			</div>
			<div className="adm-field">
				<label htmlFor={`${p}-bio`}>Short biography</label>
				<textarea id={`${p}-bio`} name="bio" rows={3} defaultValue={author?.bio} />
			</div>
			<button className="btn" type="submit">
				{author ? "Save" : "Add"}
			</button>
		</form>
	);
}
