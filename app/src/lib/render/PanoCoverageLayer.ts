import { CompositeLayer } from "@deck.gl/core";
import { ScatterplotLayer } from "@deck.gl/layers";
import { boundsToTiles, fetchPanoDots, tileKey, type PanoDot } from "@/lib/geo/photometa";
import type { CompositeLayerProps, Color, DefaultProps, UpdateParameters } from "@deck.gl/core";

type _PanoCoverageLayerProps = {
	color?: Color;
	// radius in meters (grows when zoomed in) vs. a constant on-screen pixel size
	scaled?: boolean;
	minZoom?: number;
};

export type PanoCoverageLayerProps = _PanoCoverageLayerProps & CompositeLayerProps;

const defaultProps: DefaultProps<PanoCoverageLayerProps> = {
	color: [255, 0, 0],
	scaled: false,
	minZoom: 14.9,
};

export default class PanoCoverageLayer extends CompositeLayer<Required<_PanoCoverageLayerProps>> {
	static layerName = "PanoCoverageLayer";
	static defaultProps = defaultProps;

	declare state: { dots: PanoDot[]; tiles: Set<string>; show: boolean };

	initializeState(): void {
		this.setState({ dots: [], tiles: new Set(), show: false });
	}

	shouldUpdateState({ changeFlags }: UpdateParameters<this>): boolean {
		return changeFlags.somethingChanged;
	}

	updateState({ context }: UpdateParameters<this>): void {
		const { minZoom } = this.props;

		if (context.viewport.zoom < minZoom) {
			if (this.state.show) this.setState({ show: false });
			return;
		}

		const [west, south, east, north] = context.viewport.getBounds();
		const tiles = boundsToTiles(west, south, east, north);
		const known = this.state.tiles;
		const fresh = tiles.filter((t) => !known.has(tileKey(t)));
		if (this.state.show && fresh.length === 0) return; // nothing new in view

		const nextTiles = fresh.length ? new Set(known) : known;
		for (const t of fresh) nextTiles.add(tileKey(t));
		this.setState({ show: true, tiles: nextTiles });

		for (const t of fresh) {
			fetchPanoDots(t).then((d) => {
				if (d.length) this.setState({ dots: this.state.dots.concat(d) });
			});
		}
	}

	renderLayers() {
		if (!this.state.show) return [];
		const { color, scaled } = this.props;
		return new ScatterplotLayer<PanoDot>({
			id: `${this.props.id}-dots`,
			data: this.state.dots,
			getPosition: (d: PanoDot) => [d.lng, d.lat],
			getFillColor: color,
			radiusUnits: scaled ? "meters" : "pixels",
			getRadius: scaled ? 2 : 4,
			radiusMaxPixels: scaled ? 24 : 4,
			stroked: false,
			filled: true,
			opacity: 0.7,
			pickable: false,
			updateTriggers: { getFillColor: color },
		});
	}
}
