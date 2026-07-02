import { BoxGeometry, Mesh } from 'three';
import {
    configurePortalFrameMeshShadows,
    createSlabMaterial,
} from '@/lib/portal-frame/rendering/portal-frame-materials';
import type { PortalFrameDesign } from '@/types/portal-frame';

export const GROUND_FLOOR_SLAB_DEPTH_M = 0.25;
export const GROUND_FLOOR_SLAB_REBAR_DIAMETER_MM = 12;
export const GROUND_FLOOR_SLAB_REBAR_SPACING_M = 0.2;

export type GroundFloorSlab = {
    id: 'ground-floor-slab';
    widthM: number;
    lengthM: number;
    depthM: number;
    center: [number, number, number];
};

export function groundFloorSlab(design: PortalFrameDesign): GroundFloorSlab {
    return {
        id: 'ground-floor-slab',
        widthM: design.span,
        lengthM: design.buildingLength,
        depthM: GROUND_FLOOR_SLAB_DEPTH_M,
        center: [0, design.buildingLength / 2, -GROUND_FLOOR_SLAB_DEPTH_M / 2],
    };
}

export function createGroundFloorSlabMesh(design: PortalFrameDesign): Mesh {
    const slab = groundFloorSlab(design);
    const geometry = new BoxGeometry(slab.widthM, slab.lengthM, slab.depthM);
    const material = createSlabMaterial();
    const mesh = new Mesh(geometry, material);

    mesh.name = slab.id;
    mesh.position.set(...slab.center);
    configurePortalFrameMeshShadows(mesh);

    return mesh;
}
