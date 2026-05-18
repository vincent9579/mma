import { selectPolygon } from "@/store/useMapStore";
import type { PolygonGeometry } from "@/store/selections";

export async function loadGeoJSON() {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".json,.geojson";
	input.multiple = true;
	input.onchange = async () => {
		if (!input.files) return;
		for (const file of input.files) {
			try {
				const text = await file.text();
				const data = JSON.parse(text);
				const features = data.type === "FeatureCollection" ? data.features : [data];
				for (const f of features) {
					if (f.geometry?.type === "Polygon") {
						const poly: PolygonGeometry = {
							coordinates: f.geometry.coordinates,
							properties: f.properties ?? undefined,
						};
						selectPolygon(poly);
					} else if (f.geometry?.type === "MultiPolygon") {
						for (const coords of f.geometry.coordinates) {
							const poly: PolygonGeometry = {
								coordinates: coords,
								properties: f.properties ?? undefined,
							};
							selectPolygon(poly);
						}
					}
				}
			} catch {
				/* ignore malformed files */
			}
		}
	};
	input.click();
}
