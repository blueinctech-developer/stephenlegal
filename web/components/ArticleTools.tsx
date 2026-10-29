"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { useHasClipboard, useMediaQuery } from "@/lib/client";
import { toggleSaved, useSaved } from "@/lib/saved";
import type { TocItem } from "@/lib/text";

/** Thin accent bar showing how far through the article the reader is. */
export function ReadProgress() {
	const { scrollYProgress } = useScroll();
	const reduce = useReducedMotion();
	const spring = useSpring(scrollYProgress, { stiffness: 220, damping: 32, restDelta: 0.001 });
	return <motion.div className="read-progress" style={{ scaleX: reduce ? scrollYProgress : spring }} aria-hidden="true" />;
}

/** Table of contents that highlights the section being read. */
export function Toc({ items }: { items: TocItem[] }) {
	const [activeId, setActiveId] = useState<string | null>(null);
	// Collapsed by default on narrower screens, where it sits above the article; the reader's choice wins.
	const narrow = useMediaQuery("(max-width: 1179px)");
	const [userOpen, setUserOpen] = useState<boolean | null>(null);
	const open = userOpen ?? !narrow;

	useEffect(() => {
		// The current section is the last heading above the top third of the screen (robust to fast jumps).
		const headings = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => Boolean(el));
		let frame = 0;
		const update = () => {
			frame = 0;
			const line = window.innerHeight * 0.3;
			let current: string | null = null;
			for (const h of headings) {
				if (h.getBoundingClientRect().top <= line) current = h.id;
				else break;
			}
			setActiveId(current);
		};
		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
		};
	}, [items]);

	return (
		<aside className="toc" aria-labelledby="toc-title">
			<details
				open={open}
				onToggle={(e) => {
					const next = (e.currentTarget as HTMLDetailsElement).open;
					if (next !== open) setUserOpen(next);
				}}
			>
				<summary id="toc-title">In this article</summary>
				<ol>
					{items.map((h) => (
						<li key={h.id} className={`toc__l${h.level}`}>
							<a href={`#${h.id}`} aria-current={activeId === h.id ? "true" : undefined}>
								{h.text}
							</a>
						</li>
					))}
				</ol>
			</details>
		</aside>
	);
}

function Toast({ message }: { message: string | null }) {
	const reduce = useReducedMotion();
	return (
		<div role="status" aria-live="polite">
			<AnimatePresence>
				{message && (
					<motion.p
						key={message}
						className="toast"
						initial={{ opacity: 0, y: reduce ? 0 : 24 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: reduce ? 0 : 12 }}
						transition={{ duration: 0.25 }}
					>
						{message}
					</motion.p>
				)}
			</AnimatePresence>
		</div>
	);
}

type ShareProps = { url: string; title: string; href: string; category: string | null; date: string };

/** Share links, copy link and save-for-later. */
export function ShareBar({ url, title, href, category, date }: ShareProps) {
	const saved = useSaved();
	const reduce = useReducedMotion();
	const isSaved = saved.some((a) => a.href === href);
	const [toast, setToast] = useState<string | null>(null);
	const canCopy = useHasClipboard();

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 2400);
		return () => clearTimeout(t);
	}, [toast]);

	const u = encodeURIComponent(url);
	const t = encodeURIComponent(title);
	const links = [
		{ label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
		{ label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
		{ label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
		{ label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
	];

	return (
		<div className="share">
			<p className="share__label">Share</p>
			<ul className="share__list">
				{links.map((l) => (
					<li key={l.label}>
						<a href={l.href} target="_blank" rel="noopener noreferrer">
							{l.label}
							<span className="screen-reader-text"> (opens in a new tab)</span>
						</a>
					</li>
				))}
				{canCopy && (
					<li>
						<button
							type="button"
							className="share__copy"
							onClick={async () => {
								try {
									await navigator.clipboard.writeText(url);
									setToast("Link copied");
								} catch {
									setToast("Couldn’t copy — select the address bar instead");
								}
							}}
						>
							Copy link
						</button>
					</li>
				)}
				<li>
					<button
						type="button"
						className="save-btn"
						aria-pressed={isSaved}
						onClick={() => setToast(toggleSaved({ href, title, category, date }) ? "Saved for later" : "Removed from saved")}
					>
						<motion.svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							aria-hidden="true"
							focusable="false"
							key={String(isSaved)}
							initial={reduce ? false : { scale: 0.6 }}
							animate={{ scale: 1 }}
							transition={{ type: "spring", stiffness: 500, damping: 15 }}
						>
							<path d="M6 3h12v18l-6-4.5L6 21z" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
						</motion.svg>
						{isSaved ? "Saved" : "Save"}
					</button>
				</li>
			</ul>
			<Toast message={toast} />
		</div>
	);
}

/** Return-to-top button that appears after the reader has scrolled a screen or two. */
export function BackToTop() {
	const [show, setShow] = useState(false);
	const reduce = useReducedMotion();
	useEffect(() => {
		const onScroll = () => setShow(window.scrollY > window.innerHeight * 1.5);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);
	return (
		<AnimatePresence>
			{show && (
				<motion.button
					type="button"
					className="to-top"
					initial={{ opacity: 0, y: reduce ? 0 : 16 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: reduce ? 0 : 16 }}
					onClick={() => {
						window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
						document.getElementById("main")?.focus({ preventScroll: true });
					}}
				>
					<span className="screen-reader-text">Back to top</span>
					<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
						<path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="square" />
					</svg>
				</motion.button>
			)}
		</AnimatePresence>
	);
}
