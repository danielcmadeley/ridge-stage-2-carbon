import { BoxGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import {
    createGroundFloorSlabMesh,
    groundFloorSlab,
    GROUND_FLOOR_SLAB_DEPTH_M,
} from '@/lib/portal-frame/model/ground-floor-slab';
import { buildPortalFrameThreeGroup } from '@/lib/portal-frame/rendering/three-group';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('groundFloorSlab', () => {
    it('spans the building footprint and sits just below ground level', () => {
        const design = defaultPortalFrameDesign();
        const slab = groundFloorSlab(design);

        expect(slab.widthM).toBe(design.span);
        expect(slab.lengthM).toBe(design.buildingLength);
        expect(slab.depthM).toBe(GROUND_FLOOR_SLAB_DEPTH_M);
        expect(slab.center).toEqual([
            0,
            design.buildingLength / 2,
            -GROUND_FLOOR_SLAB_DEPTH_M / 2,
        ]);
    });

    it('creates a box mesh for the solid 3D view', () => {
        const mesh = createGroundFloorSlabMesh(defaultPortalFrameDesign());

        expect(mesh).toBeInstanceOf(Mesh);
        expect(mesh.name).toBe('ground-floor-slab');
        expect(mesh.geometry).toBeInstanceOf(BoxGeometry);
        expect(mesh.receiveShadow).toBe(true);
        expect(mesh.castShadow).toBe(false);
    });

    it('adds the slab to the solid portal frame group', () => {
        const group = buildPortalFrameThreeGroup(
            defaultPortalFrameDesign(),
            'solid',
        );

        expect(
            group.children.some((child) => child.name === 'ground-floor-slab'),
        ).toBe(true);
    });
});
