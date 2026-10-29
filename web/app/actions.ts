"use server";

import { headers } from "next/headers";
import { CONTACT } from "@/lib/config";
import { FORMS, formatSubmission, validateForm, type FormErrors, type FormKind, type FormValues } from "@/lib/forms";
import { sendMail } from "@/lib/mail";

export type FormState = { status: "idle" | "ok" | "invalid" | "failed"; message?: string; errors?: FormErrors; values?: FormValues; n: number };

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

export async function submitForm(kind: FormKind, prev: FormState, formData: FormData): Promise<FormState> {
	const def = FORMS[kind];
	const n = prev.n + 1;

	// Hidden field that people never see; bots that fill it get a quiet "success".
	if (String(formData.get("website") ?? "")) return { status: "ok", message: def.success, n };

	const input: FormValues = {};
	for (const f of def.fields) input[f.name] = String(formData.get(f.name) ?? "");
	const { values, errors } = validateForm(def, input);
	if (Object.keys(errors).length) {
		return { status: "invalid", message: "Please correct the highlighted fields.", errors, values, n };
	}

	const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
	if (tooMany(ip)) {
		return { status: "failed", message: `You’ve sent several messages in a short time. Please try again later, or email ${CONTACT.email}.`, values, n };
	}

	try {
		await sendMail({ subject: `${def.subject}: ${values.name.replace(/\s+/g, " ")}`, text: formatSubmission(def, values), replyTo: values.email });
	} catch (err) {
		console.error(`[form] ${kind} could not be sent`, err);
		return {
			status: "failed",
			message: `Sorry, your message couldn’t be sent just now. Please try again, or email ${CONTACT.email} or call ${CONTACT.phone}.`,
			values,
			n,
		};
	}
	return { status: "ok", message: def.success, n };
}
