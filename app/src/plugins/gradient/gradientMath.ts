import type { ExtraFieldDef } from "@/bindings.gen";

export function lerp(
	a: [number, number, number],
	b: [number, number, number],
	t: number,
): [number, number, number] {
	return [
		Math.round(a[0] + (b[0] - a[0]) * t),
		Math.round(a[1] + (b[1] - a[1]) * t),
		Math.round(a[2] + (b[2] - a[2]) * t),
	];
}

export function gradientColor(stops: [number, number, number][], t: number): [number, number, number] {
	if (t <= 0) return stops[0];
	if (t >= 1) return stops[stops.length - 1];
	const segment = t * (stops.length - 1);
	const i = Math.floor(segment);
	return lerp(stops[i], stops[Math.min(i + 1, stops.length - 1)], segment - i);
}

export function isNumericField(def: ExtraFieldDef | undefined): boolean {
	if (!def) return false;
	return def.type === "number" || def.type === "date";
}

// Numeric position of a categorical value, for proportional (not ordinal) gradient
// mapping. Months ("YYYY-MM") become an ordinal month count; numeric strings their
// value. Returns null for non-numeric categories (caller falls back to even spacing).
export function fieldScale(value: string, type: string | undefined): number | null {
	if (type === "month") {
		const [y, m] = value.split("-").map(Number);
		return Number.isFinite(y) && Number.isFinite(m) ? y * 12 + (m - 1) : null;
	}
	const n = Number(value);
	return value.trim() !== "" && Number.isFinite(n) ? n : null;
}
