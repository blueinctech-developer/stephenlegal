import { SiteChrome } from "@/components/SiteChrome";
import NotFound from "./(site)/not-found";

/** Addresses that match no route at all still get the site's header and footer. */
export default function RootNotFound() {
	return (
		<SiteChrome>
			<NotFound />
		</SiteChrome>
	);
}
