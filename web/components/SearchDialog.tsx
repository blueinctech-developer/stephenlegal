"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

export type QuickResult = { id: number; title: string; href: string; date: string; category: string | null; image: string | null };

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Instant search: results as you type, Enter opens the full results page. */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
	const router = useRouter();
	const reduce = useReducedMotion();
	const dialogRef = useRef<HTMLDialogElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listId = useId();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<QuickResult[]>([]);
	const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
	const [active, setActive] = useState(-1);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) {
			dialog.showModal();
			inputRef.current?.focus();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	}, [open]);

	// Debounced lookup; stale responses are discarded via AbortController.
	const term = query.trim();
	useEffect(() => {
		if (term.length < 2) return;
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			setStatus("loading");
			try {
				const res = await fetch(`/api/search/?q=${encodeURIComponent(term)}`, { signal: controller.signal });
				if (!res.ok) throw new Error(String(res.status));
				const data = (await res.json()) as { results: QuickResult[] };
				setResults(data.results);
				setActive(-1);
				setStatus("done");
			} catch (error) {
				if ((error as Error).name !== "AbortError") setStatus("error");
			}
		}, 220);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [term]);

	const shown = term.length >= 2 ? results : [];
	const go = (href: string) => {
		onClose();
		router.push(href);
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown" && shown.length) {
			e.preventDefault();
			setActive((i) => (i + 1) % shown.length);
		} else if (e.key === "ArrowUp" && shown.length) {
			e.preventDefault();
			setActive((i) => (i <= 0 ? shown.length - 1 : i - 1));
		} else if (e.key === "Enter" && active >= 0 && shown[active]) {
			e.preventDefault();
			go(shown[active].href);
		}
	};

	return (
		<dialog
			ref={dialogRef}
			className="search-dialog"
			aria-label="Search articles"
			onClose={onClose}
			onClick={(e) => {
				// Click on the backdrop closes the dialog.
				if (e.target === dialogRef.current) onClose();
			}}
		>
			<div className="search-dialog__panel">
				<form
					className="search-dialog__bar"
					role="search"
					action="/search/"
					onSubmit={(e) => {
						e.preventDefault();
						if (term) go(`/search/?q=${encodeURIComponent(term)}`);
					}}
				>
					<label className="screen-reader-text" htmlFor="quick-search">
						Search articles
					</label>
					<input
						ref={inputRef}
						id="quick-search"
						name="q"
						type="search"
						autoComplete="off"
						placeholder="Search articles, cases and topics…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={onKeyDown}
						role="combobox"
						aria-expanded={shown.length > 0}
						aria-controls={listId}
						aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
					/>
					{status === "loading" && <span className="spinner" aria-hidden="true" />}
					<button type="button" className="search-dialog__close" onClick={onClose}>
						Esc
						<span className="screen-reader-text"> — close search</span>
					</button>
				</form>

				<div className="search-dialog__body">
					<p className="screen-reader-text" role="status">
						{status === "done" && term.length >= 2 ? `${shown.length} quick results` : ""}
					</p>
					{term.length < 2 && (
						<p className="search-dialog__hint">
							Type at least two letters. Use <b>↑</b> <b>↓</b> to choose and <b>Enter</b> to open.
						</p>
					)}
					{status === "error" && <p className="search-dialog__hint">Search is unavailable right now. Press Enter to try the full results page.</p>}
					{status === "done" && term.length >= 2 && shown.length === 0 && <p className="search-dialog__hint">No articles match “{term}”.</p>}

					<ul className="quick-results" id={listId} role="listbox" aria-label="Quick results">
						<AnimatePresence initial={false}>
							{shown.map((r, i) => (
								<motion.li
									key={r.id}
									role="presentation"
									layout={!reduce}
									initial={{ opacity: 0, y: reduce ? 0 : 10 }}
									animate={{ opacity: 1, y: 0, transition: { delay: reduce ? 0 : i * 0.035 } }}
									exit={{ opacity: 0 }}
								>
									<a
										id={`${listId}-${i}`}
										role="option"
										aria-selected={i === active}
										href={r.href}
										onClick={(e) => {
											e.preventDefault();
											go(r.href);
										}}
										onMouseEnter={() => setActive(i)}
									>
										<span className="media">
											{r.image ? <Image src={r.image} alt="" fill sizes="88px" /> : <span className="media__placeholder" aria-hidden="true" />}
										</span>
										<span>
											<span className="quick-results__title">{r.title}</span>
											<span className="quick-results__meta">
												{r.category ? `${r.category} · ` : ""}
												{DATE.format(new Date(r.date))}
											</span>
										</span>
									</a>
								</motion.li>
							))}
						</AnimatePresence>
					</ul>
					{shown.length > 0 && (
						<a
							className="quick-results__all"
							href={`/search/?q=${encodeURIComponent(term)}`}
							onClick={(e) => {
								e.preventDefault();
								go(`/search/?q=${encodeURIComponent(term)}`);
							}}
						>
							See all results for “{term}” <span aria-hidden="true">→</span>
						</a>
					)}
				</div>
			</div>
		</dialog>
	);
}
