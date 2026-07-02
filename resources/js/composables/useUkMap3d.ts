import {
    AttributionControl,
    NavigationControl,
    TerrainControl,
} from 'maplibre-gl';
import type { LngLatLike } from 'maplibre-gl';
import { onUnmounted, ref, shallowRef, watch } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import { setupBuildingDrag } from '@/lib/map/map-building-drag';
import { createCustomBuildingsLayer } from '@/lib/map/map-custom-buildings-layer';
import type { CustomBuildingsLayer } from '@/lib/map/map-custom-buildings-layer';
import { createMap } from '@/lib/map/maplibre';
import { constrainMapToUk, UK_MAX_BOUNDS } from '@/lib/map/uk-map-bounds';
import {
    addUkBuildingExtrusions,
    OPENFREEMAP_STYLE,
    UK_MAP_DEFAULTS,
} from '@/lib/map/uk-map-buildings';
import {
    addUkMapTerrain,
    queryTerrainAltitude,
    TERRAIN_DEFAULTS,
    TERRAIN_SOURCE_ID,
} from '@/lib/map/uk-map-terrain';
import type {
    BuildingDraft,
    BuildingPersistence,
    CustomBuilding,
} from '@/types/custom-building';

type MapInstance = ReturnType<typeof createMap>;

export type UseUkMap3dReturn = {
    isLoading: Ref<boolean>;
    error: Ref<string | null>;
    customBuildings: Ref<CustomBuilding[]>;
    mapInstance: ShallowRef<MapInstance | null>;
    addBuildingAt: (
        draft: BuildingDraft,
        origin: [number, number],
    ) => CustomBuilding;
    updateBuilding: (id: string, draft: BuildingDraft) => void;
    attachPersistence: (id: string, persisted: BuildingPersistence) => void;
    removeBuilding: (id: string) => void;
    flyToBuilding: (id: string) => void;
    resize: () => void;
};

export function useUkMap3d(
    containerRef: Ref<HTMLElement | null>,
    initialBuildings: CustomBuilding[] = [],
): UseUkMap3dReturn {
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const customBuildings = ref<CustomBuilding[]>([...initialBuildings]);
    const mapRef = shallowRef<MapInstance | null>(null);
    const customLayerRef = shallowRef<CustomBuildingsLayer | null>(null);
    let dragCleanup: (() => void) | null = null;

    watch(
        customBuildings,
        (buildings) => {
            customLayerRef.value?.syncBuildings(buildings);
            mapRef.value?.triggerRepaint();
        },
        { deep: true },
    );

    function destroyMap(): void {
        dragCleanup?.();
        dragCleanup = null;
        mapRef.value?.remove();
        mapRef.value = null;
        customLayerRef.value = null;
    }

    function initializeMap(container: HTMLElement): void {
        isLoading.value = true;
        error.value = null;

        try {
            const map = createMap(container, {
                style: OPENFREEMAP_STYLE,
                center: UK_MAP_DEFAULTS.center,
                zoom: UK_MAP_DEFAULTS.zoom,
                pitch: UK_MAP_DEFAULTS.pitch,
                bearing: UK_MAP_DEFAULTS.bearing,
                maxBounds: UK_MAX_BOUNDS,
                renderWorldCopies: false,
                maxPitch: 85,
                canvasContextAttributes: { antialias: true },
            });

            map.addControl(
                new NavigationControl({ visualizePitch: true }),
                'top-right',
            );
            map.addControl(
                new TerrainControl({
                    source: TERRAIN_SOURCE_ID,
                    exaggeration: TERRAIN_DEFAULTS.exaggeration,
                }),
                'top-right',
            );
            map.addControl(
                new AttributionControl({ compact: true }),
                'bottom-right',
            );

            const customLayer = createCustomBuildingsLayer(customBuildings);
            customLayerRef.value = customLayer;

            map.on('load', () => {
                constrainMapToUk(map);
                addUkMapTerrain(map);
                addUkBuildingExtrusions(map);
                map.addLayer(customLayer);
                dragCleanup = setupBuildingDrag(map, customBuildings);
                isLoading.value = false;
                map.resize();
            });

            map.on('error', (event) => {
                error.value = event.error?.message ?? 'Failed to load map.';
                isLoading.value = false;
            });

            mapRef.value = map;
        } catch (exception) {
            error.value =
                exception instanceof Error
                    ? exception.message
                    : 'Failed to initialize map.';
            isLoading.value = false;
        }
    }

    watch(
        containerRef,
        (container) => {
            if (container) {
                if (!mapRef.value) {
                    initializeMap(container);
                } else {
                    mapRef.value.resize();
                }

                return;
            }

            destroyMap();
        },
        { flush: 'post' },
    );

    onUnmounted(() => {
        destroyMap();
    });

    function addBuildingAt(
        draft: BuildingDraft,
        origin: [number, number],
    ): CustomBuilding {
        const map = mapRef.value;
        const building: CustomBuilding = {
            ...draft,
            id: crypto.randomUUID(),
            origin,
            altitude: map ? queryTerrainAltitude(map, origin) : 0,
        };

        customBuildings.value = [...customBuildings.value, building];

        map?.flyTo({
            center: building.origin as LngLatLike,
            zoom: Math.max(map.getZoom(), 17),
            pitch: Math.max(map.getPitch(), 45),
            duration: 1200,
        });

        map?.triggerRepaint();

        return building;
    }

    function updateBuilding(id: string, draft: BuildingDraft): void {
        customBuildings.value = customBuildings.value.map((building) =>
            building.id === id
                ? {
                      ...building,
                      portalFrame: { ...draft.portalFrame },
                      rotation: [...draft.rotation],
                  }
                : building,
        );
    }

    function attachPersistence(
        id: string,
        persisted: BuildingPersistence,
    ): void {
        customBuildings.value = customBuildings.value.map((building) =>
            building.id === id ? { ...building, persisted } : building,
        );
    }

    function removeBuilding(id: string): void {
        customBuildings.value = customBuildings.value.filter(
            (building) => building.id !== id,
        );
    }

    function flyToBuilding(id: string): void {
        const building = customBuildings.value.find((entry) => entry.id === id);

        if (!building?.origin || !mapRef.value) {
            return;
        }

        mapRef.value.flyTo({
            center: building.origin as LngLatLike,
            zoom: Math.max(mapRef.value.getZoom(), 17),
            pitch: Math.max(mapRef.value.getPitch(), 45),
            duration: 1200,
        });
    }

    function resize(): void {
        mapRef.value?.resize();
    }

    return {
        isLoading,
        error,
        customBuildings,
        mapInstance: mapRef,
        addBuildingAt,
        updateBuilding,
        attachPersistence,
        removeBuilding,
        flyToBuilding,
        resize,
    };
}
