import assert from "node:assert/strict";
import { test } from "node:test";
import { FORMS } from "../lib/forms.ts";
import { contributorForm, FIELD_NAMES, GF_IDS, wireForms } from "../lib/legacy/forms.ts";

const contactForm = `<form method='post' enctype='multipart/form-data'  id='gform_2'  action='/contact/' data-formid='2' novalidate>
<input name='input_4' id='input_2_4' type='text' value='' class='large'    aria-required="true" aria-invalid="false"  />
<input type='hidden' class='gform_hidden' name='state_2' value='WyJbXSIsImI2NTI0Il0=' />
<input type='submit' id='gform_submit_button_2' class='gform_button button' onclick='gform.submission.handleButtonClick(this);' value='Submit' />
</form>`;

test("old Gravity Forms post to the new endpoint without WordPress's hidden fields", () => {
	const html = wireForms(contactForm);
	assert.match(html, /action='\/api\/forms\/contact\/'/);
	assert.doesNotMatch(html, /state_2|novalidate|onclick=/);
	assert.match(html, /aria-required="true" required/);
	assert.match(html, /name="website"/, "spam trap added");
});

test("forms the site doesn't know about are left alone", () => {
	const other = contactForm.replace(/gform_2/g, "gform_9");
	assert.equal(wireForms(other), other);
});

test("old field names map onto every contact and contributor field", () => {
	assert.deepEqual(Object.values(FIELD_NAMES.contact).sort(), FORMS.contact.fields.map((f) => f.name).sort());
	assert.deepEqual(Object.values(FIELD_NAMES.contributor), FORMS.contributor.fields.map((f) => f.name));
	assert.deepEqual(Object.values(FIELD_NAMES.newsletter), ["email"]);
});

test("the contributor form uses the names the endpoint expects", () => {
	const html = wireForms(contributorForm());
	assert.match(html, new RegExp(`id='gform_${GF_IDS.contributor}'`));
	assert.match(html, /action='\/api\/forms\/contributor\/'/);
	for (const name of Object.keys(FIELD_NAMES.contributor)) assert.match(html, new RegExp(`name='${name}'`));
	assert.equal((html.match(/type='radio'/g) ?? []).length, 2);
});
