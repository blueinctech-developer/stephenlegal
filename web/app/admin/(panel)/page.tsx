import Link from "next/link";
import { formatAdminDate } from "@/lib/admin-format";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
	const user = await requireUser();
	const sql = db();
	const [[counts], recent, drafts, messages] = await Promise.all([
		sql<{ published: string; scheduled: string; drafts: string; pages: string; media: string; unread: string }[]>`
			select
				(select count(*) from posts where type = 'post' and status = 'published' and published_at <= now()) as published,
				(select count(*) from posts where type = 'post' and status = 'published' and published_at > now()) as scheduled,
				(select count(*) from posts where type = 'post' and status = 'draft') as drafts,
				(select count(*) from posts where type = 'page') as pages,
				(select count(*) from media) as media,
				(select count(*) from submissions where read_at is null) as unread`,
		sql<{ id: number; title: string; published_at: Date }[]>`
			select id, title, published_at from posts where type = 'post' and status = 'published' order by published_at desc limit 6`,
		sql<{ id: number; title: string; modified_at: Date }[]>`
			select id, title, modified_at from posts where type = 'post' and status = 'draft' order by modified_at desc limit 6`,
		sql<{ id: number; form: string; data: Record<string, string>; created_at: Date }[]>`
			select id, form, data, created_at from submissions where read_at is null order by created_at desc limit 5`,
	]);
	const stats = [
		{ label: "Published articles", value: counts.published, href: "/admin/posts/?status=published" },
		{ label: "Scheduled", value: counts.scheduled, href: "/admin/posts/?status=scheduled" },
		{ label: "Drafts", value: counts.drafts, href: "/admin/posts/?status=draft" },
		{ label: "Pages", value: counts.pages, href: "/admin/pages/" },
		{ label: "Files", value: counts.media, href: "/admin/media/" },
		{ label: "Unread messages", value: counts.unread, href: "/admin/messages/?filter=unread" },
	];

	return (
		<main className="adm-page">
			<header className="adm-head">
				<h1>Welcome, {user.name.split(" ")[0]}</h1>
				<Link className="btn" href="/admin/posts/new/">
					Write an article
				</Link>
			</header>
			{(await searchParams).denied && (
				<p className="adm-alert adm-alert--error" role="alert">
					That screen is for administrators only.
				</p>
			)}
			<ul className="adm-stats">
				{stats.map((s) => (
					<li key={s.label}>
						<Link href={s.href}>
							<strong>{Number(s.value).toLocaleString("en-GB")}</strong>
							<span>{s.label}</span>
						</Link>
					</li>
				))}
			</ul>
			<div className="adm-cols">
				<section className="adm-box" aria-labelledby="recent-title">
					<h2 id="recent-title">Recently published</h2>
					<ul className="adm-list">
						{recent.map((p) => (
							<li key={p.id}>
								<Link href={`/admin/posts/${p.id}/`}>{p.title}</Link>
								<span>{formatAdminDate(p.published_at)}</span>
							</li>
						))}
					</ul>
				</section>
				<section className="adm-box" aria-labelledby="drafts-title">
					<h2 id="drafts-title">Drafts</h2>
					{drafts.length ? (
						<ul className="adm-list">
							{drafts.map((p) => (
								<li key={p.id}>
									<Link href={`/admin/posts/${p.id}/`}>{p.title || "(untitled)"}</Link>
									<span>Edited {formatAdminDate(p.modified_at)}</span>
								</li>
							))}
						</ul>
					) : (
						<p className="adm-hint">No drafts.</p>
					)}
				</section>
				<section className="adm-box" aria-labelledby="msg-title">
					<h2 id="msg-title">New messages</h2>
					{messages.length ? (
						<ul className="adm-list">
							{messages.map((m) => (
								<li key={m.id}>
									<Link href="/admin/messages/?filter=unread">
										{m.data.name || "Someone"} — {m.form === "contributor" ? "contributor application" : "contact form"}
									</Link>
									<span>{formatAdminDate(m.created_at)}</span>
								</li>
							))}
						</ul>
					) : (
						<p className="adm-hint">You’re all caught up.</p>
					)}
				</section>
			</div>
		</main>
	);
}
