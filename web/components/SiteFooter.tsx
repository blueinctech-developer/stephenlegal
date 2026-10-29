import Image from "next/image";
import Link from "next/link";
import { DISCLAIMER, PUBLICATION_LINKS, SITE_NAME, SOCIAL } from "@/lib/config";
import type { Term } from "@/lib/wp";

export function SiteFooter({ topics }: { topics: Term[] }) {
	return (
		<footer className="site-footer surface-dark">
			<div className="wrap">
				<div className="site-footer__top">
					<Link className="logo logo--footer" href="/">
						<Image src="/img/logo-light.png" width={437} height={72} alt={SITE_NAME} />
					</Link>
					<form className="footer-search" role="search" method="get" action="/search/">
						<label htmlFor="footer-s">Search the archive</label>
						<div className="field-row">
							<input id="footer-s" type="search" name="q" required />
							<button type="submit" className="btn btn--accent">
								Search
							</button>
						</div>
					</form>
				</div>

				<div className="site-footer__cols">
					<div>
						<h2 className="footer-title">Topics</h2>
						<ul className="link-list link-list--cols">
							{topics.map((t) => (
								<li key={t.slug}>
									<Link href={`/category/${t.slug}/`}>{t.name}</Link>
								</li>
							))}
						</ul>
					</div>
					<div>
						<h2 className="footer-title">Publication</h2>
						<ul className="link-list">
							{PUBLICATION_LINKS.map((l) => (
								<li key={l.href}>
									<Link href={l.href}>{l.label}</Link>
								</li>
							))}
						</ul>
					</div>
					<div>
						<h2 className="footer-title">Follow</h2>
						<ul className="link-list">
							{SOCIAL.map((s) => (
								<li key={s.url}>
									<a href={s.url} rel="noopener me" target="_blank">
										{s.label}
										<span className="screen-reader-text"> (opens in a new tab)</span>
									</a>
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className="site-footer__legal">
					<p className="site-footer__disclaimer">{DISCLAIMER}</p>
					<p>
						© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
					</p>
				</div>
			</div>
		</footer>
	);
}
