/**
 * Unified field-definition registry.
 *
 * Field **existence** (which keys have data) is tracked separately by
 * `knownFieldKeys` in `useMapStore`. This module handles field **metadata**
 * (type, label, enum values) from two sources, in priority order:
 *
 *   1. **User overrides** — persisted in `MapMeta.extra.fields`, editable via
 *      ManageFields. Loaded on map open, updated on save. Curated defs for
 *      well-known SV keys are written here by Rust (`known_field_def`) when the
 *      key first appears in location data, so they show up the same way.
 *   2. **Plugin defs** — declared by `EnrichmentProvider.fieldDefs` at
 *      registration time. Available as long as the plugin is active.
 *
 * `getFieldDef(key)` composes the layers **per-attribute**, not whole-object: the
 * user layer wins for any attribute it actually has an opinion on, falling through
 * to the plugin layer for null/absent ones. This matters because Rust auto-registers
 * a label-less placeholder (`{ type, label: null, comparison: null, ... }`) into the
 * user layer the first time a plugin-owned key appears in data — Rust can't see the
 * plugin layer, so it must infer *something*. Whole-object precedence would let that
 * placeholder shadow the plugin's real label and comparison; per-attribute fallthrough
 * treats a null attribute as "no opinion, ask the next layer." Returns `undefined` if
 * no layer declares the key (the UI falls back to the raw key name).
 */

import type { ExtraFieldDef } from "@/bindings.gen";

let pluginDefs: Record<string, ExtraFieldDef> = {};
let userDefs: Record<string, ExtraFieldDef> = {};

/** Register field definitions from an enrichment provider (called at activation). */
export function registerPluginFieldDefs(defs: Record<string, ExtraFieldDef>) {
	pluginDefs = { ...pluginDefs, ...defs };
}

/** Remove plugin field definitions by key (called when a plugin is deactivated). */
export function unregisterPluginFieldDefs(keys: string[]) {
	if (keys.length === 0) return;
	const next = { ...pluginDefs };
	for (const k of keys) delete next[k];
	pluginDefs = next;
}

/** Load user-customized field definitions from `MapMeta.extra.fields` (called on map open). */
export function setUserFieldDefs(defs: Record<string, ExtraFieldDef>) {
	userDefs = defs;
}

/** Merge auto-registered/inferred defs into the user layer (e.g. after a mutation
 *  discovers new extra keys). Existing entries win, so user edits and previously-loaded
 *  defs are never clobbered. Keeps the registry the live source of truth without a reload. */
export function mergeUserFieldDefs(defs: Record<string, ExtraFieldDef>) {
	userDefs = { ...defs, ...userDefs };
}

/** Clear per-map state on map close. Plugin defs persist across maps. */
export function resetForMapChange() {
	userDefs = {};
}

/** Compose two layers per-attribute: the user value wins when present, falling
 *  through to the plugin value for null/absent attributes (a label-less inferred
 *  placeholder must not shadow the plugin's real label/comparison). */
function mergeDef(
	user: ExtraFieldDef | undefined,
	plugin: ExtraFieldDef | undefined,
): ExtraFieldDef | undefined {
	if (!user) return plugin;
	if (!plugin) return user;
	return {
		type: user.type,
		label: user.label ?? plugin.label,
		values: user.values ?? plugin.values,
		labels: user.labels ?? plugin.labels,
		comparison: user.comparison ?? plugin.comparison,
	};
}

/** Look up metadata for a single field key. Returns `undefined` if no metadata exists. */
export function getFieldDef(key: string): ExtraFieldDef | undefined {
	return mergeDef(userDefs[key], pluginDefs[key]);
}

/** Merged view of all field definitions across all layers. */
export function getAllFieldDefs(): Record<string, ExtraFieldDef> {
	const out: Record<string, ExtraFieldDef> = {};
	for (const key of new Set([...Object.keys(pluginDefs), ...Object.keys(userDefs)]))
		out[key] = mergeDef(userDefs[key], pluginDefs[key])!;
	return out;
}
