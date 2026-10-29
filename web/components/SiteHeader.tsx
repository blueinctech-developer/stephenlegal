"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SearchDialog } from "./SearchDialog";

type Topic = { name: string; slug: string; count?: number };
type LinkItem = { label: string; href: string };

export function SiteHeader({ nav, topics, links, tagline }: { nav: Topic[]; topics: Topic[]; links: LinkItem[]; tagline: string }) {
	const pathname = usePathname();
	const reduce = useReducedMotion();
	const [menuOpen, setMenuOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [hidden, setHidden] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const toggleRef = useRef<HTMLButtonElement>(null);

	// Close the menu on navigation.
	const [lastPath, setLastPath] = useState(pathname);
	if (lastPath !== pathname) {
		setLastPath(pathname);
		setMenuOpen(false);
	}

	// Slide the header away while scrolling down; bring it back on any scroll up.
	useEffect(() => {
		let lastY = window.scrollY;
		let ticking = false;
		const onScroll = () => {
			if (ticking) return;
			ticking = true;
			requestAnimationFrame(() => {
				const y = window.scrollY;
				setScrolled(y > 8);
				if (Math.abs(y - lastY) > 6) setHidden(y > lastY && y > 240);
				lastY = y;
				ticking = false;
			});
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	// "/" or Ctrl/Cmd+K opens search; Escape closes the menu.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
			if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
				e.preventDefault();
				setSearchOpen(true);
			}
			if (e.key === "Escape" && menuOpen) {
				setMenuOpen(false);
				toggleRef.current?.focus();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [menuOpen]);

	const isCurrent = (slug: string) => pathname === `/category/${slug}/` || pathname.startsWith(`/category/${slug}/page/`);

	return (
		<>
			<header className={`site-header${hidden && !menuOpen && !searchOpen ? " is-hidden" : ""}${scrolled ? " is-scrolled" : ""}`}>
				<div className="wrap site-header__bar">
					<div className="brand">
						<Link className="logo" href="/" rel="home">
							<Image src="/img/logo-dark.png" width={437} height={72} alt="Stephen Legal — home" preload />
						</Link>
						{tagline && <p className="brand__tagline">{tagline}</p>}
					</div>

					<nav className="nav" aria-label="Sections">
						<ul className="nav__list">
							{nav.map((t) => (
								<li key={t.slug}>
									<Link href={`/category/${t.slug}/`} aria-current={isCurrent(t.slug) ? "page" : undefined}>
										{t.name}
									</Link>
								</li>
							))}
						</ul>
					</nav>

					<div className="site-header__tools">
						<button type="button" className="search-trigger" onClick={() => setSearchOpen(true)} aria-haspopup="dialog">
							<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
								<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
								<path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
							</svg>
							<span className="search-trigger__label">Search articles</span>
							<span className="screen-reader-text">Search</span>
							<kbd aria-hidden="true">/</kbd>
						</button>
						<button
							ref={toggleRef}
							className="menu-toggle"
							type="button"
							aria-expanded={menuOpen}
							aria-controls="site-menu"
							onClick={() => setMenuOpen((o) => !o)}
						>
							<span className="menu-toggle__icon" aria-hidden="true">
								<span />
							</span>
							<span className="menu-toggle__label">Menu</span>
						</button>
					</div>
				</div>

				<AnimatePresence initial={false}>
					{menuOpen && (
						<motion.div
							className="site-menu"
							id="site-menu"
							initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
							animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
							exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
							transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
							style={{ overflow: "hidden" }}
						>
							<div className="wrap site-menu__inner">
								<div className="site-menu__topics">
									<h2 className="site-menu__title">Topics</h2>
									<motion.ul
										className="topic-list"
										initial="hidden"
										animate="show"
										variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.025 } } }}
									>
										{topics.map((t) => (
											<motion.li key={t.slug} variants={{ hidden: { opacity: 0, y: reduce ? 0 : 8 }, show: { opacity: 1, y: 0 } }}>
												<Link href={`/category/${t.slug}/`} aria-current={isCurrent(t.slug) ? "page" : undefined}>
													{t.name} <span className="count">{t.count?.toLocaleString("en-GB")}</span>
												</Link>
											</motion.li>
										))}
									</motion.ul>
								</div>
								<div className="site-menu__pages">
									<h2 className="site-menu__title">Stephen Legal</h2>
									<ul className="link-list">
										{links.map((l) => (
											<li key={l.href}>
												<Link href={l.href}>{l.label}</Link>
											</li>
										))}
									</ul>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</header>
			<SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
		</>
	);
}
