"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

/**
 * Scrolling strip of the latest headlines. It pauses on hover/focus and has a
 * pause control (WCAG 2.2.2); with reduced motion it becomes a static, scrollable row.
 */
export function Ticker({ items }: { items: { title: string; href: string }[] }) {
	const [paused, setPaused] = useState(false);
	if (!items.length) return null;
	const list = (copy: boolean) => (
		<ul className="ticker__list" aria-hidden={copy || undefined}>
			{items.map((item) => (
				<li key={item.href}>
					<Link href={item.href} tabIndex={copy ? -1 : undefined}>
						{item.title}
					</Link>
				</li>
			))}
		</ul>
	);
	return (
		<section className={`ticker${paused ? " is-paused" : ""}`} aria-label="Latest headlines">
			<div className="wrap ticker__inner">
				<p className="ticker__label">Latest</p>
				<div className="ticker__viewport">
					<div className="ticker__track" style={{ "--ticker-duration": `${items.length * 7}s` } as CSSProperties}>
						{list(false)}
						{list(true)}
					</div>
				</div>
				<button type="button" className="ticker__toggle" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
					<span className="screen-reader-text">{paused ? "Play headlines" : "Pause headlines"}</span>
					<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
						{paused ? <path d="M3 1.5v11l9-5.5z" fill="currentColor" /> : <path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" fill="currentColor" />}
					</svg>
				</button>
			</div>
		</section>
	);
}
