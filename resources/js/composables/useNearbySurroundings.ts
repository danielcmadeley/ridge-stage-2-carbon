import type { Map as MapLibreMap } from 'maplibre-gl';
import type { Group } from 'three';
import { shallowRef, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import {
    queryNearbyOsmBuildings,
    replaceSurroundingsGroup,
} from '@/lib/portal-frame/rendering/nearby-osm-buildings';
import type { LngLatOrigin } from '@/lib/portal-frame/rendering/nearby-osm-buildings';

export type UseNearbySurroundingsOptions = {
    /** Half-extent of the surrounding tile in metres (default 50 → 0.1 km × 0.1 km). */
    halfTileM?: number;
    /** Max time to wait for the map to idle before querying (ms). */
    idleTimeoutMs?: number;
};

const DEFAULT_HALF_TILE_M = 50;
const DEFAULT_IDLE_TIMEOUT_MS = 4000;

function originKey(origin: LngLatOrigin | null): string {
    return origin ? `${origin[0].toFixed(7)},${origin[1].toFixed(7)}` : '';
}

function waitForIdle(map: MapLibreMap, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
        if (!map.isMoving() && !map.isEasing()) {
            resolve();

            return;
        }

        let settled = false;
        const settle = (): void => {
            if (settled) {
                return;
            }

            settled = true;
            cleanup();
            resolve();
        };
        const cleanup = (): void => {
            map.off('idle', settle);
        };

        map.once('idle', settle);
        window.setTimeout(settle, timeoutMs);
    });
}

/**
 * Reactive Group of surrounding OSM building footprints centred on the active
 * building origin. Re-queries when the map is ready and the origin settles.
 *
 * Returns a `ShallowRef<Group | null>` — `null` until the building has been
 * placed on the map and the OSM building source has loaded tiles around it.
 */
export function useNearbySurroundings(
    mapInstance: ComputedRef<MapLibreMap | null> | Ref<MapLibreMap | null>,
    origin: ComputedRef<LngLatOrigin | null> | Ref<LngLatOrigin | null>,
    options: UseNearbySurroundingsOptions = {},
) {
    const halfTileM = options.halfTileM ?? DEFAULT_HALF_TILE_M;
    const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    const surroundings = shallowRef<Group | null>(null);

    let inflight = 0;
    let lastOrigin = '';

    async function refresh(
        map: MapLibreMap,
        next: LngLatOrigin,
    ): Promise<void> {
        const token = ++inflight;

        await waitForIdle(map, idleTimeoutMs);

        if (token !== inflight) {
            return;
        }

        const footprints = queryNearbyOsmBuildings(map, next, halfTileM);
        const rebuilt = replaceSurroundingsGroup(
            surroundings.value,
            footprints,
        );

        if (token === inflight) {
            surroundings.value = footprints.length > 0 ? rebuilt : null;
        }
    }

    watch(
        [mapInstance, origin] as const,
        ([map, next]) => {
            const key = originKey(next);

            if (!map || !next || key === lastOrigin) {
                return;
            }

            lastOrigin = key;
            void refresh(map, next);
        },
        { immediate: true },
    );

    return { surroundings };
}
