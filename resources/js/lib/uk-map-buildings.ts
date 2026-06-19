import type { ExpressionSpecification, Map } from 'maplibre-gl';
import { UK_SOURCE_BOUNDS } from '@/lib/uk-map-bounds';

export const UK_MAP_DEFAULTS = {
    center: [-2.5, 54.5] as [number, number],
    zoom: 5.5,
    pitch: 0,
    bearing: 0,
} as const;

export const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

const OPENFREEMAP_SOURCE = 'openfreemap-buildings';
const BUILDINGS_LAYER = 'uk-3d-buildings';

const buildingHeight: ExpressionSpecification = [
    'interpolate',
    ['linear'],
    ['zoom'],
    15,
    0,
    16,
    [
        'coalesce',
        ['get', 'render_height'],
        ['to-number', ['get', 'height']],
        ['*', ['to-number', ['get', 'building:levels']], 3],
        10,
    ],
];

const buildingBase: ExpressionSpecification = [
    'interpolate',
    ['linear'],
    ['zoom'],
    15,
    0,
    16,
    [
        'coalesce',
        ['get', 'render_min_height'],
        ['to-number', ['get', 'min_height']],
        0,
    ],
];

function findLabelLayerId(map: Map): string | undefined {
    const layers = map.getStyle()?.layers ?? [];

    for (const layer of layers) {
        if (layer.type === 'symbol' && layer.layout?.['text-field']) {
            return layer.id;
        }
    }

    return undefined;
}

function hideFlatBuildingLayers(map: Map): void {
    const layers = map.getStyle()?.layers ?? [];

    for (const layer of layers) {
        if (
            layer.type === 'fill' &&
            (layer.id.includes('building') || layer['source-layer'] === 'building')
        ) {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
    }
}

export function addUkBuildingExtrusions(map: Map): void {
    if (map.getSource(OPENFREEMAP_SOURCE)) {
        return;
    }

    map.addSource(OPENFREEMAP_SOURCE, {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
        bounds: UK_SOURCE_BOUNDS,
    });

    hideFlatBuildingLayers(map);

    const labelLayerId = findLabelLayerId(map);

    map.addLayer(
        {
            id: BUILDINGS_LAYER,
            source: OPENFREEMAP_SOURCE,
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 15,
            filter: ['!=', ['get', 'hide_3d'], true],
            paint: {
                'fill-extrusion-color': [
                    'interpolate',
                    ['linear'],
                    ['coalesce', ['get', 'render_height'], 10],
                    0,
                    '#cbd5e1',
                    50,
                    '#6366f1',
                    150,
                    '#4338ca',
                ],
                'fill-extrusion-height': buildingHeight,
                'fill-extrusion-base': buildingBase,
                'fill-extrusion-opacity': 0.92,
            },
        },
        labelLayerId,
    );
}
