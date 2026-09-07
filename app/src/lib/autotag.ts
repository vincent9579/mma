import { msg, t } from "@/lib/i18n";
import { countryName } from "@/lib/util/format";

/** How a country suggestion renders as a tag: raw code, localised name, or both. */
export const AUTO_TAG_COUNTRY_FORMATS = {
	code: msg("Country code (TW)"),
	name: msg("Country name (Taiwan)"),
	both: msg("Both (TW-Taiwan)"),
} as const;
export type AutoTagCountryFormat = keyof typeof AUTO_TAG_COUNTRY_FORMATS;

/** Seasons are produced in English by Rust; the table below marks them for extraction
 *  so each locale can translate them. Render sites go through {@link seasonTagName}. */
const SEASON_MESSAGES = {
	Winter: msg("Winter"),
	Spring: msg("Spring"),
	Summer: msg("Summer"),
	Autumn: msg("Autumn"),
} as const;

/** Anything outside the three known formats keeps the legacy "code" behaviour. */
export function normalizeCountryFormat(raw: unknown): AutoTagCountryFormat {
	return raw === "name" || raw === "both" ? raw : "code";
}

let englishRegionFmt: Intl.DisplayNames | null = null;

/** Country name in English, regardless of the app language: what autotag uses when
 *  translation is off. `Intl.DisplayNames` caches per construction, so one instance
 *  is kept for the session. */
export function englishCountryName(code: string): string {
	try {
		englishRegionFmt ??= new Intl.DisplayNames(["en"], { type: "region" });
		return englishRegionFmt.of(code) ?? code;
	} catch {
		return code;
	}
}

/** Display name for an ISO-A2 code: app-language name when translation is on,
 *  English otherwise; the code itself when unknown. */
export function countryTagName(code: string, translate: boolean): string {
	const upper = code.trim().toUpperCase();
	if (!upper) return code;
	return translate ? countryName(upper) : englishCountryName(upper);
}

/** Localised season name when translation is on, English otherwise. Unknown inputs
 *  pass through so a future Rust season never renders blank. */
export function seasonTagName(english: string, translate: boolean): string {
	if (!translate) return english;
	const message = (SEASON_MESSAGES as Record<string, string>)[english];
	return message ? t(message) : english;
}

export interface AutotagNameTables {
	countryFormat: string;
	countryNames: Record<string, string>;
	seasonNames: Record<string, string>;
}

/** Name tables for one autotag request. `codes` is every country code the request
 *  may meet (upper-cased and deduped here); the season table always covers the
 *  four seasons Rust can produce. Names follow the active locale through
 *  `countryName`/`t`, so no locale argument is needed. */
export function buildAutotagTables(
	codes: Iterable<string>,
	opts: { translate: boolean; countryFormat: AutoTagCountryFormat },
): AutotagNameTables {
	const countryNames: Record<string, string> = {};
	for (const raw of codes) {
		const code = raw.trim().toUpperCase();
		if (!code || code in countryNames) continue;
		countryNames[code] = countryTagName(code, opts.translate);
	}
	const seasonNames: Record<string, string> = {};
	for (const english of Object.keys(SEASON_MESSAGES)) {
		seasonNames[english] = seasonTagName(english, opts.translate);
	}
	return { countryFormat: opts.countryFormat, countryNames, seasonNames };
}
