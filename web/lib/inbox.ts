/** Form messages (contact, contributor, newsletter) as the admin lists, filters and exports them. */
import "server-only";
import { db } from "./db";

export const STATUS_LABELS = { new: "New", in_progress: "In progress", resolved: "Resolved", spam: "Spam" } as const;
export type InboxStatus = keyof typeof STATUS_LABELS;
export const FORM_LABELS: Record<string, string> = { contact: "Contact", contributor: "Contributor", newsletter: "Newsletter" };

export type InboxFilter = { status?: string; form?: string; q?: string; unread?: boolean };
export type InboxRow = {
	id: number;
	form: string;
	data: Record<string, string>;
	status: InboxStatus;
	notes: string;
	email_sent: boolean;
	read_at: Date | null;
	created_at: Date;
	updated_at: Date;
};

/** Reads ?status=&form=&q=&filter=unread into a filter, ignoring unknown values. */
export function parseFilter(sp: Record<string, string | undefined>): InboxFilter {
	return {
		status: sp.status && sp.status in STATUS_LABELS ? sp.status : undefined,
		form: sp.form && sp.form in FORM_LABELS ? sp.form : undefined,
		q: sp.q?.trim().slice(0, 100) || undefined,
		unread: sp.filter === "unread",
	};
}

export async function listInbox(f: InboxFilter, limit = 200): Promise<InboxRow[]> {
	const sql = db();
	const like = f.q ? `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
	return sql<InboxRow[]>`
		select id, form, data, status, notes, email_sent, read_at, created_at, updated_at from submissions
		where true
		${f.status ? sql`and status = ${f.status}` : sql``}
		${f.form ? sql`and form = ${f.form}` : sql``}
		${f.unread ? sql`and read_at is null` : sql``}
		${like ? sql`and (data::text ilike ${like} or notes ilike ${like})` : sql``}
		order by created_at desc limit ${limit}`;
}

export async function inboxCounts(): Promise<Record<string, number>> {
	const rows = await db()<{ status: string; n: string }[]>`select status, count(*) as n from submissions group by status`;
	return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}
