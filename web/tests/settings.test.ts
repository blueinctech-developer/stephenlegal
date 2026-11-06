import assert from "node:assert/strict";
import { test } from "node:test";
import { applySettings, menuHtml } from "../lib/legacy/apply-settings.ts";
import { wireForms } from "../lib/legacy/forms.ts";
import { cleanMenu, DEFAULT_SETTINGS, mergeSettings } from "../lib/site-settings.ts";

const header = `<div class="header__social-icon"><a title="facebook" href="https://www.facebook.com/stephenlegalblog"><i aria-hidden="true" class="fab fa-facebook-f"></i></a><a title="youtube" href="#"><i aria-hidden="true" class="fab fa-youtube"></i></a></div>
<ul id="byteflows-main-nav" class="byteflows_menu-nav"><li class="menu-item"><a href="/">Home</a></li><li class="menu-item menu-item-has-children"><a href="#">Trending</a>
<ul class="sub-menu"><li class="menu-item"><a href="/category/trending/">Trending Stories</a></li></ul></li></ul>
<ul id="empath-mobile-menu" class="empath-mobile-menu"><li class="menu-item"><a href="/">Home</a></li></ul>
<p><strong>PHONE:</strong> +234-80-638-68497</p><p><strong>E-MAIL:</strong> your-email@mail.com</p>
<p><span><strong>Email Us:</strong></span> <span style="color: #a6a6a7;">info@stephenlegal.ng</span></p>
<a class="elementor-icon elementor-social-icon elementor-social-icon-youtube" href="http://youtube.com" target="_blank"> <span class="elementor-screen-only">Youtube</span> <i aria-hidden="true" class="fab fa-youtube"></i> </a>
<p>© 2025 Stephen Legal Blog | All Rights Reserved</p>`;

test("unchanged settings leave the copied WordPress markup exactly as it was", () => {
	assert.equal(applySettings(header, structuredClone(DEFAULT_SETTINGS)), header);
});

test("edited settings reach the header, side panel and footer", () => {
	const s = structuredClone(DEFAULT_SETTINGS);
	s.social.youtube = "https://youtube.com/@stephenlegal";
	s.panel.email = "editor@stephenlegal.ng";
	s.footer.email = "hello@stephenlegal.ng";
	s.footer.copyright = "© 2026 Stephen Legal";
	s.menu = [{ label: "Home", href: "/" }, { label: "Case Law", href: "/category/case-law/", children: [{ label: "Tips", href: "/category/legal-tips-digest/" }] }];
	const out = applySettings(header, s);
	assert.equal((out.match(/href="https:\/\/youtube\.com\/@stephenlegal"/g) ?? []).length, 2, "header and footer YouTube links");
	assert.match(out, /https:\/\/www\.facebook\.com\/stephenlegalblog/, "untouched links stay");
	assert.match(out, /E-MAIL:<\/strong> editor@stephenlegal\.ng/);
	assert.match(out, /Email Us:<\/strong><\/span> <span[^>]*>hello@stephenlegal\.ng/);
	assert.match(out, /© 2026 Stephen Legal/);
	assert.match(out, /<li class="menu-item menu-item-has-children"><a href="\/category\/case-law\/">Case Law<\/a>/);
	assert.match(out, /<li class="menu-item dropdown"><a href="\/category\/case-law\/">Case Law<\/a>/, "mobile menu uses the theme's dropdown class");
	assert.doesNotMatch(out, /Trending Stories/);
});

test("menu labels are escaped and the Trending icon is kept", () => {
	const html = menuHtml([{ label: "Law & <Order>", href: "/x/", icon: "bolt" }], false);
	assert.match(html, /Law &amp; &lt;Order&gt;/);
	assert.match(html, /<svg/);
});

test("saved settings merge over the defaults; bad values fall back", () => {
	const s = mergeSettings([
		{ key: "footer", value: { copyright: "© Stephen Legal" } },
		{ key: "menu", value: "not a list" },
		{ key: "unknown", value: { x: 1 } },
	]);
	assert.equal(s.footer.copyright, "© Stephen Legal");
	assert.equal(s.footer.email, DEFAULT_SETTINGS.footer.email, "unsaved fields keep their default");
	assert.deepEqual(s.menu, DEFAULT_SETTINGS.menu);
});

test("menus accept only safe links, two levels deep", () => {
	const menu = cleanMenu([
		{ label: "Home", href: "/" },
		{ label: "Bad", href: "javascript:alert(1)" },
		{ label: "Parent", href: "#", children: [{ label: "Child", href: "https://example.com", children: [{ label: "Too deep", href: "/" }] }] },
	]);
	assert.deepEqual(menu.map((m) => m.label), ["Home", "Parent"]);
	assert.deepEqual(menu[1].children, [{ label: "Child", href: "https://example.com" }]);
});

test("each form carries its thank-you message from the settings", () => {
	const html = wireForms(`<form method='post' id='gform_3' action='/'><input name='input_2'></form>`, { newsletter: "Thanks, you're on the list!" });
	assert.match(html, /data-confirmation='Thanks, you&#39;re on the list!'/);
});
