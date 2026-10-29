import assert from "node:assert/strict";
import { test } from "node:test";
import { FORM_BY_SLUG, FORMS, formatSubmission, validateForm } from "../lib/forms.ts";

const contact = { name: "Ada Obi", email: "ada@example.com", phone: "+234 806 000 0000", message: "I have a question about tenancy law." };

test("contact form accepts a complete message and trims values", () => {
	const { values, errors } = validateForm(FORMS.contact, { ...contact, name: "  Ada Obi  ", extra: "dropped" });
	assert.deepEqual(errors, {});
	assert.equal(values.name, "Ada Obi");
	assert.equal("extra" in values, false);
});

test("contact form reports each missing or malformed field", () => {
	const { errors } = validateForm(FORMS.contact, { name: "", email: "not-an-email", phone: "call me", message: "hi" });
	assert.deepEqual(Object.keys(errors).sort(), ["email", "message", "name", "phone"]);
});

test("single-line fields reject line breaks (no header injection)", () => {
	const { errors } = validateForm(FORMS.contact, { ...contact, name: "Ada\nBcc: x@example.com" });
	assert.ok(errors.name);
});

test("enrollment number is required only for Nigerian lawyers", () => {
	const base = { name: "Ada Obi", phone: "08060000000", email: "ada@example.com" };
	assert.ok(validateForm(FORMS.contributor, { ...base, lawyer: "Yes" }).errors.enrollment);
	assert.deepEqual(validateForm(FORMS.contributor, { ...base, lawyer: "No" }).errors, {});
	assert.deepEqual(validateForm(FORMS.contributor, { ...base, lawyer: "Yes", enrollment: "SCN/012345" }).errors, {});
	assert.ok(validateForm(FORMS.contributor, { ...base, lawyer: "Maybe" }).errors.lawyer);
});

test("forms map to the live page slugs and format as labelled text", () => {
	assert.equal(FORM_BY_SLUG["contact"], "contact");
	assert.equal(FORM_BY_SLUG["become-a-contributor"], "contributor");
	assert.match(formatSubmission(FORMS.contact, contact), /^Full Name\nAda Obi\n\nEmail\nada@example.com/);
});
