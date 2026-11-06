/**
 * Puts the admin's site settings into the original theme's markup: header menu,
 * social links, side-panel and footer contact details, copyright. A setting still
 * at its default leaves the markup exactly as it was copied from WordPress.
 * No database access here, so tests can load it.
 */
import { DEFAULT_SETTINGS, type MenuItem, type SiteSettings } from "../site-settings.ts";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The lightning icon the theme shows before "Trending". */
const BOLT = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.20496 0.25L0.954956 7.75H6.57996L5.95496 12.75L12.205 5.25H6.57996L7.20496 0.25Z" fill="#E90606"/></svg>`;

/** Menu items in the theme's markup; the mobile menu marks parents "dropdown", the desktop one "menu-item-has-children". */
export function menuHtml(items: MenuItem[], mobile: boolean): string {
	const li = (m: MenuItem): string => {
		const parent = Boolean(m.children?.length);
		const cls = `menu-item${parent ? (mobile ? " dropdown" : " menu-item-has-children") : ""}`;
		const label = `${m.icon === "bolt" ? `${BOLT} ` : ""}${esc(m.label)}`;
		const sub = parent ? `\n<ul class="sub-menu">\n${m.children!.map(li).join("\n")}\n</ul>\n` : "";
		return `<li class="${cls}"><a href="${esc(m.href)}">${label}</a>${sub}</li>`;
	};
	return items.map(li).join("\n");
}

/** Replaces the content of every <ul> whose opening tag contains `marker` (balanced on nested lists). */
function replaceLists(html: string, marker: string, inner: string): string {
	let out = "";
	let pos = 0;
	for (let at = html.indexOf(marker); at >= 0; at = html.indexOf(marker, pos)) {
		const open = html.lastIndexOf("<ul", at);
		const openEnd = html.indexOf(">", at) + 1;
		const re = /<ul\b|<\/ul>/g;
		re.lastIndex = open;
		let depth = 0;
		let end = -1;
		for (let m; (m = re.exec(html)); ) {
			depth += m[0] === "</ul>" ? -1 : 1;
			if (depth === 0) {
				end = m.index;
				break;
			}
		}
		if (end < 0) break;
		out += html.slice(pos, openEnd) + "\n" + inner + "\n";
		pos = end;
	}
	return out + html.slice(pos);
}

/** Social links are found by their icon, in the header and the footer. */
const ICONS: Record<keyof SiteSettings["social"], string> = { facebook: "facebook-f", x: "x-twitter", instagram: "instagram", youtube: "youtube", linkedin: "linkedin-in" };

function setSocial(html: string, icon: string, href: string): string {
	const re = new RegExp(String.raw`(<a\b[^>]*href=")[^"]*("[^>]*>\s*(?:<span[^>]*>[^<]*</span>\s*)?<i[^>]*class="(?:fab|fa) fa-${icon}")`, "g");
	return html.replace(re, `$1${esc(href)}$2`);
}

/** Replaces one piece of printed text everywhere, when the setting has changed. */
const swap = (html: string, from: string, to: string) => (from === to || !from ? html : html.split(esc(from)).join(esc(to)).split(from).join(esc(to)));

export function applySettings(html: string, s: SiteSettings): string {
	const d = DEFAULT_SETTINGS;
	let out = html;
	if (!same(s.menu, d.menu) && s.menu.length) {
		out = replaceLists(out, 'class="byteflows_menu-nav"', menuHtml(s.menu, false));
		out = replaceLists(out, 'class="empath-mobile-menu"', menuHtml(s.menu, true));
	}
	for (const key of Object.keys(ICONS) as (keyof SiteSettings["social"])[]) if (s.social[key] !== d.social[key]) out = setSocial(out, ICONS[key], s.social[key]);
	out = swap(out, d.panel.address, s.panel.address);
	out = swap(out, d.panel.email, s.panel.email);
	// The side panel and the Contact page print the phone the same way; the footer without dashes.
	out = swap(out, d.panel.phone, s.panel.phone);
	out = swap(out, d.footer.phone, s.footer.phone);
	out = swap(out, d.footer.copyright, s.footer.copyright);
	if (s.footer.email !== d.footer.email) out = out.replace(/(<strong>Email Us:<\/strong><\/span>\s*<span[^>]*>)[^<]*/g, `$1${esc(s.footer.email)}`);
	return out;
}
