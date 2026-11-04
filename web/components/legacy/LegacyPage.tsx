import Script from "next/script";

/**
 * A public page in the original theme's markup. The body classes drive the theme's
 * styles, so they are set before anything is painted.
 */
export function LegacyPage({ html, bodyClass }: { html: string; bodyClass: string }) {
	return (
		<>
			<script dangerouslySetInnerHTML={{ __html: `document.body.className=${JSON.stringify(bodyClass)}` }} />
			<div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />
			<Script src="/legacy/site.js" strategy="afterInteractive" />
		</>
	);
}
