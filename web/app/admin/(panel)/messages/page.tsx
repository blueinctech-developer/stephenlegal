import Link from "next/link";
import { formatAdminDate } from "@/lib/admin-format";
import { db } from "@/lib/db";
import { FORMS, type FormKind } from "@/lib/forms";
import { Flash } from "../Flash";
import { deleteMessage, markMessage } from "../manage-actions";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ filter?: string; ok?: string; error?: string }> }) {
	const sp = await searchParams;
	const unreadOnly = sp.filter === "unread";
	const sql = db();
	const rows = await sql<{ id: number; form: FormKind; data: Record<string, string>; email_sent: boolean; read_at: Date | null; created_at: Date }[]>`
		select * from submissions ${unreadOnly ? sql`where read_at is null` : sql``} order by created_at desc limit 200`;

	return (
		<main className="adm-page">
			<header className="adm-head">
				<h1>Messages</h1>
				<nav className="adm-seg" aria-label="Filter messages">
					<Link href="/admin/messages/" aria-current={!unreadOnly ? "page" : undefined}>
						All
					</Link>
					<Link href="/admin/messages/?filter=unread" aria-current={unreadOnly ? "page" : undefined}>
						Unread
					</Link>
				</nav>
			</header>
			<p className="adm-hint">Sent from the Contact and Become a Contributor forms. Each one is also emailed to the publication’s inbox when email is set up.</p>
			<Flash ok={sp.ok} error={sp.error} />
			{rows.length === 0 && <p className="adm-empty">No messages{unreadOnly ? " waiting" : " yet"}.</p>}
			<ul className="adm-messages">
				{rows.map((m) => {
					const def = FORMS[m.form];
					return (
						<li key={m.id} className={m.read_at ? "" : "is-unread"}>
							<article aria-labelledby={`m${m.id}`}>
								<header>
									<h2 id={`m${m.id}`}>
										{m.data.name || "Unknown"} <span className="adm-pill">{def?.subject ?? m.form}</span>
										{!m.read_at && <span className="adm-pill adm-pill--scheduled">New</span>}
									</h2>
									<p className="adm-hint">
										{formatAdminDate(m.created_at)}
										{!m.email_sent && " · not emailed"}
									</p>
								</header>
								<dl>
									{(def?.fields ?? [])
										.filter((f) => m.data[f.name])
										.map((f) => (
											<div key={f.name}>
												<dt>{f.label}</dt>
												<dd>
													{f.type === "email" ? (
														<a href={`mailto:${m.data[f.name]}`}>{m.data[f.name]}</a>
													) : f.type === "tel" ? (
														<a href={`tel:${m.data[f.name].replace(/\s/g, "")}`}>{m.data[f.name]}</a>
													) : (
														m.data[f.name]
													)}
												</dd>
											</div>
										))}
								</dl>
								<div className="adm-actions">
									{m.data.email && (
										<a className="btn btn--ghost" href={`mailto:${m.data.email}?subject=${encodeURIComponent("Re: your message to Stephen Legal")}`}>
											Reply by email
										</a>
									)}
									<form action={markMessage}>
										<input type="hidden" name="id" value={m.id} />
										<input type="hidden" name="read" value={m.read_at ? "0" : "1"} />
										<input type="hidden" name="filter" value={sp.filter ?? ""} />
										<button className="adm-link" type="submit">
											Mark as {m.read_at ? "unread" : "read"}
										</button>
									</form>
									<form action={deleteMessage}>
										<input type="hidden" name="id" value={m.id} />
										<button className="adm-link adm-link--danger" type="submit">
											Delete
										</button>
									</form>
								</div>
							</article>
						</li>
					);
				})}
			</ul>
		</main>
	);
}
