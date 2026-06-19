import { MercatorCoordinate } from 'maplibre-gl';
import type {
    CustomRenderMethodInput,
    CustomLayerInterface,
    Map as MapLibreMap,
} from 'maplibre-gl';
import {
    BoxGeometry,
    Camera,
    Color,
    DirectionalLight,
    Matrix4,
    Mesh,
    MeshStandardMaterial,
    Scene,
    Vector3,
    WebGLRenderer,
} from 'three';
import type { Ref } from 'vue';
import { isTerrainEnabled, queryTerrainAltitude } from '@/lib/uk-map-terrain';
import type { CustomBuilding } from '@/types/custom-building';

const LAYER_ID = 'custom-buildings';

type BuildingMeshEntry = {
    mesh: Mesh;
    building: CustomBuilding;
};

function resolveBuildingAltitude(
    map: MapLibreMap,
    building: CustomBuilding,
): number {
    if (isTerrainEnabled(map)) {
        return queryTerrainAltitude(map, building.origin);
    }

    return building.altitude;
}

function buildLocalMatrix(
    building: CustomBuilding,
    map: MapLibreMap,
): Matrix4 {
    const altitude = resolveBuildingAltitude(map, building);
    const mercator = MercatorCoordinate.fromLngLat(building.origin, altitude);
    const meterScale = mercator.meterInMercatorCoordinateUnits();
    const { width, depth, height } = building.dimensions;

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
        .scale(new Vector3(width * meterScale, height * meterScale, depth * meterScale))
        .scale(new Vector3(1, -1, 1))
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ)
        .multiply(new Matrix4().makeTranslation(0, 0.5, 0));
}

function createBuildingMesh(building: CustomBuilding): Mesh {
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshStandardMaterial({
        color: new Color(building.color ?? '#6366f1'),
        metalness: 0.2,
        roughness: 0.65,
    });

    return new Mesh(geometry, material);
}

function buildingChanged(a: CustomBuilding, b: CustomBuilding): boolean {
    return (
        a.dimensions.width !== b.dimensions.width ||
        a.dimensions.depth !== b.dimensions.depth ||
        a.dimensions.height !== b.dimensions.height ||
        a.color !== b.color ||
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

    onAdd(map: MapLibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
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

    render(_gl: WebGLRenderingContext | WebGL2RenderingContext, args: CustomRenderMethodInput): void {
        if (!this.renderer || !this.camera || !this.scene || !this.map) {
            return;
        }

        if (this.meshEntries.size === 0) {
            return;
        }

        const projection = new Matrix4().fromArray(
            args.defaultProjectionData.mainMatrix,
        );

        for (const { mesh, building } of this.meshEntries.values()) {
            for (const entry of this.meshEntries.values()) {
                entry.mesh.visible = entry.mesh === mesh;
            }

            this.camera.projectionMatrix = projection
                .clone()
                .multiply(buildLocalMatrix(building, this.map));
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);
        }

        for (const entry of this.meshEntries.values()) {
            entry.mesh.visible = true;
        }

        if (isTerrainEnabled(this.map)) {
            this.map.triggerRepaint();
        }
    }

    syncBuildings(nextBuildings: CustomBuilding[]): void {
        if (!this.scene) {
            return;
        }

        const nextIds = new Set(nextBuildings.map((building) => building.id));

        for (const [id, entry] of this.meshEntries) {
            if (!nextIds.has(id)) {
                this.scene.remove(entry.mesh);
                entry.mesh.geometry.dispose();
                (entry.mesh.material as MeshStandardMaterial).dispose();
                this.meshEntries.delete(id);
            }
        }

        for (const building of nextBuildings) {
            const existing = this.meshEntries.get(building.id);

            if (!existing) {
                const mesh = createBuildingMesh(building);
                this.scene.add(mesh);
                this.meshEntries.set(building.id, { mesh, building });
                continue;
            }

            if (buildingChanged(existing.building, building)) {
                this.scene.remove(existing.mesh);
                existing.mesh.geometry.dispose();
                (existing.mesh.material as MeshStandardMaterial).dispose();

                const mesh = createBuildingMesh(building);
                this.scene.add(mesh);
                this.meshEntries.set(building.id, { mesh, building });
                continue;
            }

            existing.building = building;
        }
    }

    onRemove(): void {
        for (const { mesh } of this.meshEntries.values()) {
            mesh.geometry.dispose();
            (mesh.material as MeshStandardMaterial).dispose();
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
