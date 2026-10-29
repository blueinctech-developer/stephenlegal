/**
 * The site's two forms, rebuilt from the Gravity Forms on the live Contact and
 * Become a Contributor pages (same fields, labels and required markers).
 * Pure so the same rules run in tests and on the server.
 */

export type FormKind = "contact" | "contributor";

export type Field = {
	name: string;
	label: string;
	type: "text" | "email" | "tel" | "textarea" | "radio";
	required: boolean;
	/** Required only when another field has this value. */
	requiredWhen?: { field: string; value: string };
	options?: string[];
	hint?: string;
	autoComplete?: string;
	inputMode?: "text" | "numeric" | "tel" | "email";
	maxLength: number;
	minLength?: number;
	/** Keep the label's capitals in error messages (it is a proper name). */
	properName?: boolean;
};

export type FormDef = { kind: FormKind; slug: string; title: string; subject: string; submit: string; success: string; fields: Field[] };

export const FORMS: Record<FormKind, FormDef> = {
	contact: {
		kind: "contact",
		slug: "contact",
		title: "Send a message",
		subject: "Contact form",
		submit: "Send message",
		success: "Thank you — your message has been sent. We’ll reply by email.",
		fields: [
			{ name: "name", label: "Full Name", type: "text", required: true, autoComplete: "name", maxLength: 100 },
			{ name: "email", label: "Email", type: "email", required: true, autoComplete: "email", inputMode: "email", maxLength: 200 },
			{ name: "phone", label: "Phone", type: "tel", required: true, autoComplete: "tel", inputMode: "tel", maxLength: 30 },
			{
				name: "message",
				label: "Message",
				type: "textarea",
				required: true,
				hint: "Please let us know what’s on your mind. Have a question for us? Ask away.",
				minLength: 10,
				maxLength: 5000,
			},
		],
	},
	contributor: {
		kind: "contributor",
		slug: "become-a-contributor",
		title: "Apply to contribute",
		subject: "Contributor application",
		submit: "Submit application",
		success: "Thank you — your application has been received. We’ll be in touch by email.",
		fields: [
			{ name: "name", label: "Full Name", type: "text", required: true, autoComplete: "name", maxLength: 100 },
			{ name: "phone", label: "Phone", type: "tel", required: true, autoComplete: "tel", inputMode: "tel", maxLength: 30 },
			{ name: "email", label: "Email", type: "email", required: true, autoComplete: "email", inputMode: "email", maxLength: 200 },
			{ name: "lawyer", label: "Are you a Nigerian Lawyer?", type: "radio", required: true, options: ["Yes", "No"], maxLength: 3 },
			{
				name: "enrollment",
				label: "Supreme Court Enrollment Number",
				type: "text",
				properName: true,
				required: false,
				requiredWhen: { field: "lawyer", value: "Yes" },
				hint: "Only needed if you are a Nigerian lawyer.",
				maxLength: 30,
			},
		],
	},
};

export const FORM_BY_SLUG: Record<string, FormKind> = Object.fromEntries(Object.values(FORMS).map((f) => [f.slug, f.kind]));

export type FormValues = Record<string, string>;
export type FormErrors = Record<string, string>;

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const PHONE = /^\+?[\d\s()-]+$/;
const ENROLLMENT = /^[a-z0-9/ .-]+$/i;

export function isRequired(field: Field, values: FormValues): boolean {
	return field.required || (field.requiredWhen ? values[field.requiredWhen.field] === field.requiredWhen.value : false);
}

/** Trims every field, drops anything not in the form, and returns messages keyed by field name. */
export function validateForm(def: FormDef, input: FormValues): { values: FormValues; errors: FormErrors } {
	const values: FormValues = {};
	for (const f of def.fields) values[f.name] = (input[f.name] ?? "").replace(/\r\n?/g, "\n").trim().slice(0, f.maxLength + 1);

	const errors: FormErrors = {};
	for (const f of def.fields) {
		const v = values[f.name];
		const label = f.label.replace(/\?$/, "");
		if (!v) {
			if (isRequired(f, values)) errors[f.name] = f.type === "radio" ? `Choose an answer for “${label}”.` : `Enter your ${f.properName ? label : label.toLowerCase()}.`;
			continue;
		}
		if (v.length > f.maxLength) errors[f.name] = `${label} must be ${f.maxLength} characters or fewer.`;
		else if (f.minLength && v.length < f.minLength) errors[f.name] = `${label} must be at least ${f.minLength} characters.`;
		else if (f.type === "email" && !EMAIL.test(v)) errors[f.name] = "Enter an email address like name@example.com.";
		else if (f.type === "tel" && (!PHONE.test(v) || v.replace(/\D/g, "").length < 7 || v.replace(/\D/g, "").length > 15))
			errors[f.name] = "Enter a phone number using digits, for example +234 806 000 0000.";
		else if (f.type === "radio" && !f.options?.includes(v)) errors[f.name] = `Choose an answer for “${label}”.`;
		else if (f.name === "enrollment" && !ENROLLMENT.test(v)) errors[f.name] = "Use letters, numbers and / only.";
		else if (f.type !== "textarea" && /\n/.test(v)) errors[f.name] = `${label} must be on one line.`;
	}
	return { values, errors };
}

/** Plain-text email body listing each answer under its label. */
export function formatSubmission(def: FormDef, values: FormValues): string {
	return def.fields
		.filter((f) => values[f.name])
		.map((f) => `${f.label}\n${values[f.name]}`)
		.join("\n\n");
}
