import type { Location } from "@/bindings.gen";
import { nowUnix } from "@/lib/util/format";

/** Street View camera orientation (POV). */
export type LocationPOV = Pick<Location, "heading" | "pitch" | "zoom">;

export type LatLng = google.maps.LatLngLiteral;

export const enum LocationFlag {
	None = 0,
	LoadAsPanoId = 1,
	Informational = 2,
}

/** Panorama source type from Google's internal metadata. */
export const enum PanoType {
	Official = 2,
	Unknown = 3,
	UserUploaded = 10,
}

export function hasLoadAsPanoId(loc: Location): boolean {
	return (loc.flags & LocationFlag.LoadAsPanoId) !== 0;
}

export function isInformational(loc: Location): boolean {
	return (loc.flags & LocationFlag.Informational) !== 0;
}

export function isPinnedToPano(loc: Location): boolean {
	return hasLoadAsPanoId(loc) && loc.panoId != null;
}

/** Virtual locations (negative id) exist only ephemerally — e.g. staged imports
 *  previewed before commit. They display like real locations but every mutate
 *  path no-ops, and UI hides affordances that cannot apply. */
export function isVirtualLocation(loc: { id: number }): boolean {
	return loc.id < 0;
}

/** Encoding between a staged-import preview index and its virtual location id.
 *  Single source for the `-(index + 1)` scheme. */
export function stagedIndexToVirtualId(index: number): number {
	return -(index + 1);
}

export function virtualIdToStagedIndex(id: number): number {
	return -id - 1;
}

export function createLocation(
	partial: Partial<Location> & LatLng,
): Location {
	return {
		id: 0, // placeholder; Rust assigns the real ID
		heading: 0,
		pitch: 0,
		zoom: 0,
		panoId: null,
		flags: LocationFlag.None,
		tags: [],
		extra: null,
		createdAt: nowUnix(),
		modifiedAt: null,
		...partial,
	};
}

export type SortMode = "name" | "created" | "opened" | "amount";
export type TagSortMode = "default" | "name" | "amount";

export type WorkArea = "overview" | "location" | "duplicates" | "import" | "plugin" | "diff";
