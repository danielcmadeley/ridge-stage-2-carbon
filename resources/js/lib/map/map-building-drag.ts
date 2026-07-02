import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import type { Ref } from 'vue';
import { queryTerrainAltitude } from '@/lib/map/uk-map-terrain';
import type { CustomBuilding } from '@/types/custom-building';

const PICK_RADIUS_PX = 48;

type BuildingDragHandlers = {
    onDragStart?: (buildingId: string) => void;
    onDragEnd?: (buildingId: string) => void;
};

function pickBuildingAtPoint(
    map: MapLibreMap,
    buildings: CustomBuilding[],
    point: MapMouseEvent['point'],
): string | null {
    let closest: { id: string; distance: number } | null = null;

    for (const building of buildings) {
        if (!building.origin) {
            continue;
        }

        const projected = map.project(building.origin);
        const distance = Math.hypot(
            projected.x - point.x,
            projected.y - point.y,
        );

        if (distance > PICK_RADIUS_PX) {
            continue;
        }

        if (!closest || distance < closest.distance) {
            closest = { id: building.id, distance };
        }
    }

    return closest?.id ?? null;
}

export function setupBuildingDrag(
    map: MapLibreMap,
    buildings: Ref<CustomBuilding[]>,
    handlers: BuildingDragHandlers = {},
): () => void {
    let draggingId: string | null = null;
    const canvas = map.getCanvas();

    const onMouseDown = (event: MapMouseEvent): void => {
        if (event.originalEvent.button !== 0 || buildings.value.length === 0) {
            return;
        }

        const buildingId = pickBuildingAtPoint(
            map,
            buildings.value,
            event.point,
        );

        if (!buildingId) {
            return;
        }

        draggingId = buildingId;
        map.dragPan.disable();
        canvas.style.cursor = 'grabbing';
        handlers.onDragStart?.(buildingId);
        event.preventDefault();
    };

    const onMouseMove = (event: MapMouseEvent): void => {
        if (!draggingId) {
            const hoveredId = pickBuildingAtPoint(
                map,
                buildings.value,
                event.point,
            );
            canvas.style.cursor = hoveredId ? 'grab' : '';

            return;
        }

        buildings.value = buildings.value.map((building) =>
            building.id === draggingId
                ? {
                      ...building,
                      origin: [event.lngLat.lng, event.lngLat.lat],
                  }
                : building,
        );

        map.triggerRepaint();
    };

    const finishDrag = (): void => {
        if (!draggingId) {
            return;
        }

        const buildingId = draggingId;
        draggingId = null;
        map.dragPan.enable();
        canvas.style.cursor = '';

        buildings.value = buildings.value.map((building) =>
            building.id === buildingId && building.origin
                ? {
                      ...building,
                      altitude: queryTerrainAltitude(map, building.origin),
                  }
                : building,
        );

        handlers.onDragEnd?.(buildingId);
        map.triggerRepaint();
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', finishDrag);
    map.on('mouseleave', finishDrag);

    return () => {
        map.off('mousedown', onMouseDown);
        map.off('mousemove', onMouseMove);
        map.off('mouseup', finishDrag);
        map.off('mouseleave', finishDrag);
        map.dragPan.enable();
        canvas.style.cursor = '';
    };
}
