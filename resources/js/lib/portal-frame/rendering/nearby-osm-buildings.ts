import { MercatorCoordinate } from 'maplibre-gl';
import type { GeoJSONFeature, Map as MapLibreMap } from 'maplibre-gl';
import {
    ExtrudeGeometry,
    Group,
    Mesh,
    MeshStandardMaterial,
    Shape,
} from 'three';
import {
    OPENFREEMAP_BUILDING_SOURCE_LAYER,
    OPENFREEMAP_SOURCE,
} from '@/lib/map/uk-map-buildings';
import { disposeObject3D } from '@/lib/portal-frame/rendering/three-group';

export type LngLatOrigin = [lng: number, lat: number];

export type NearbyBuildingFootprint = {
    id: string | number;
    /** Outer ring in local metres (X = east, Y = south-flipped), projected at Z = 0. */
    ringM: [number, number][];
    heightM: number;
    baseM: number;
    centroidM: [number, number];
};

const DEFAULT_HEIGHT_M = 10;
const LEVEL_HEIGHT_M = 3;
const SURROUNDING_COLOR = '#94a3b8';

function isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function resolveHeight(properties: GeoJSONFeature['properties']): number {
    if (isNumber(properties?.render_height) && properties.render_height > 0) {
        return properties.render_height;
    }

    if (isNumber(properties?.height) && properties.height > 0) {
        return properties.height;
    }

    const levels = properties?.['building:levels'];

    if (isNumber(levels) && levels > 0) {
        return levels * LEVEL_HEIGHT_M;
    }

    return DEFAULT_HEIGHT_M;
}

function resolveBase(properties: GeoJSONFeature['properties']): number {
    if (
        isNumber(properties?.render_min_height) &&
        properties.render_min_height > 0
    ) {
        return properties.render_min_height;
    }

    if (isNumber(properties?.min_height) && properties.min_height > 0) {
        return properties.min_height;
    }

    return 0;
}

export function projectVertex(
    lng: number,
    lat: number,
    origin: MercatorCoordinate,
    meterScale: number,
): [number, number] {
    const vertex = MercatorCoordinate.fromLngLat({ lng, lat }, 0);

    return [
        (vertex.x - origin.x) / meterScale,
        -(vertex.y - origin.y) / meterScale,
    ];
}

function collectOuterRings(feature: GeoJSONFeature): [number, number][][] {
    const geometry = feature.geometry;

    if (!geometry) {
        return [];
    }

    if (geometry.type === 'Polygon') {
        return [
            geometry.coordinates[0].map(
                (vertex: number[]) =>
                    [vertex[0], vertex[1]] as [number, number],
            ),
        ];
    }

    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.map((polygon: number[][][]) =>
            polygon[0].map(
                (vertex: number[]) =>
                    [vertex[0], vertex[1]] as [number, number],
            ),
        );
    }

    return [];
}

function ringCentroidM(ringM: [number, number][]): [number, number] {
    let sumX = 0;
    let sumY = 0;

    for (const [x, y] of ringM) {
        sumX += x;
        sumY += y;
    }

    return [sumX / ringM.length, sumY / ringM.length];
}

/**
 * Sutherland-Hodgman clipping of a polygon ring against an axis-aligned square
 * [-half, +half] × [-half, +half].
 */
export function clipRingToTile(
    ring: [number, number][],
    half: number,
): [number, number][] | null {
    if (ring.length < 3) {
        return null;
    }

    const edges: [
        (point: [number, number]) => boolean,
        (a: [number, number], b: [number, number]) => [number, number],
    ][] = [
        [(p) => p[0] <= half, (a, b) => intersectVertical(a, b, half)],
        [(p) => p[0] >= -half, (a, b) => intersectVertical(a, b, -half)],
        [(p) => p[1] <= half, (a, b) => intersectHorizontal(a, b, half)],
        [(p) => p[1] >= -half, (a, b) => intersectHorizontal(a, b, -half)],
    ];

    let polygon = ring;

    for (const [inside, intersect] of edges) {
        const output: [number, number][] = [];

        if (polygon.length === 0) {
            break;
        }

        for (let i = 0; i < polygon.length; i++) {
            const current = polygon[i];
            const next = polygon[(i + 1) % polygon.length];

            if (inside(current)) {
                output.push(current);

                if (!inside(next)) {
                    output.push(intersect(current, next));
                }
            } else if (inside(next)) {
                output.push(intersect(current, next));
            }
        }

        polygon = output;
    }

    return polygon.length >= 3 ? polygon : null;
}

function intersectVertical(
    a: [number, number],
    b: [number, number],
    x: number,
): [number, number] {
    const t = (x - a[0]) / (b[0] - a[0] || Number.EPSILON);

    return [x, a[1] + t * (b[1] - a[1])];
}

function intersectHorizontal(
    a: [number, number],
    b: [number, number],
    y: number,
): [number, number] {
    const t = (y - a[1]) / (b[1] - a[1] || Number.EPSILON);

    return [a[0] + t * (b[0] - a[0]), y];
}

/**
 * Queries OpenFreeMap vector tiles for building footprints that fall within a
 * `halfTile × halfTile` metre square centred on `origin`. Footprints are
 * transformed into local metres (X = east, Y = south, Z = 0) and clipped to the
 * tile boundary.
 *
 * Requires the map to have the OpenFreeMap `building` source-layer loaded
 * (i.e. the map has been flown to a zoom ≥ 15 around the building origin).
 */
export function queryNearbyOsmBuildings(
    map: MapLibreMap,
    origin: LngLatOrigin,
    halfTileM = 50,
): NearbyBuildingFootprint[] {
    const source = map.getSource(OPENFREEMAP_SOURCE);

    if (!source) {
        return [];
    }

    const features = map.querySourceFeatures(OPENFREEMAP_SOURCE, {
        sourceLayer: OPENFREEMAP_BUILDING_SOURCE_LAYER,
        filter: ['!=', ['get', 'hide_3d'], true],
    });
    const originMercator = MercatorCoordinate.fromLngLat(
        { lng: origin[0], lat: origin[1] },
        0,
    );
    const meterScale = originMercator.meterInMercatorCoordinateUnits();
    const footprints: NearbyBuildingFootprint[] = [];

    for (const feature of features) {
        if (feature.properties?.hide_3d === true) {
            continue;
        }

        for (const ringLngLat of collectOuterRings(feature)) {
            const ringM = ringLngLat.map(([lng, lat]) =>
                projectVertex(lng, lat, originMercator, meterScale),
            );
            const clipped = clipRingToTile(ringM, halfTileM);

            if (!clipped) {
                continue;
            }

            const centroid = ringCentroidM(clipped);

            if (
                Math.abs(centroid[0]) > halfTileM ||
                Math.abs(centroid[1]) > halfTileM
            ) {
                continue;
            }

            footprints.push({
                id: feature.id ?? `${centroid[0]},${centroid[1]}`,
                ringM: clipped,
                heightM: resolveHeight(feature.properties),
                baseM: resolveBase(feature.properties),
                centroidM: centroid,
            });
        }
    }

    return footprints;
}

function buildMaterial(): MeshStandardMaterial {
    return new MeshStandardMaterial({
        color: SURROUNDING_COLOR,
        roughness: 0.85,
        metalness: 0.05,
    });
}

function extrudeFootprint(
    footprint: NearbyBuildingFootprint,
    material: MeshStandardMaterial,
): Mesh {
    const shape = new Shape();
    shape.moveTo(footprint.ringM[0][0], footprint.ringM[0][1]);

    for (let i = 1; i < footprint.ringM.length; i++) {
        shape.lineTo(footprint.ringM[i][0], footprint.ringM[i][1]);
    }

    shape.closePath();

    const geometry = new ExtrudeGeometry(shape, {
        depth: Math.max(footprint.heightM - footprint.baseM, 0.5),
        bevelEnabled: false,
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.set(0, 0, footprint.baseM);

    return mesh;
}

/**
 * Builds a disposable `THREE.Group` of extruded OSM footprints positioned in the
 * portal-frame scene's local metres space (Z-up, origin at the building centre).
 */
export function createSurroundingsGroup(
    footprints: NearbyBuildingFootprint[],
): Group {
    const group = new Group();
    group.name = 'site-surroundings';
    const material = buildMaterial();

    for (const footprint of footprints) {
        group.add(extrudeFootprint(footprint, material));
    }

    return group;
}

export function replaceSurroundingsGroup(
    current: Group | null,
    footprints: NearbyBuildingFootprint[],
): Group {
    if (current) {
        disposeObject3D(current);
    }

    return createSurroundingsGroup(footprints);
}
