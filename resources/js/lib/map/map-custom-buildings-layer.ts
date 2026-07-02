import { MercatorCoordinate } from 'maplibre-gl';
import type {
    CustomRenderMethodInput,
    CustomLayerInterface,
    Map as MapLibreMap,
} from 'maplibre-gl';
import type { Group } from 'three';
import {
    Camera,
    DirectionalLight,
    Matrix4,
    Scene,
    Vector3,
    WebGLRenderer,
} from 'three';
import type { Ref } from 'vue';
import {
    isTerrainEnabled,
    queryTerrainAltitude,
} from '@/lib/map/uk-map-terrain';
import {
    buildPortalFrameThreeGroup,
    disposeObject3D,
} from '@/lib/portal-frame/rendering/three-group';
import { isPlacedOnMap } from '@/types/custom-building';
import type {
    CustomBuilding,
    PlacedCustomBuilding,
} from '@/types/custom-building';

const LAYER_ID = 'custom-buildings';

type BuildingMeshEntry = {
    group: Group;
    building: PlacedCustomBuilding;
};

function resolveBuildingAltitude(
    map: MapLibreMap,
    building: PlacedCustomBuilding,
): number {
    if (isTerrainEnabled(map)) {
        return queryTerrainAltitude(map, building.origin);
    }

    return building.altitude;
}

function buildLocalMatrix(
    building: PlacedCustomBuilding,
    map: MapLibreMap,
): Matrix4 {
    const altitude = resolveBuildingAltitude(map, building);
    const mercator = MercatorCoordinate.fromLngLat(building.origin, altitude);
    const meterScale = mercator.meterInMercatorCoordinateUnits();

    const rotationX = new Matrix4().makeRotationAxis(
        new Vector3(1, 0, 0),
        building.rotation[0],
    );
    const rotationY = new Matrix4().makeRotationAxis(
        new Vector3(0, 1, 0),
        building.rotation[1],
    );
    const rotationZ = new Matrix4().makeRotationAxis(
        new Vector3(0, 0, 1),
        building.rotation[2],
    );

    return new Matrix4()
        .makeTranslation(mercator.x, mercator.y, mercator.z)
        .scale(new Vector3(meterScale, -meterScale, meterScale))
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);
}

function createBuildingGroup(building: CustomBuilding): Group {
    return buildPortalFrameThreeGroup(building.portalFrame);
}

function portalFrameChanged(
    a: PlacedCustomBuilding,
    b: PlacedCustomBuilding,
): boolean {
    const frameA = a.portalFrame;
    const frameB = b.portalFrame;

    return (
        frameA.span !== frameB.span ||
        frameA.eavesHeight !== frameB.eavesHeight ||
        frameA.buildingLength !== frameB.buildingLength ||
        frameA.baySpacing !== frameB.baySpacing ||
        frameA.deadLoadKnM2 !== frameB.deadLoadKnM2 ||
        frameA.servicesLoadKnM2 !== frameB.servicesLoadKnM2 ||
        frameA.liveLoadKnM2 !== frameB.liveLoadKnM2 ||
        frameA.columnRestraint !== frameB.columnRestraint ||
        frameA.roofPitchDeg !== frameB.roofPitchDeg ||
        a.origin[0] !== b.origin[0] ||
        a.origin[1] !== b.origin[1] ||
        a.altitude !== b.altitude ||
        a.rotation[0] !== b.rotation[0] ||
        a.rotation[1] !== b.rotation[1] ||
        a.rotation[2] !== b.rotation[2]
    );
}

export type CustomBuildingsLayer = CustomLayerInterface & {
    syncBuildings: (buildings: CustomBuilding[]) => void;
};

class CustomBuildingsLayerImpl implements CustomBuildingsLayer {
    id = LAYER_ID;

    type = 'custom' as const;

    renderingMode = '3d' as const;

    private map?: MapLibreMap;

    private camera?: Camera;

    private scene?: Scene;

    private renderer?: WebGLRenderer;

    private readonly meshEntries = new Map<string, BuildingMeshEntry>();

    onAdd(
        map: MapLibreMap,
        gl: WebGLRenderingContext | WebGL2RenderingContext,
    ): void {
        this.map = map;
        this.camera = new Camera();
        this.scene = new Scene();

        const lightA = new DirectionalLight(0xffffff, 1.2);
        lightA.position.set(0, -70, 100).normalize();
        this.scene.add(lightA);

        const lightB = new DirectionalLight(0xffffff, 0.8);
        lightB.position.set(0, 70, 100).normalize();
        this.scene.add(lightB);

        this.renderer = new WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
        });
        this.renderer.autoClear = false;
    }

    render(
        _gl: WebGLRenderingContext | WebGL2RenderingContext,
        args: CustomRenderMethodInput,
    ): void {
        if (!this.renderer || !this.camera || !this.scene || !this.map) {
            return;
        }

        if (this.meshEntries.size === 0) {
            return;
        }

        const projection = new Matrix4().fromArray(
            args.defaultProjectionData.mainMatrix,
        );

        for (const { group, building } of this.meshEntries.values()) {
            for (const entry of this.meshEntries.values()) {
                entry.group.visible = entry.group === group;
            }

            this.camera.projectionMatrix = projection
                .clone()
                .multiply(buildLocalMatrix(building, this.map));
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);
        }

        for (const entry of this.meshEntries.values()) {
            entry.group.visible = true;
        }

        if (isTerrainEnabled(this.map)) {
            this.map.triggerRepaint();
        }
    }

    syncBuildings(allBuildings: CustomBuilding[]): void {
        if (!this.scene) {
            return;
        }

        // Buildings without a map location have nothing to render.
        const nextBuildings = allBuildings.filter(isPlacedOnMap);

        const nextIds = new Set(nextBuildings.map((building) => building.id));

        for (const [id, entry] of this.meshEntries) {
            if (!nextIds.has(id)) {
                this.scene.remove(entry.group);
                disposeObject3D(entry.group);
                this.meshEntries.delete(id);
            }
        }

        for (const building of nextBuildings) {
            const existing = this.meshEntries.get(building.id);

            if (!existing) {
                const group = createBuildingGroup(building);
                this.scene.add(group);
                this.meshEntries.set(building.id, { group, building });
                continue;
            }

            if (portalFrameChanged(existing.building, building)) {
                this.scene.remove(existing.group);
                disposeObject3D(existing.group);

                const group = createBuildingGroup(building);
                this.scene.add(group);
                this.meshEntries.set(building.id, { group, building });
                continue;
            }

            existing.building = building;
        }
    }

    onRemove(): void {
        for (const { group } of this.meshEntries.values()) {
            disposeObject3D(group);
        }

        this.meshEntries.clear();
        this.renderer?.dispose();
    }
}

export function createCustomBuildingsLayer(
    buildings: Ref<CustomBuilding[]>,
): CustomBuildingsLayer {
    const layer = new CustomBuildingsLayerImpl();

    const originalOnAdd = layer.onAdd.bind(layer);
    layer.onAdd = (map, gl) => {
        originalOnAdd(map, gl);
        layer.syncBuildings(buildings.value);
    };

    return layer;
}
