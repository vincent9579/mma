import { describe, it, expect } from "vitest";
import { makeLatestGate } from "@/lib/hooks/useAsync";

// The stale-result invariant of useAsync: a run's result is applied only if no
// newer run (changed deps) or cleanup (unmount) has started since.
describe("makeLatestGate", () => {
	it("reports current only for the most recent run", () => {
		const next = makeLatestGate();
		const first = next();
		expect(first()).toBe(true);

		const second = next();
		expect(first()).toBe(false); // superseded by a newer run
		expect(second()).toBe(true);
	});

	it("a later next() (e.g. cleanup) invalidates every prior predicate", () => {
		const next = makeLatestGate();
		const a = next();
		const b = next();
		next(); // cleanup / unmount

		expect(a()).toBe(false);
		expect(b()).toBe(false);
	});

	it("predicates stay valid across repeated checks until superseded", () => {
		const next = makeLatestGate();
		const only = next();
		expect(only()).toBe(true);
		expect(only()).toBe(true);
		next();
		expect(only()).toBe(false);
	});
});
