import assert from "node:assert/strict";
import { test } from "node:test";
import { addHeadingIds, cleanExcerpt, decodeEntities, readingMinutes, shouldShowToc, toText } from "../lib/text.ts";

test("decodes the entities WordPress puts in titles", () => {
	assert.equal(decodeEntities("Employer&#8217;s duty &amp; the &#8220;court&#8221; &hellip;"), "Employer’s duty & the “court” …");
	assert.equal(decodeEntities("&#x2014; &unknown;"), "— &unknown;");
});

test("strips markup, scripts and styles to text", () => {
	assert.equal(toText("<p>Hello <b>world</b></p><script>alert(1)</script><style>p{}</style>"), "Hello world");
});

test("cleans WordPress auto-excerpt endings", () => {
	assert.equal(cleanExcerpt("<p>The court held that [&hellip;]</p>"), "The court held that…");
});

test("reading time is at least one minute and about 220 wpm", () => {
	assert.equal(readingMinutes("<p>short</p>"), 1);
	assert.equal(readingMinutes(`<p>${"word ".repeat(1100)}</p>`), 5);
});

test("adds unique ids to H2/H3 and keeps existing ones", () => {
	const { html, toc } = addHeadingIds('<h2>Facts</h2><h3 id="keep">Issue</h3><h2>Facts</h2><h4>Ignored</h4>');
	assert.deepEqual(
		toc.map((t) => [t.id, t.level]),
		[["facts", 2], ["keep", 3], ["facts-2", 2]],
	);
	assert.match(html, /<h2 id="facts">Facts<\/h2>/);
	assert.match(html, /<h3 id="keep">/);
});

test("table of contents needs three headings and four minutes", () => {
	const toc = [1, 2, 3].map((n) => ({ id: `h${n}`, text: `H${n}`, level: 2 as const }));
	assert.equal(shouldShowToc(toc, 4), true);
	assert.equal(shouldShowToc(toc, 3), false);
	assert.equal(shouldShowToc(toc.slice(0, 2), 10), false);
});
