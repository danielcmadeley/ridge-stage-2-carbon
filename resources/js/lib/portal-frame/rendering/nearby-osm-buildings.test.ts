import { MercatorCoordinate } from 'maplibre-gl';
import { Group, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import {
    clipRingToTile,
    createSurroundingsGroup,
    projectVertex,
    replaceSurroundingsGroup,
} from '@/lib/portal-frame/rendering/nearby-osm-buildings';
import type { NearbyBuildingFootprint } from '@/lib/portal-frame/rendering/nearby-osm-buildings';

describe('clipRingToTile', () => {
    it('keeps a polygon fully inside the tile unchanged', () => {
        const ring: [number, number][] = [
            [-10, -10],
            [10, -10],
            [10, 10],
            [-10, 10],
        ];

        const clipped = clipRingToTile(ring, 50);

        expect(clipped).not.toBeNull();
        expect(clipped!.length).toBe(4);
    });

    it('clips a polygon that extends past the eastern edge', () => {
        const ring: [number, number][] = [
            [40, -40],
            [80, -40],
            [80, 40],
            [40, 40],
        ];

        const clipped = clipRingToTile(ring, 50);

        expect(clipped).not.toBeNull();

        for (const [x] of clipped!) {
            expect(x).toBeLessThanOrEqual(50 + 1e-6);
        }
    });

    it('returns null when the polygon lies entirely outside the tile', () => {
        const ring: [number, number][] = [
            [120, 120],
            [140, 120],
            [140, 140],
            [120, 140],
        ];

        const clipped = clipRingToTile(ring, 50);

        expect(clipped).toBeNull();
    });

    it('returns null for degenerate rings with fewer than three vertices', () => {
        const ring: [number, number][] = [
            [0, 0],
            [10, 10],
        ];

        expect(clipRingToTile(ring, 50)).toBeNull();
    });
});

describe('projectVertex', () => {
    it('returns zero metres at the origin itself', () => {
        const origin = MercatorCoordinate.fromLngLat(
            { lng: -2.5, lat: 54.5 },
            0,
        );
        const meterScale = origin.meterInMercatorCoordinateUnits();

        const [x, y] = projectVertex(-2.5, 54.5, origin, meterScale);

        expect(Math.abs(x)).toBeLessThan(1e-9);
        expect(Math.abs(y)).toBeLessThan(1e-9);
    });

    it('yields approximately 100 m east and 0 m south at 54.5N', () => {
        const origin = MercatorCoordinate.fromLngLat(
            { lng: -2.5, lat: 54.5 },
            0,
        );
        const meterScale = origin.meterInMercatorCoordinateUnits();
        const metresPerDegreeLng =
            (Math.PI / 180) * 6378137 * Math.cos((54.5 * Math.PI) / 180);
        const deltaLng = 100 / metresPerDegreeLng;

        const [x, y] = projectVertex(-2.5 + deltaLng, 54.5, origin, meterScale);

        // Web Mercator is spherical, so a small ellipsoidal discrepancy is expected.
        expect(x).toBeCloseTo(100, 0);
        expect(Math.abs(y)).toBeLessThan(1e-3);
    });
});

describe('createSurroundingsGroup', () => {
    const footprints: NearbyBuildingFootprint[] = [
        {
            id: 'a',
            ringM: [
                [-10, -10],
                [10, -10],
                [10, 10],
                [-10, 10],
            ],
            heightM: 12,
            baseM: 0,
            centroidM: [0, 0],
        },
        {
            id: 'b',
            ringM: [
                [20, 20],
                [30, 20],
                [30, 30],
                [20, 30],
            ],
            heightM: 9,
            baseM: 3,
            centroidM: [25, 25],
        },
    ];

    it('builds a named group with one mesh per footprint', () => {
        const group = createSurroundingsGroup(footprints);

        expect(group).toBeInstanceOf(Group);
        expect(group.name).toBe('site-surroundings');
        expect(group.children).toHaveLength(2);
        expect(group.children[0]).toBeInstanceOf(Mesh);
    });

    it('produces an empty group when no footprints are supplied', () => {
        const group = createSurroundingsGroup([]);

        expect(group.children).toHaveLength(0);
    });
});

describe('replaceSurroundingsGroup', () => {
    it('disposes the previous group and returns a fresh one', () => {
        const first = createSurroundingsGroup([
            {
                id: 'a',
                ringM: [
                    [-5, -5],
                    [5, -5],
                    [5, 5],
                    [-5, 5],
                ],
                heightM: 6,
                baseM: 0,
                centroidM: [0, 0],
            },
        ]);
        const firstMesh = first.children[0] as Mesh;
        const firstGeoUuid = firstMesh.geometry.uuid;

        const replaced = replaceSurroundingsGroup(first, []);

        expect(replaced).not.toBe(first);
        expect(replaced.children).toHaveLength(0);
        expect(firstMesh.geometry.uuid).toBe(firstGeoUuid);
    });

    it('accepts a null current group', () => {
        const group = replaceSurroundingsGroup(null, []);

        expect(group).toBeInstanceOf(Group);
    });
});
