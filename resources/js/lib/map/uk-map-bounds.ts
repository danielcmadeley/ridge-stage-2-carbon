import type { LngLatBoundsLike, Map } from 'maplibre-gl';

/** Geofabrik United Kingdom extract, with slight padding for coastal/northern areas. */
export const UK_BOUNDS = {
    west: -9,
    south: 49.5,
    east: 2.2,
    north: 61,
} as const;

/** MapLibre `maxBounds` — prevents panning and tile loading outside the UK. */
export const UK_MAX_BOUNDS: LngLatBoundsLike = [
    [UK_BOUNDS.west, UK_BOUNDS.south],
    [UK_BOUNDS.east, UK_BOUNDS.north],
];

/** MapLibre source `bounds` — skips fetching tiles outside this box. */
export const UK_SOURCE_BOUNDS: [number, number, number, number] = [
    UK_BOUNDS.west,
    UK_BOUNDS.south,
    UK_BOUNDS.east,
    UK_BOUNDS.north,
];

export function constrainMapToUk(map: Map): void {
    map.setMaxBounds(UK_MAX_BOUNDS);
    map.setRenderWorldCopies(false);
}
