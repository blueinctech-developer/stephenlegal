import Script from "next/script";

/**
 * A public page in the original theme's markup. The body classes (and a saved dark-mode
 * choice) drive the theme's styles, so they are set before anything is painted. The
 * theme's behaviours run once the page is interactive (public/legacy/site.js, which
 * also loads jQuery, its Marquee plugin and Swiper).
 */
export function LegacyPage({ html, bodyClass }: { html: string; bodyClass: string }) {
	const early = `document.body.className=${JSON.stringify(bodyClass)};try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
	return (
		<>
			<script dangerouslySetInnerHTML={{ __html: early }} />
			<div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />
			<Script src="/legacy/site.js" strategy="afterInteractive" />
		</>
	);
}
