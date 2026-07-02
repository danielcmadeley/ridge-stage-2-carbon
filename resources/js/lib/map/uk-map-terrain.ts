import type { LngLatLike, Map } from 'maplibre-gl';
import { UK_SOURCE_BOUNDS } from '@/lib/map/uk-map-bounds';

export const TERRAIN_SOURCE_ID = 'uk-terrain-dem';
export const HILLSHADE_LAYER_ID = 'uk-hillshade';

export const TERRAIN_DEFAULTS = {
    exaggeration: 1,
    /** Mapterhorn global coverage stops at z12; higher zooms use overzoomed tiles. */
    maxzoom: 12,
} as const;

export function queryTerrainAltitude(map: Map, lngLat: LngLatLike): number {
    return map.queryTerrainElevation(lngLat) ?? 0;
}

export function isTerrainEnabled(map: Map): boolean {
    return map.getTerrain() !== null;
}

function findInsertionLayerId(map: Map): string | undefined {
    const layers = map.getStyle()?.layers ?? [];

    for (const layer of layers) {
        if (layer.type === 'symbol' && layer.layout?.['text-field']) {
            return layer.id;
        }
    }

    return layers.at(-1)?.id;
}

export function addUkMapTerrain(map: Map): void {
    if (map.getSource(TERRAIN_SOURCE_ID)) {
        return;
    }

    map.addSource(TERRAIN_SOURCE_ID, {
        type: 'raster-dem',
        tiles: ['https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'],
        tileSize: 512,
        encoding: 'terrarium',
        maxzoom: TERRAIN_DEFAULTS.maxzoom,
        bounds: UK_SOURCE_BOUNDS,
        attribution: '© Mapterhorn',
    });

    const beforeLayerId = findInsertionLayerId(map);

    map.addLayer(
        {
            id: HILLSHADE_LAYER_ID,
            source: TERRAIN_SOURCE_ID,
            type: 'hillshade',
            layout: { visibility: 'visible' },
            paint: {
                'hillshade-shadow-color': '#334155',
                'hillshade-highlight-color': '#f8fafc',
                'hillshade-accent-color': '#64748b',
                'hillshade-exaggeration': 0.4,
            },
        },
        beforeLayerId,
    );

    map.setTerrain({
        source: TERRAIN_SOURCE_ID,
        exaggeration: TERRAIN_DEFAULTS.exaggeration,
    });

    map.setSky({});
}
