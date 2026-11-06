/*
 * Behaviours of the original Forcast theme (its own script was not available),
 * written against the same markup and state classes: side panel, mobile menu,
 * search overlay, sticky menu bar, story tabs, dark mode and bookmarks.
 */
(() => {
	const $ = (s, root = document) => root.querySelector(s);
	const $$ = (s, root = document) => [...root.querySelectorAll(s)];
	const on = (sel, type, fn) => document.addEventListener(type, (e) => { const el = e.target.closest(sel); if (el) fn(e, el); });
	const overlay = () => $$(".bytf__body-overlay");

	function closeAll() {
		document.body.classList.remove("active-hidden-bar");
		$$(".slide-bar.show").forEach((el) => el.classList.remove("show"));
		$$(".bytf__search-wrapper.opened").forEach((el) => el.classList.remove("opened"));
		overlay().forEach((el) => el.classList.remove("opened"));
	}

	// Side panel (the two-bar button left of the logo).
	on(".toggle-hidden-bar", "click", () => document.body.classList.add("active-hidden-bar"));
	on(".hidden-bar .close-btn, .hidden-bar-back-drop", "click", closeAll);

	// Mobile menu.
	on(".bytf__mobile-menu", "click", () => {
		$$(".slide-bar").forEach((el) => el.classList.add("show"));
		overlay().forEach((el) => el.classList.add("opened"));
	});
	on(".close-mobile-menu a", "click", (e) => { e.preventDefault(); closeAll(); });
	// Sub-menus start folded, as the theme's menu script left them.
	$$(".empath-mobile-menu .sub-menu").forEach((sub) => { sub.classList.add("mm-collapse"); sub.style.display = "none"; });
	on(".empath-mobile-menu li.dropdown > a, .empath-mobile-menu li.menu-item-has-children > a", "click", (e, a) => {
		const sub = a.parentElement.querySelector(":scope > .sub-menu");
		if (!sub) return;
		e.preventDefault();
		const open = a.parentElement.classList.toggle("mm-active");
		sub.classList.toggle("mm-show", open);
		sub.style.display = open ? "block" : "none";
	});

	// Search overlay.
	on(".search__open-btn", "click", () => {
		$$(".bytf__search-wrapper").forEach((el) => el.classList.add("opened"));
		overlay().forEach((el) => el.classList.add("opened"));
		setTimeout(() => $(".bytf__search-wrapper.opened input[name=s]")?.focus(), 100);
	});
	on(".bytf__search-close-btn, .bytf__body-overlay", "click", closeAll);
	document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

	// Sticky menu bar, as the theme does it: a copy of the bar slides in at the top when
	// the reader scrolls back up after passing 300px, and hides again on the way down.
	const stickyCopies = $$(".bytf-sticky-header").map((bar) => {
		bar.classList.add("original");
		const copy = bar.cloneNode(true);
		copy.classList.remove("original");
		copy.classList.add("main-header-sticky", "rr-sticky-stt");
		bar.after(copy);
		return copy;
	});
	let lastY = window.scrollY;
	window.addEventListener(
		"scroll",
		() => {
			const y = window.scrollY;
			const up = y < lastY;
			lastY = y;
			stickyCopies.forEach((c) => c.classList.toggle("bytf-sticky-header-fixed", up && y > 300));
			if (stickyCopies.length) document.body.classList.add("bytf-sticky-header-sticky");
		},
		{ passive: true },
	);

	// Story tabs (Top stories / Trending News / Latest News).
	on(".bytf__post-tab-wrapper .nav-link", "click", (e, btn) => {
		const wrap = btn.closest(".bytf__post-tab-wrapper");
		const tabs = $$(".nav-link", wrap);
		const panes = $$(":scope > .tab-content > .tab-pane", wrap);
		const i = tabs.indexOf(btn);
		tabs.forEach((t, j) => t.classList.toggle("active", j === i));
		panes.forEach((p, j) => { p.classList.toggle("active", j === i); p.classList.toggle("show", j === i); });
	});

	// Dark mode, remembered in this browser (same storage key as the theme, so readers keep their choice).
	const KEY = "theme";
	const setTheme = (dark) => {
		document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
		$$(".empath-switch-box__input").forEach((i) => (i.checked = dark));
		try { localStorage.setItem(KEY, dark ? "dark" : "light"); } catch {}
	};
	let saved = null;
	try { saved = localStorage.getItem(KEY); } catch {}
	if (saved) setTheme(saved === "dark");
	on(".dark__switch label, .dark__switch .toggle-label", "click", (e) => {
		e.preventDefault();
		setTheme(document.documentElement.getAttribute("data-theme") !== "dark");
	});
	on(".empath-switch-box__input", "change", (e, input) => setTheme(input.checked));

	// Bookmarks, kept in this browser.
	const BKEY = "sl-bookmarks";
	const marks = () => { try { return JSON.parse(localStorage.getItem(BKEY) || "[]"); } catch { return []; } };
	const hrefOf = (el) => el.closest("article, .bytf__content, [class*='-item'], .single__one_top")?.querySelector("a[href^='/']:not([href^='/category/']):not([href^='/author/'])")?.getAttribute("href") || location.pathname;
	const paint = () => { const m = marks(); $$(".bookmark-trigger").forEach((b) => b.classList.toggle("active", m.includes(hrefOf(b)))); };
	on(".bookmark-trigger", "click", (e, b) => {
		const href = hrefOf(b);
		const m = marks();
		const next = m.includes(href) ? m.filter((x) => x !== href) : [...m, href];
		try { localStorage.setItem(BKEY, JSON.stringify(next)); } catch {}
		paint();
	});
	paint();

	// The /bookmark/ page lists them.
	const list = document.getElementById("sl-bookmarks");
	const savedLinks = marks().filter((h) => /^\/[a-z0-9-]+\/$/i.test(h));
	if (list && savedLinks.length) {
		const name = (h) => h.slice(1, -1).replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
		list.innerHTML = `<ul>${savedLinks.map((h) => `<li><a href="${h}">${name(h)}</a></li>`).join("")}</ul>`;
	}
})();

/* Form results: /api/forms/ sends visitors back with ?gf=<form id>&sent=1 or &error=… */
(() => {
	const q = new URLSearchParams(location.search);
	const id = q.get("gf");
	const wrap = id && document.getElementById(`gform_wrapper_${id}`);
	if (!wrap) return;
	const text = (s) => { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; };
	if (q.get("sent")) {
		// Each form's thank-you text comes from Admin → Settings (data-confirmation on the form).
		const thanks = wrap.querySelector("form")?.dataset.confirmation || "Thanks for contacting us! We will get in touch with you shortly.";
		wrap.outerHTML = `<div id="gform_confirmation_wrapper_${id}" class="gform_confirmation_wrapper"><div id="gform_confirmation_message_${id}" class="gform_confirmation_message_${id} gform_confirmation_message" role="status">${text(thanks)}</div></div>`;
		document.getElementById(`gform_confirmation_wrapper_${id}`)?.scrollIntoView({ block: "center" });
	} else if (q.get("error")) {
		wrap.insertAdjacentHTML("afterbegin", `<div class="gform_validation_errors" role="alert"><h2 class="gform_submission_error">${text(q.get("error"))}</h2></div>`);
		wrap.scrollIntoView({ block: "center" });
	}
	history.replaceState(null, "", location.pathname);
})();

/* Moving parts, with the theme's own settings (forcast-core.js): the Highlights ticker
   (jQuery Marquee) and the quote and post sliders (Swiper 6). The libraries are loaded
   here, in order, once the page is interactive. */
(async () => {
	const load = (src) =>
		new Promise((resolve, reject) => {
			const s = document.createElement("script");
			s.src = src;
			s.onload = resolve;
			s.onerror = reject;
			document.body.append(s);
		});
	try {
		if (!window.jQuery) await load("/legacy/vendor/jquery.min.js");
		if (!window.jQuery.fn.marquee) await load("/legacy/vendor/jquery.marquee.min.js");
		if (!window.Swiper) await load("/legacy/vendor/swiper-bundle.min.js");
	} catch {
		return;
	}
	const $ = window.jQuery;
	if ($ && $.fn.marquee)
		$(".post-ov-sroller").marquee({ gap: 0, speed: 80, delayBeforeStart: 0, direction: "left", duplicated: true, pauseOnHover: true, startVisible: true });
	if (!window.Swiper) return;
	if (document.querySelector(".quoteslide__active"))
		new Swiper(".quoteslide__active", { slidesPerView: 1, loop: true, speed: 2000, spaceBetween: 30, autoplay: { delay: 5000 } });
	if (document.querySelector(".post_slider_three__active")) {
		const thumbs = document.querySelector(".post_slider_three__thumb")
			? new Swiper(".post_slider_three__thumb", {
					slidesPerView: 3,
					freeMode: true,
					spaceBetween: 36,
					watchSlidesVisibility: true,
					watchSlidesProgress: true,
					breakpoints: { 320: { slidesPerView: 1, spaceBetween: 10 }, 480: { slidesPerView: 1, spaceBetween: 20 }, 768: { slidesPerView: 2, spaceBetween: 30 }, 1024: { slidesPerView: 3, spaceBetween: 36 } },
				})
			: undefined;
		new Swiper(".post_slider_three__active", {
			effect: "slide",
			parallax: true,
			speed: 1600,
			autoplay: { delay: 10000, disableOnInteraction: false },
			navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
			...(thumbs && { thumbs: { swiper: thumbs } }),
		});
	}
})();

/* Article view counter (app/api/views/), as the theme counted reads. */
(() => {
	const id = /\bpostid-(\d+)\b/.exec(document.body.className)?.[1];
	if (!id || !document.body.classList.contains("single-post") || location.pathname.startsWith("/admin/")) return;
	try {
		navigator.sendBeacon(`/api/views/${id}/`);
	} catch {}
})();
