import { LegacyPage } from "@/components/legacy/LegacyPage";
import { renderStaticPage } from "@/lib/legacy/pages";

const MESSAGE = `<p>It looks like nothing was found at this location. Maybe try a search?</p>
<form action="/" method="get" class="search-form"><input type="search" name="s" placeholder="Search Here" aria-label="Search"> <button type="submit" class="thm__btn">Search</button></form>`;

/** Unknown addresses: the theme's page layout with WordPress's standard "not found" wording. */
export default async function NotFound() {
	return <LegacyPage html={await renderStaticPage("404", "Oops! That page can’t be found.", MESSAGE)} bodyClass="error404 wp-theme-forcast ori-inner-page elementor-default elementor-kit-7" />;
}
