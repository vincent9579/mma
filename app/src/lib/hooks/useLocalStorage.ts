import { useState, useCallback } from "react";

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function useLocalStorage<T>(
	key: string,
	defaultValue: T,
): [T, (v: T | ((prev: T) => T)) => void] {
	const [value, setValue] = useState<T>(() => {
		try {
			const stored = localStorage.getItem(key);
			if (stored === null) return defaultValue;
			const parsed = JSON.parse(stored);
			// Merge defaults under stored object values so keys added after the blob
			// was saved still resolve. Primitives/arrays pass through unchanged.
			if (isPlainObject(parsed) && isPlainObject(defaultValue)) {
				return { ...defaultValue, ...parsed } as T;
			}
			return parsed as T;
		} catch {
			return defaultValue;
		}
	});

	const set = useCallback(
		(v: T | ((prev: T) => T)) => {
			setValue((prev) => {
				const next = typeof v === "function" ? (v as (prev: T) => T)(prev) : v;
				localStorage.setItem(key, JSON.stringify(next));
				return next;
			});
		},
		[key],
	);

	return [value, set];
}
