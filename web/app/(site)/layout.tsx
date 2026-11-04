import { T } from "@/lib/legacy/render";

/** The original theme's stylesheets, in the order WordPress loaded them, then its inline settings and custom CSS. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			{/* eslint-disable-next-line @next/next/no-page-custom-font -- the theme's own Google Fonts request, on every public page via this layout */}
			<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Inter:100,200,300,400,500,600,700,800,900%7COutfit:100,200,300,400,500,600,700,800,900&subset=latin&display=swap" precedence="legacy" />
			{T.css.map((href) => (
				<link key={href} rel="stylesheet" href={href} precedence="legacy" />
			))}
			{/* eslint-disable-next-line @next/next/no-css-tags -- stand-ins for the theme's licensed fonts, loaded after its stylesheets */}
			<link rel="stylesheet" href="/legacy/standin/fonts.css" precedence="legacy" />
			<style href="legacy-inline" precedence="legacy-inline">
				{T.headStyles}
			</style>
			{children}
		</>
	);
}
