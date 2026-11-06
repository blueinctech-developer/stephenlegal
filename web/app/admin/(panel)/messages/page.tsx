import Link from "next/link";
import { formatAdminDate } from "@/lib/admin-format";
import { FORMS, type FormKind } from "@/lib/forms";
import { FORM_LABELS, inboxCounts, listInbox, parseFilter, STATUS_LABELS, type InboxStatus } from "@/lib/inbox";
import { Flash } from "../Flash";
import { deleteMessage, markMessage, updateMessage } from "../manage-actions";

type SP = { status?: string; form?: string; q?: string; filter?: string; ok?: string; error?: string };

/** Everything sent through the site's forms: read, track, annotate, search and export. */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<SP> }) {
	const sp = await searchParams;
	const filter = parseFilter(sp);
	const [rows, counts] = await Promise.all([listInbox(filter), inboxCounts()]);
	const query = new URLSearchParams(Object.entries({ status: filter.status, form: filter.form, q: filter.q, filter: filter.unread ? "unread" : undefined }).filter((e): e is [string, string] => Boolean(e[1])));
	const qs = query.toString() ? `?${query}` : "";
	const total = Object.values(counts).reduce((a, b) => a + b, 0);
	const tab = (status?: string) => {
		const p = new URLSearchParams(query);
		p.delete("filter");
		if (status) p.set("status", status);
		else p.delete("status");
		return `/admin/messages/${p.toString() ? `?${p}` : ""}`;
	};

	return (
		<main className="adm-page">
			<header className="adm-head">
				<h1>Messages</h1>
				<a className="btn btn--ghost" href={`/admin/messages/export/${qs}`} download>
					Export {rows.length === 1 ? "this message" : "these messages"} (CSV)
				</a>
			</header>
			<p className="adm-hint">From the Contact, Become a Contributor and newsletter forms. Each is also emailed to the publication when email is set up.</p>
			<Flash ok={sp.ok} error={sp.error} />

			<nav className="adm-seg" aria-label="Filter by status">
				<Link href={tab()} aria-current={!filter.status && !filter.unread ? "page" : undefined}>
					All <span className="adm-tally">{total}</span>
				</Link>
				{(Object.keys(STATUS_LABELS) as InboxStatus[]).map((s) => (
					<Link key={s} href={tab(s)} aria-current={filter.status === s ? "page" : undefined}>
						{STATUS_LABELS[s]} <span className="adm-tally">{counts[s] ?? 0}</span>
					</Link>
				))}
			</nav>

			<form className="adm-filters" role="search" action="/admin/messages/">
				{filter.status && <input type="hidden" name="status" value={filter.status} />}
				<div className="adm-field">
					<label htmlFor="mq">Search names, emails, messages and notes</label>
					<input id="mq" name="q" type="search" defaultValue={filter.q ?? ""} />
				</div>
				<div className="adm-field">
					<label htmlFor="mform">Form</label>
					<select id="mform" name="form" defaultValue={filter.form ?? ""}>
						<option value="">All forms</option>
						{Object.entries(FORM_LABELS).map(([k, v]) => (
							<option key={k} value={k}>
								{v}
							</option>
						))}
					</select>
				</div>
				<label className="adm-check">
					<input type="checkbox" name="filter" value="unread" defaultChecked={filter.unread} /> Unread only
				</label>
				<button className="btn" type="submit">
					Filter
				</button>
				{qs && (
					<Link className="adm-link" href="/admin/messages/">
						Clear
					</Link>
				)}
			</form>

			<p className="adm-hint" role="status">
				{rows.length === 0 ? "No messages match." : `${rows.length}${rows.length === 200 ? "+" : ""} message${rows.length === 1 ? "" : "s"}`}
			</p>
			<ul className="adm-messages">
				{rows.map((m) => {
					const def = m.form in FORMS ? FORMS[m.form as FormKind] : null;
					const fields = def ? def.fields.map((f) => ({ name: f.name, label: f.label, type: f.type })) : [{ name: "email", label: "Email", type: "email" }];
					return (
						<li key={m.id} id={`m${m.id}`} className={m.read_at ? "" : "is-unread"}>
							<article aria-labelledby={`mt${m.id}`}>
								<header>
									<h2 id={`mt${m.id}`}>
										{m.form === "newsletter" ? m.data.email : m.data.name || "Unknown"}{" "}
										<span className="adm-pill">{FORM_LABELS[m.form] ?? m.form}</span>{" "}
										<span className={`adm-pill adm-pill--${m.status}`}>{STATUS_LABELS[m.status] ?? m.status}</span>
										{!m.read_at && <span className="adm-pill adm-pill--scheduled">Unread</span>}
									</h2>
									<p className="adm-hint">
										{formatAdminDate(m.created_at)}
										{!m.email_sent && " · not emailed"}
									</p>
								</header>
								<dl>
									{fields
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
														<span className="adm-pre">{m.data[f.name]}</span>
													)}
												</dd>
											</div>
										))}
								</dl>
								<form action={updateMessage} className="adm-enquiry">
									<input type="hidden" name="id" value={m.id} />
									<input type="hidden" name="return" value={qs} />
									<div className="adm-field">
										<label htmlFor={`st${m.id}`}>Status</label>
										<select id={`st${m.id}`} name="status" defaultValue={m.status}>
											{(Object.keys(STATUS_LABELS) as InboxStatus[]).map((s) => (
												<option key={s} value={s}>
													{STATUS_LABELS[s]}
												</option>
											))}
										</select>
									</div>
									<div className="adm-field">
										<label htmlFor={`nt${m.id}`}>Private notes</label>
										<textarea id={`nt${m.id}`} name="notes" rows={2} defaultValue={m.notes} maxLength={5000} placeholder="Only visible here" />
									</div>
									<button className="btn" type="submit">
										Save
									</button>
								</form>
								<div className="adm-actions">
									{m.data.email && (
										<a className="btn btn--ghost" href={`mailto:${m.data.email}?subject=${encodeURIComponent("Re: your message to Stephen Legal")}`}>
											Reply by email
										</a>
									)}
									<form action={markMessage}>
										<input type="hidden" name="id" value={m.id} />
										<input type="hidden" name="read" value={m.read_at ? "0" : "1"} />
										<input type="hidden" name="return" value={qs} />
										<button className="adm-link" type="submit">
											Mark as {m.read_at ? "unread" : "read"}
										</button>
									</form>
									<details className="adm-confirm-details">
										<summary className="adm-link adm-link--danger">Delete</summary>
										<form action={deleteMessage} className="adm-confirm">
											<input type="hidden" name="id" value={m.id} />
											<input type="hidden" name="return" value={qs} />
											<span>Delete this message permanently?</span>
											<button className="btn btn--danger" type="submit">
												Yes, delete
											</button>
										</form>
									</details>
								</div>
							</article>
						</li>
					);
				})}
			</ul>
		</main>
	);
}
