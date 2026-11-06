/** Stores a form message in the admin inbox and emails it, with a per-visitor limit. */
import "server-only";
import { CONTACT } from "@/lib/config";
import { db } from "@/lib/db";
import { FORMS, formatSubmission, type FormKind, type FormValues } from "@/lib/forms";
import { sendMail } from "@/lib/mail";
import { getSettings } from "@/lib/settings";

// Best effort: limits one visitor to a few messages per window on each running server.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function tooMany(ip: string): boolean {
	const now = Date.now();
	const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
	hits.push(now);
	recent.set(ip, hits);
	if (recent.size > 5000) recent.clear();
	return hits.length > MAX_PER_WINDOW;
}

/** "newsletter" is the footer sign-up: just an email address. */
export type InboxKind = FormKind | "newsletter";

/** Null when delivered (stored, emailed, or both); otherwise the message to show the visitor. */
export async function deliver(kind: InboxKind, values: FormValues, ip: string): Promise<string | null> {
	if (tooMany(ip)) return `You’ve sent several messages in a short time. Please try again later, or email ${CONTACT.email}.`;
	let storedId: number | null = null;
	try {
		const [row] = await db()<{ id: number }[]>`insert into submissions (form, data) values (${kind}, ${db().json(values)}) returning id`;
		storedId = row.id;
	} catch (err) {
		console.error(`[form] ${kind} could not be stored`, err);
	}
	const { forms } = await getSettings();
	let emailed = false;
	try {
		const subject = kind === "newsletter" ? `Newsletter sign-up: ${values.email}` : `${FORMS[kind].subject}: ${values.name.replace(/\s+/g, " ")}`;
		const text = kind === "newsletter" ? `Email: ${values.email}` : formatSubmission(FORMS[kind], values);
		await sendMail({ subject, text, replyTo: values.email, ...(forms.notifyTo && { to: forms.notifyTo }) });
		emailed = true;
		if (storedId) await db()`update submissions set email_sent = true where id = ${storedId}`;
	} catch (err) {
		console.error(`[form] ${kind} could not be emailed`, err);
	}
	// The Contact form's automatic reply to the visitor, as Gravity Forms sent it. Best effort.
	if (kind === "contact" && forms.autoReply.enabled && values.email) {
		try {
			const name = values.name.split(/\s+/)[0] || "there";
			await sendMail({
				to: values.email,
				replyTo: forms.notifyTo || CONTACT.email,
				subject: forms.autoReply.subject,
				text: forms.autoReply.body.replace(/\{name\}/g, name),
			});
		} catch (err) {
			console.error("[form] automatic reply not sent", err);
		}
	}
	if (storedId || emailed) return null;
	return `Sorry, your message couldn’t be sent just now. Please try again, or email ${CONTACT.email} or call ${CONTACT.phone}.`;
}
