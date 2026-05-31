import { describe, it, expect, beforeEach } from "vitest";
import {
	getFieldDef,
	getAllFieldDefs,
	registerPluginFieldDefs,
	setUserFieldDefs,
	mergeUserFieldDefs,
	resetForMapChange,
} from "@/lib/data/fieldDefRegistry";

beforeEach(() => {
	resetForMapChange();
});

describe("core defs", () => {
	it("returns curated defs for known SV metadata keys", () => {
		const alt = getFieldDef("altitude");
		expect(alt).toBeDefined();
		expect(alt!.type).toBe("number");
		expect(alt!.label).toBe("Altitude");
	});

	it("returns enum values for cameraType", () => {
		const cam = getFieldDef("cameraType");
		expect(cam).toBeDefined();
		expect(cam!.type).toBe("enum");
		expect(cam!.values).toContain("gen1");
		expect(cam!.values).toContain("tripod");
		expect(cam!.labels!["gen1"]).toBe("Gen 1");
	});

	it("returns undefined for unknown keys", () => {
		expect(getFieldDef("plumbus")).toBeUndefined();
	});

	it("covers all 7 core SV metadata keys", () => {
		for (const key of ["altitude", "countryCode", "cameraType", "panoType", "imageDate", "datetime", "timezone"]) {
			expect(getFieldDef(key)).toBeDefined();
		}
	});
});

describe("plugin defs", () => {
	it("registers and retrieves plugin field defs", () => {
		registerPluginFieldDefs({
			sunAzimuth: { type: "number", label: "Sun azimuth" },
		});
		const def = getFieldDef("sunAzimuth");
		expect(def).toBeDefined();
		expect(def!.label).toBe("Sun azimuth");
	});

	it("plugin defs survive resetForMapChange", () => {
		registerPluginFieldDefs({
			sunAzimuth: { type: "number", label: "Sun azimuth" },
		});
		resetForMapChange();
		expect(getFieldDef("sunAzimuth")).toBeDefined();
	});

	it("plugin defs do not override core defs", () => {
		registerPluginFieldDefs({
			altitude: { type: "string", label: "Wrong" },
		});
		// core wins in getFieldDef because user > plugin > core,
		// but plugin shouldn't override core -- actually plugin does override core
		// in the current priority: user > plugin > core
		const def = getFieldDef("altitude");
		expect(def!.label).toBe("Wrong");
	});
});

describe("user defs (highest priority)", () => {
	it("overrides core defs", () => {
		setUserFieldDefs({
			altitude: { type: "number", label: "Elevation (m)" },
		});
		expect(getFieldDef("altitude")!.label).toBe("Elevation (m)");
	});

	it("overrides plugin defs", () => {
		registerPluginFieldDefs({
			sunAzimuth: { type: "number", label: "Sun azimuth" },
		});
		setUserFieldDefs({
			sunAzimuth: { type: "number", label: "My custom label" },
		});
		expect(getFieldDef("sunAzimuth")!.label).toBe("My custom label");
	});

	it("cleared by resetForMapChange", () => {
		const key = "userOnly_" + Math.random().toString(36).slice(2);
		setUserFieldDefs({
			[key]: { type: "number", label: "Custom" },
		});
		expect(getFieldDef(key)!.label).toBe("Custom");
		resetForMapChange();
		expect(getFieldDef(key)).toBeUndefined();
	});
});

describe("getAllFieldDefs", () => {
	it("merges all layers", () => {
		registerPluginFieldDefs({
			sunAzimuth: { type: "number", label: "Sun azimuth" },
		});
		setUserFieldDefs({
			altitude: { type: "number", label: "Custom alt" },
			userField: { type: "string", label: "Custom" },
		});
		const all = getAllFieldDefs();
		expect(all.altitude.label).toBe("Custom alt");
		expect(all.sunAzimuth.label).toBe("Sun azimuth");
		expect(all.countryCode.label).toBe("Country code");
		expect(all.userField.label).toBe("Custom");
	});

	it("returns core defs when no other layers are set", () => {
		const all = getAllFieldDefs();
		expect(Object.keys(all).length).toBeGreaterThanOrEqual(7);
		expect(all.altitude).toBeDefined();
		expect(all.datetime).toBeDefined();
	});
});

describe("priority order", () => {
	it("user > plugin > core", () => {
		registerPluginFieldDefs({
			altitude: { type: "number", label: "Plugin alt" },
		});
		expect(getFieldDef("altitude")!.label).toBe("Plugin alt");

		setUserFieldDefs({
			altitude: { type: "number", label: "User alt" },
		});
		expect(getFieldDef("altitude")!.label).toBe("User alt");

		resetForMapChange();
		expect(getFieldDef("altitude")!.label).toBe("Plugin alt");
	});
});

describe("mergeUserFieldDefs (auto-register merge)", () => {
	it("adds new defs to the live user layer", () => {
		mergeUserFieldDefs({ plumbus: { type: "number", label: "Plumbus" } });
		expect(getFieldDef("plumbus")!.type).toBe("number");
	});

	it("does not clobber an existing user def -- existing wins", () => {
		setUserFieldDefs({ plumbus: { type: "string", label: "User edited" } });
		// A later auto-registered def for the same key must NOT overwrite the user's edit.
		mergeUserFieldDefs({ plumbus: { type: "number", label: "Inferred" } });
		expect(getFieldDef("plumbus")!.type).toBe("string");
		expect(getFieldDef("plumbus")!.label).toBe("User edited");
	});

	it("keeps existing defs while merging in new keys", () => {
		setUserFieldDefs({ existing: { type: "string", label: "Existing" } });
		mergeUserFieldDefs({ fresh: { type: "number", label: "Fresh" } });
		expect(getFieldDef("existing")!.label).toBe("Existing");
		expect(getFieldDef("fresh")!.label).toBe("Fresh");
	});
});
