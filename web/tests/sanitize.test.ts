import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanArticleHtml } from "../lib/sanitize.ts";

test("flattens page-builder wrappers and whitespace into plain article HTML", () => {
	const raw = `<div class="elementor"><div class="e-con"><h1 class="x">Title</h1>
		<p class="wp-block-paragraph">Hello
			<strong>world</strong> <em>again</em></p><p>&nbsp;</p><script>alert(1)</script></div></div>`;
	assert.equal(cleanArticleHtml(raw), "<h2>Title</h2>\n<p>Hello <strong>world</strong> <em>again</em></p>");
});

test("localises links and swaps file URLs", () => {
	const raw = `<p><a href="https://stephenlegal.ng/some-post/">a</a> <a href="https://example.com/x">b</a> <img src="https://stephenlegal.ng/wp-content/uploads/2020/01/p-300x200.jpg" srcset="x 300w"></p>`;
	const out = cleanArticleHtml(raw, { siteOrigins: ["https://stephenlegal.ng"], mapUrl: (u) => (u.includes("/uploads/") ? "/uploads/2020/01/p.jpg" : undefined) });
	assert.equal(out, `<p><a href="/some-post/">a</a> <a href="https://example.com/x" target="_blank" rel="noopener noreferrer">b</a> <img src="/uploads/2020/01/p.jpg" /></p>`);
});

test("drops embeds from unknown hosts and the old form note", () => {
	const raw = `<iframe src="https://evil.example/x"></iframe><p>"*" indicates required fields</p><iframe src="https://www.youtube.com/embed/abc"></iframe>`;
	assert.equal(cleanArticleHtml(raw), `<iframe src="https://www.youtube.com/embed/abc"></iframe>`);
});
