import "server-only";
import { cleanArticleHtml } from "./sanitize";
import { addHeadingIds, type TocItem } from "./text";

/**
 * Stored article HTML, ready to render. It was cleaned when saved; cleaning it
 * again here means nothing unexpected reaches the page even if a row is edited
 * directly in the database. Images and embeds load lazily; headings get ids
 * for the table of contents.
 */
export function prepareContent(stored: string): { html: string; toc: TocItem[] } {
	const clean = cleanArticleHtml(stored)
		.replace(/<img /g, '<img loading="lazy" decoding="async" ')
		.replace(/<iframe (?![^>]*title=)/g, '<iframe title="Embedded media" ')
		.replace(/<iframe /g, '<iframe loading="lazy" ');
	return addHeadingIds(clean);
}
