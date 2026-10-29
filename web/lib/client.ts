"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during server render and hydration, true afterwards. */
export function useIsClient(): boolean {
	return useSyncExternalStore(noop, () => true, () => false);
}

/** Live media-query match; false on the server. */
export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		(onChange) => {
			const mql = window.matchMedia(query);
			mql.addEventListener("change", onChange);
			return () => mql.removeEventListener("change", onChange);
		},
		() => window.matchMedia(query).matches,
		() => false,
	);
}

export function useHasClipboard(): boolean {
	return useSyncExternalStore(noop, () => Boolean(navigator.clipboard), () => false);
}
