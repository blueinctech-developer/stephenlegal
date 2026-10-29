"use client";

import { useSyncExternalStore } from "react";

/** Articles a reader saves for later. Kept in this browser only (no account needed). */
export type SavedArticle = { href: string; title: string; category: string | null; date: string; savedAt: string };

const KEY = "sl:saved";
const listeners = new Set<() => void>();
const EMPTY: SavedArticle[] = [];
let cache: { raw: string | null; list: SavedArticle[] } = { raw: null, list: EMPTY };

function read(): SavedArticle[] {
	let raw: string | null = null;
	try {
		raw = localStorage.getItem(KEY);
	} catch {
		return EMPTY;
	}
	if (raw === cache.raw) return cache.list;
	let list = EMPTY;
	try {
		const parsed = raw ? JSON.parse(raw) : [];
		if (Array.isArray(parsed)) list = parsed.filter((a) => a && typeof a.href === "string" && typeof a.title === "string");
	} catch {
		list = EMPTY;
	}
	cache = { raw, list };
	return list;
}

function write(list: SavedArticle[]) {
	try {
		localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
	} catch {
		// Storage full or blocked: saving is a convenience, so fail quietly.
	}
	listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	const onStorage = (e: StorageEvent) => e.key === KEY && listener();
	window.addEventListener("storage", onStorage);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", onStorage);
	};
}

export function useSaved(): SavedArticle[] {
	return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function toggleSaved(article: Omit<SavedArticle, "savedAt">): boolean {
	const list = read();
	if (list.some((a) => a.href === article.href)) {
		write(list.filter((a) => a.href !== article.href));
		return false;
	}
	write([{ ...article, savedAt: new Date().toISOString() }, ...list]);
	return true;
}

export function removeSaved(href: string) {
	write(read().filter((a) => a.href !== href));
}
