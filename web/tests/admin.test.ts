import assert from "node:assert/strict";
import { test } from "node:test";
import { fromLagosInput, RESERVED_SLUGS, toLagosInput, toSlug } from "../lib/admin-format.ts";
import { hashPassword, passwordProblem, verifyPassword } from "../lib/password.ts";

test("publication dates round-trip through Lagos time (UTC+1)", () => {
	assert.equal(toLagosInput("2026-03-01T09:30:00Z"), "2026-03-01T10:30");
	assert.equal(fromLagosInput("2026-03-01T10:30")?.toISOString(), "2026-03-01T09:30:00.000Z");
	assert.equal(fromLagosInput("not a date"), null);
	assert.equal(toLagosInput(null), "");
});

test("web addresses are lower-case words joined by hyphens", () => {
	assert.equal(toSlug("Court’s Ruling: What It Means (2026)"), "courts-ruling-what-it-means-2026");
	assert.equal(toSlug("  Éducation & Droit  "), "education-droit");
	assert.equal(toSlug("!!!"), "");
	assert.ok(RESERVED_SLUGS.includes("admin"));
});

test("passwords are hashed with a salt and verified", async () => {
	const hash = await hashPassword("a long enough passphrase");
	assert.notEqual(hash, await hashPassword("a long enough passphrase"));
	assert.equal(await verifyPassword("a long enough passphrase", hash), true);
	assert.equal(await verifyPassword("a long enough passphrasE", hash), false);
	assert.equal(await verifyPassword("anything", "not-a-hash"), false);
});

test("weak passwords are refused with a reason", () => {
	assert.match(passwordProblem("short") ?? "", /at least 12/);
	assert.match(passwordProblem("stephen-is-the-best", "stephen@stephenlegal.ng") ?? "", /email name/);
	assert.equal(passwordProblem("quiet river stone 42", "editor@stephenlegal.ng"), null);
});
