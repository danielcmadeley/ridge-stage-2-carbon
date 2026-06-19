import { AttributionControl, NavigationControl, TerrainControl } from 'maplibre-gl';
import type { LngLatLike } from 'maplibre-gl';
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import {
    createCustomBuildingsLayer,
} from '@/lib/map-custom-buildings-layer';
import type { CustomBuildingsLayer } from '@/lib/map-custom-buildings-layer';
import { createMap } from '@/lib/maplibre';
import { constrainMapToUk, UK_MAX_BOUNDS } from '@/lib/uk-map-bounds';
import {
    addUkBuildingExtrusions,
    OPENFREEMAP_STYLE,
    UK_MAP_DEFAULTS,
} from '@/lib/uk-map-buildings';
import {
    addUkMapTerrain,
    queryTerrainAltitude,
    TERRAIN_DEFAULTS,
    TERRAIN_SOURCE_ID,
} from '@/lib/uk-map-terrain';
import type { BuildingDraft, CustomBuilding } from '@/types/custom-building';

export type UseUkMap3dReturn = {
    isLoading: Ref<boolean>;
    error: Ref<string | null>;
    customBuildings: Ref<CustomBuilding[]>;
    addBuilding: (draft: BuildingDraft) => CustomBuilding;
    removeBuilding: (id: string) => void;
    flyToBuilding: (id: string) => void;
    getCenter: () => [number, number];
};

export function useUkMap3d(
    containerRef: Ref<HTMLElement | null>,
): UseUkMap3dReturn {
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const customBuildings = ref<CustomBuilding[]>([]);
    const mapRef = shallowRef<ReturnType<typeof createMap> | null>(null);
    const customLayerRef = shallowRef<CustomBuildingsLayer | null>(null);

    watch(customBuildings, (buildings) => {
        customLayerRef.value?.syncBuildings(buildings);
        mapRef.value?.triggerRepaint();
    }, { deep: true });

    onMounted(() => {
        if (!containerRef.value) {
            error.value = 'Map container is not available.';
            isLoading.value = false;

            return;
        }

        try {
            const map = createMap(containerRef.value, {
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

            map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
            map.addControl(
                new TerrainControl({
                    source: TERRAIN_SOURCE_ID,
                    exaggeration: TERRAIN_DEFAULTS.exaggeration,
                }),
                'top-right',
            );
            map.addControl(new AttributionControl({ compact: true }), 'bottom-right');

            const customLayer = createCustomBuildingsLayer(customBuildings);
            customLayerRef.value = customLayer;

            map.on('load', () => {
                constrainMapToUk(map);
                addUkMapTerrain(map);
                addUkBuildingExtrusions(map);
                map.addLayer(customLayer);
                isLoading.value = false;
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
    });

    onUnmounted(() => {
        mapRef.value?.remove();
        mapRef.value = null;
        customLayerRef.value = null;
    });

    function getCenter(): [number, number] {
        const center = mapRef.value?.getCenter();

        if (!center) {
            return [...UK_MAP_DEFAULTS.center];
        }

        return [center.lng, center.lat];
    }

    function addBuilding(draft: BuildingDraft): CustomBuilding {
        const [lng, lat] = getCenter();
        const map = mapRef.value;
        const building: CustomBuilding = {
            ...draft,
            id: crypto.randomUUID(),
            origin: [lng, lat],
            altitude: map ? queryTerrainAltitude(map, [lng, lat]) : 0,
        };

        customBuildings.value = [...customBuildings.value, building];

        map?.flyTo({
            center: building.origin as LngLatLike,
            zoom: Math.max(map.getZoom(), 16),
            pitch: Math.max(map.getPitch(), 45),
            duration: 1200,
        });

        map?.triggerRepaint();

        return building;
    }

    function removeBuilding(id: string): void {
        customBuildings.value = customBuildings.value.filter(
            (building) => building.id !== id,
        );
    }

    function flyToBuilding(id: string): void {
        const building = customBuildings.value.find((entry) => entry.id === id);

        if (!building || !mapRef.value) {
            return;
        }

        mapRef.value.flyTo({
            center: building.origin as LngLatLike,
            zoom: Math.max(mapRef.value.getZoom(), 16),
            pitch: Math.max(mapRef.value.getPitch(), 45),
            duration: 1200,
        });
    }

    return {
        isLoading,
        error,
        customBuildings,
        addBuilding,
        removeBuilding,
        flyToBuilding,
        getCenter,
    };
}
