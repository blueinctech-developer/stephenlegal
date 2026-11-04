import SiteLayout from "./(site)/layout";
import NotFound from "./(site)/not-found";

/** Addresses that match no route at all get the site's 404 page with its styles. */
export default function RootNotFound() {
	return (
		<SiteLayout>
			<NotFound />
		</SiteLayout>
	);
}
