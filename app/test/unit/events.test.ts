import { describe, it, expect, vi } from "vitest";

// emit() routes caught handler errors through log.error, which hits the tauri logger
// (absent under vitest). Stub it so the error-isolation test doesn't leak a rejection.
vi.mock("@/lib/util/log", () => ({
	log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn() },
}));

import {
	emit,
	subscribe,
	subscribeMany,
	LOCATION_DATA_EVENTS,
	SELECTION_EVENTS,
	TAG_DATA_EVENTS,
	MAP_LIFECYCLE_EVENTS,
} from "@/lib/events";

// The group constants are derived from the event registry by prefix. If an event name
// stops matching its prefix, a whole group silently drops it — pin them explicitly.
describe("event group constants", () => {
	it("LOCATION_DATA_EVENTS contains exactly the location:* events", () => {
		expect([...LOCATION_DATA_EVENTS].sort()).toEqual([
			"location:add",
			"location:remove",
			"location:update",
		]);
	});

	it("TAG_DATA_EVENTS contains exactly the tag:* events", () => {
		expect([...TAG_DATA_EVENTS].sort()).toEqual(["tag:add", "tag:remove", "tag:update"]);
	});

	it("SELECTION_EVENTS and MAP_LIFECYCLE_EVENTS are correct", () => {
		expect([...SELECTION_EVENTS]).toEqual(["selection:change"]);
		expect([...MAP_LIFECYCLE_EVENTS].sort()).toEqual(["map:close", "map:open"]);
	});
});

describe("subscribeMany", () => {
	it("fans out to every event and the combined unsubscribe detaches all", () => {
		const fn = vi.fn();
		const off = subscribeMany(["location:add", "tag:add"], fn);
		emit("location:add", []);
		emit("tag:add", []);
		expect(fn).toHaveBeenCalledTimes(2);

		off();
		emit("location:add", []);
		emit("tag:add", []);
		expect(fn).toHaveBeenCalledTimes(2);
	});
});

describe("emit", () => {
	it("isolates handler errors — a throwing handler doesn't block the rest", () => {
		const good = vi.fn();
		const offBad = subscribe("active:change", () => {
			throw new Error("boom");
		});
		const offGood = subscribe("active:change", good);

		expect(() => emit("active:change", 1)).not.toThrow();
		expect(good).toHaveBeenCalledOnce();

		offBad();
		offGood();
	});
});
