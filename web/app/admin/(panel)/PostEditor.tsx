"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { MediaPicker, type PickedMedia } from "@/components/admin/MediaPicker";
import { RichEditor } from "@/components/admin/RichEditor";
import { toLagosInput, toSlug } from "@/lib/admin-format";
import { deletePost, savePost, type SaveState } from "./content-actions";

export type EditorPost = {
	id: number | null;
	type: "post" | "page";
	title: string;
	slug: string;
	excerpt: string;
	content: string;
	status: "draft" | "published";
	publishedAt: string | null;
	authorId: number | null;
	featured: PickedMedia | null;
	seoTitle: string;
	seoDescription: string;
	sticky: boolean;
	categoryIds: number[];
	tags: string[];
};

type Option = { id: number; name: string };

export function PostEditor({ post, categories, authors, justSaved }: { post: EditorPost; categories: Option[]; authors: Option[]; justSaved?: boolean }) {
	const [state, action, pending] = useActionState<SaveState, FormData>(savePost, justSaved ? { status: "saved", message: "Saved." } : { status: "idle" });
	const [title, setTitle] = useState(post.title);
	const [slug, setSlug] = useState(post.slug);
	const [slugTouched, setSlugTouched] = useState(Boolean(post.slug));
	const [content, setContent] = useState(post.content);
	const [featured, setFeatured] = useState<PickedMedia | null>(post.featured);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [seoTitle, setSeoTitle] = useState(post.seoTitle);
	const [seoDescription, setSeoDescription] = useState(post.seoDescription);
	const [catFilter, setCatFilter] = useState("");
	const [dirty, setDirty] = useState(false);
	const form = useRef<HTMLFormElement>(null);
	const statusRef = useRef<HTMLParagraphElement>(null);

	const errors = state.errors ?? {};
	const kind = post.type === "page" ? "page" : "article";
	const listHref = post.type === "page" ? "/admin/pages/" : "/admin/posts/";
	const liveSlug = state.slug ?? post.slug;
	const shownSlug = slugTouched ? slug : toSlug(title);

	// Saving clears the "unsaved changes" warning.
	const [lastSaved, setLastSaved] = useState(state.savedAt);
	if (state.savedAt !== lastSaved) {
		setLastSaved(state.savedAt);
		setDirty(false);
	}

	useEffect(() => {
		if (state.status !== "idle") statusRef.current?.focus();
	}, [state]);

	useEffect(() => {
		const warn = (e: BeforeUnloadEvent) => {
			if (dirty) e.preventDefault();
		};
		const save = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
				e.preventDefault();
				form.current?.requestSubmit();
			}
		};
		window.addEventListener("beforeunload", warn);
		window.addEventListener("keydown", save);
		return () => {
			window.removeEventListener("beforeunload", warn);
			window.removeEventListener("keydown", save);
		};
	}, [dirty]);

	const fieldError = (name: string) =>
		errors[name] ? (
			<p className="adm-error" id={`${name}-error`}>
				{errors[name]}
			</p>
		) : null;

	return (
		<form
			ref={form}
			className="adm-edit"
			onChange={() => setDirty(true)}
			// Submitted by hand rather than with action={…}: React resets a form after its action runs,
			// which would wipe unsaved fields (tags, status…) when a save is rejected.
			onSubmit={(e) => {
				e.preventDefault();
				const data = new FormData(e.currentTarget);
				startTransition(() => action(data));
			}}
		>
			<input type="hidden" name="id" value={post.id ?? ""} />
			<input type="hidden" name="type" value={post.type} />
			<input type="hidden" name="content" value={content} />
			<input type="hidden" name="featured_media_id" value={featured?.id ?? ""} />

			<div className="adm-edit__main">
				<p className="adm-crumb">
					<Link href={listHref}>← All {post.type === "page" ? "pages" : "articles"}</Link>
				</p>
				{state.status !== "idle" && (
					<p ref={statusRef} tabIndex={-1} role={state.status === "error" ? "alert" : "status"} className={`adm-alert ${state.status === "error" ? "adm-alert--error" : "adm-alert--ok"}`}>
						{state.message}
					</p>
				)}
				<div className="adm-field">
					<label htmlFor="title" className="screen-reader-text">
						Title
					</label>
					<input
						id="title"
						name="title"
						className="adm-title-input"
						placeholder={`${post.type === "page" ? "Page" : "Article"} title`}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						required
						aria-invalid={errors.title ? true : undefined}
						aria-describedby={errors.title ? "title-error" : undefined}
					/>
					{fieldError("title")}
				</div>
				<div className="adm-field adm-field--inline">
					<label htmlFor="slug">Web address</label>
					<span className="adm-slug">
						<span aria-hidden="true">stephenlegal.ng/</span>
						<input
							id="slug"
							name="slug"
							value={shownSlug}
							onChange={(e) => {
								setSlugTouched(true);
								setSlug(e.target.value);
							}}
							onBlur={() => setSlug(toSlug(shownSlug))}
							aria-invalid={errors.slug ? true : undefined}
							aria-describedby={errors.slug ? "slug-error" : "slug-hint"}
						/>
						<span aria-hidden="true">/</span>
					</span>
					{fieldError("slug") ?? (
						<p className="adm-hint" id="slug-hint">
							Changing the address of a published {kind} breaks links to it that others have shared.
						</p>
					)}
				</div>

				<p className="adm-label" id="content-label">
					Content
				</p>
				<RichEditor
					id="content-editor"
					labelledBy="content-label"
					initialHtml={post.content}
					onChange={(html) => {
						setContent(html);
						setDirty(true);
					}}
				/>
				{fieldError("content")}

				{post.type === "post" && (
					<div className="adm-field">
						<label htmlFor="excerpt">Summary (optional)</label>
						<p className="adm-hint" id="excerpt-hint">
							Shown under the headline and on cards. Leave empty to use the opening words.
						</p>
						<textarea id="excerpt" name="excerpt" rows={3} maxLength={600} defaultValue={post.excerpt} aria-describedby="excerpt-hint" />
					</div>
				)}

				<fieldset className="adm-box">
					<legend>Search engines and sharing</legend>
					<div className="adm-field">
						<label htmlFor="seo_title">Search title</label>
						<input id="seo_title" name="seo_title" maxLength={120} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={`${title || "Title"} - Stephen Legal`} />
						<p className={`adm-count${(seoTitle || `${title} - Stephen Legal`).length > 60 ? " is-over" : ""}`}>{(seoTitle || `${title} - Stephen Legal`).length} / 60 characters shown by Google</p>
					</div>
					<div className="adm-field">
						<label htmlFor="seo_description">Search description</label>
						<textarea id="seo_description" name="seo_description" rows={2} maxLength={300} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
						<p className={`adm-count${seoDescription.length > 160 ? " is-over" : ""}`}>{seoDescription.length} / 160 characters shown by Google</p>
					</div>
					<div className="adm-serp" aria-label="Search result preview">
						<p className="adm-serp__url">stephenlegal.ng › {shownSlug || "…"}</p>
						<p className="adm-serp__title">{seoTitle || `${title || "Title"} - Stephen Legal`}</p>
						<p className="adm-serp__desc">{seoDescription || "Search engines will use the opening of the article."}</p>
					</div>
				</fieldset>
			</div>

			<aside className="adm-edit__side">
				<section className="adm-box adm-box--publish" aria-labelledby="publish-title">
					<h2 id="publish-title">Publish</h2>
					<div className="adm-field">
						<label htmlFor="status">Status</label>
						<select id="status" name="status" defaultValue={post.status}>
							<option value="draft">Draft (not on the site)</option>
							<option value="published">Published</option>
						</select>
					</div>
					<div className="adm-field">
						<label htmlFor="published_at">Publication date (Lagos time)</label>
						<input
							id="published_at"
							name="published_at"
							type="datetime-local"
							defaultValue={toLagosInput(post.publishedAt)}
							aria-describedby={errors.published_at ? "published_at-error" : "date-hint"}
						/>
						{fieldError("published_at") ?? (
							<p className="adm-hint" id="date-hint">
								Empty means now. A future date schedules it.
							</p>
						)}
					</div>
					{post.type === "post" && (
						<label className="adm-check">
							<input type="checkbox" name="sticky" defaultChecked={post.sticky} /> Feature at the top of the homepage
						</label>
					)}
					<div className="adm-actions">
						<button type="submit" className="btn" disabled={pending}>
							{pending ? "Saving…" : "Save"}
						</button>
						{post.id && (
							<a className="adm-link" href={`/admin/preview/${post.id}/`} target="_blank" rel="noopener">
								Preview<span className="screen-reader-text"> (opens in a new tab)</span>
							</a>
						)}
						{post.id && post.status === "published" && (
							<a className="adm-link" href={`/${liveSlug}/`} target="_blank" rel="noopener">
								View on site<span className="screen-reader-text"> (opens in a new tab)</span>
							</a>
						)}
					</div>
					<p className="adm-hint">{dirty ? "Unsaved changes. Ctrl+S saves." : "Ctrl+S saves."}</p>
				</section>

				{post.type === "post" && (
					<>
						<fieldset className="adm-box">
							<legend>Categories</legend>
							<label className="screen-reader-text" htmlFor="cat-filter">
								Filter categories
							</label>
							<input id="cat-filter" type="search" placeholder="Filter…" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} />
							<div className="adm-checklist">
								{categories.map((c) => (
									<label key={c.id} className="adm-check" hidden={Boolean(catFilter) && !c.name.toLowerCase().includes(catFilter.toLowerCase())}>
										<input type="checkbox" name="categories" value={c.id} defaultChecked={post.categoryIds.includes(c.id)} /> {c.name}
									</label>
								))}
							</div>
						</fieldset>

						<div className="adm-box adm-field">
							<label htmlFor="tags">Tags</label>
							<p className="adm-hint" id="tags-hint">
								Separate with commas.
							</p>
							<textarea id="tags" name="tags" rows={2} defaultValue={post.tags.join(", ")} aria-describedby="tags-hint" />
						</div>
					</>
				)}

				<section className="adm-box" aria-labelledby="featured-title">
					<h2 id="featured-title">Featured image</h2>
					{featured ? (
						<figure className="adm-featured">
							{/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
							<img src={featured.url} alt={featured.alt} />
							<figcaption>{featured.alt || <em>No description yet. Add one in Media.</em>}</figcaption>
						</figure>
					) : (
						<p className="adm-hint">None. Cards and sharing previews will have no image.</p>
					)}
					<div className="adm-actions">
						<button type="button" className="btn btn--ghost" onClick={() => setPickerOpen(true)}>
							{featured ? "Replace" : "Choose image"}
						</button>
						{featured && (
							<button
								type="button"
								className="adm-link"
								onClick={() => {
									setFeatured(null);
									setDirty(true);
								}}
							>
								Remove
							</button>
						)}
					</div>
					<MediaPicker
						open={pickerOpen}
						onClose={() => setPickerOpen(false)}
						onPick={(m) => {
							setFeatured(m);
							setPickerOpen(false);
							setDirty(true);
						}}
					/>
				</section>

				{post.type === "post" && (
					<div className="adm-box adm-field">
						<label htmlFor="author_id">Author</label>
						<select id="author_id" name="author_id" defaultValue={post.authorId ?? ""}>
							<option value="">Stephen Legal</option>
							{authors.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
						</select>
					</div>
				)}

				{post.id && <DeleteButton id={post.id} kind={kind} />}
			</aside>
		</form>
	);
}

function DeleteButton({ id, kind }: { id: number; kind: string }) {
	const [pending, startTransition] = useTransition();
	return (
		<div className="adm-box adm-box--danger">
			<button
				type="button"
				disabled={pending}
				className="adm-link adm-link--danger"
				onClick={() => {
					if (!window.confirm(`Delete this ${kind} permanently? This can’t be undone.`)) return;
					const data = new FormData();
					data.set("id", String(id));
					startTransition(() => deletePost(data));
				}}
			>
				{pending ? "Deleting…" : `Delete this ${kind}`}
			</button>
		</div>
	);
}
