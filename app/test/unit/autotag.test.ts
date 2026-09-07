import { describe, it, expect } from "vitest";
import {
	AUTO_TAG_COUNTRY_FORMATS,
	buildAutotagTables,
	countryTagName,
	englishCountryName,
	normalizeCountryFormat,
	seasonTagName,
} from "@/lib/autotag";

describe("normalizeCountryFormat", () => {
	it.each(Object.keys(AUTO_TAG_COUNTRY_FORMATS))("keeps %s", (format) => {
		expect(normalizeCountryFormat(format)).toBe(format);
	});
	it("falls back to code for unknown values", () => {
		expect(normalizeCountryFormat("bogus")).toBe("code");
		expect(normalizeCountryFormat(null)).toBe("code");
		expect(normalizeCountryFormat(undefined)).toBe("code");
	});
});

describe("englishCountryName", () => {
	it("resolves TW in English regardless of app language", () => {
		expect(englishCountryName("TW")).toBe("Taiwan");
	});
	it("passes unknown codes through", () => {
		expect(englishCountryName("XX")).toBe("XX");
	});
});

describe("countryTagName", () => {
	it("returns the English name when translation is off", () => {
		expect(countryTagName("TW", false)).toBe("Taiwan");
		expect(countryTagName("tw", false)).toBe("Taiwan");
	});
});

describe("seasonTagName", () => {
	it("returns English when translation is off", () => {
		expect(seasonTagName("Spring", false)).toBe("Spring");
	});
	it("passes unknown seasons through even when translation is on", () => {
		expect(seasonTagName("Monsoon", true)).toBe("Monsoon");
	});
});

describe("buildAutotagTables", () => {
	it("upper-cases and dedupes codes", () => {
		const tables = buildAutotagTables(["TW", "tw", " JP "], {
			translate: false,
			countryFormat: "both",
		});
		expect(tables.countryFormat).toBe("both");
		expect(Object.keys(tables.countryNames).sort()).toEqual(["JP", "TW"]);
		expect(tables.countryNames.TW).toBe("Taiwan");
	});
	it("skips blank codes and always covers the four seasons", () => {
		const tables = buildAutotagTables(["", "  "], {
			translate: false,
			countryFormat: "code",
		});
		expect(tables.countryNames).toEqual({});
		expect(tables.seasonNames).toEqual({
			Winter: "Winter",
			Spring: "Spring",
			Summer: "Summer",
			Autumn: "Autumn",
		});
	});
});
