/** The site's Gravity Forms, kept as they looked, now posting to /api/forms/<kind>/. */
// Relative imports with extensions, so the tests can load this file directly.
import { FORMS, type Field } from "../forms.ts";
import type { InboxKind } from "../deliver.ts";

/** Gravity Forms ids on the old site (2 contact, 3 newsletter); the contributor form gets its own. */
export const GF_IDS: Record<InboxKind, number> = { contact: 2, newsletter: 3, contributor: 4 };

/** Old field names → this site's field names. */
export const FIELD_NAMES: Record<InboxKind, Record<string, string>> = {
	contact: { input_4: "name", input_2: "email", input_5: "phone", input_3: "message" },
	newsletter: { input_2: "email" },
	contributor: Object.fromEntries(FORMS.contributor.fields.map((f, i) => [`input_${i + 1}`, f.name])),
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Points a Gravity Form in the old markup at the new endpoint, drops its WordPress-only hidden fields and adds a spam trap. */
export function wireForms(html: string, confirmations: Partial<Record<InboxKind, string>> = {}): string {
	return html.replace(/<form\b([^>]*?)id='gform_(\d+)'([^>]*)>([\s\S]*?)<\/form>/g, (whole, a: string, id: string, b: string, inner: string) => {
		const kind = (Object.keys(GF_IDS) as InboxKind[]).find((k) => GF_IDS[k] === Number(id));
		if (!kind) return whole;
		// The thank-you text shown after sending (public/legacy/site.js reads it).
		const thanks = confirmations[kind] ? ` data-confirmation='${esc(confirmations[kind]!)}'` : "";
		const attrs = `${a}id='gform_${id}'${b}${thanks}`.replace(/action='[^']*'/, `action='/api/forms/${kind}/'`).replace(/ novalidate/, "");
		const body = inner
			.replace(/<input type='hidden'[^>]*>/g, "")
			.replace(/ onclick='[^']*'/g, "")
			.replace(/ onkeypress='[^']*'/g, "")
			.replace(/aria-required="true"/g, 'aria-required="true" required');
		const trap = `<div style="position:absolute;left:-9999px" aria-hidden="true"><label>Leave empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>`;
		return `<form${attrs}>${body}${trap}</form>`;
	});
}

function gfField(f: Field, form: number, i: number): string {
	const id = `input_${form}_${i}`;
	const name = `input_${i}`;
	const required = f.required ? `<span class="gfield_required"><span class="gfield_required gfield_required_asterisk">*</span></span>` : "";
	const req = f.required ? ' aria-required="true" required' : "";
	const type = f.type === "textarea" ? "textarea" : f.type === "radio" ? "radio" : f.type === "tel" ? "phone" : f.type === "email" ? "email" : "text";
	const label = `<label class='gfield_label gform-field-label' for='${id}'>${esc(f.label)}${required}</label>`;
	const hint = f.hint ? `<div class='gfield_description' id='gfield_description_${form}_${i}'>${esc(f.hint)}</div>` : "";
	let input: string;
	if (f.type === "textarea") input = `<textarea name='${name}' id='${id}' class='textarea large' rows='10' cols='50'${req}></textarea>`;
	else if (f.type === "radio")
		input = `<div class='gfield_radio' id='${id}'>${(f.options ?? [])
			.map((o, j) => `<div class='gchoice gchoice_${form}_${i}_${j}'><input class='gfield-choice-input' name='${name}' type='radio' value='${esc(o)}' id='choice_${form}_${i}_${j}'${req}/><label for='choice_${form}_${i}_${j}' id='label_${form}_${i}_${j}' class='gform-field-label gform-field-label--type-inline'>${esc(o)}</label></div>`)
			.join("")}</div>`;
	else input = `<input name='${name}' id='${id}' type='${f.type}' value='' class='large'${f.maxLength ? ` maxlength='${f.maxLength}'` : ""}${req}/>`;
	return `<div id="field_${form}_${i}" class="gfield gfield--type-${type} gfield--width-full${f.required ? " gfield_contains_required" : ""} field_sublabel_above field_description_above field_validation_below gfield_visibility_visible">${label}${hint}<div class='ginput_container ginput_container_${type}'>${input}</div></div>`;
}

/** The Become a Contributor form in Gravity Forms markup (its WordPress page was built in Elementor and did not come across). */
export function contributorForm(): string {
	const id = GF_IDS.contributor;
	const fields = FORMS.contributor.fields.map((f, i) => gfField(f, id, i + 1)).join("");
	return `<div class='gform_wrapper gform-theme gform-theme--foundation gform-theme--framework gform-theme--orbital' data-form-theme='orbital' id='gform_wrapper_${id}'>
<div class='gform_heading'><p class='gform_required_legend'>&quot;<span class="gfield_required gfield_required_asterisk">*</span>&quot; indicates required fields</p></div>
<form method='post' enctype='multipart/form-data' id='gform_${id}' action='/become-a-contributor/'>
<div class='gform-body gform_body'><div id='gform_fields_${id}' class='gform_fields top_label form_sublabel_above description_above validation_below'>${fields}</div></div>
<div class='gform_footer before'><input type='submit' id='gform_submit_button_${id}' class='gform_button button' value='${esc(FORMS.contributor.submit)}'/></div>
</form>
</div>`;
}
