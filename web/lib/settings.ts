/** Reads the site settings (lib/site-settings.ts) from the database. */
import "server-only";
import { cache } from "react";
import { db } from "./db";
import { DEFAULT_SETTINGS, mergeSettings, type SiteSettings } from "./site-settings";

export * from "./site-settings";

/** Once per request; a database problem falls back to the defaults rather than failing the page. */
export const getSettings = cache(async (): Promise<SiteSettings> => {
	try {
		return mergeSettings(await db()<{ key: string; value: unknown }[]>`select key, value from settings`);
	} catch (err) {
		console.warn(`[settings] using defaults: ${(err as Error).message}`);
		return structuredClone(DEFAULT_SETTINGS);
	}
});
