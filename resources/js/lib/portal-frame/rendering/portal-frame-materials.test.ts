import { Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import {
    configurePortalFrameMeshShadows,
    createConcreteMaterial,
    createFrameMemberSteelMaterial,
    createGalvanizedSteelMaterial,
    createRedOxideSteelMaterial,
} from '@/lib/portal-frame/rendering/portal-frame-materials';
import { findZSection } from '@/lib/portal-frame/sections/z-sections';
import type { FrameMember } from '@/types/portal-frame';
import {
    PORTAL_FRAME_FOUNDATION_COLOR,
    PORTAL_FRAME_SECONDARY_STEEL_COLOR,
    PORTAL_FRAME_STEEL_COLOR,
} from '@/types/portal-frame';

describe('portal frame materials', () => {
    it('uses matte red oxide paint for primary steel', () => {
        const material = createRedOxideSteelMaterial();

        expect(material).toBeInstanceOf(MeshStandardMaterial);
        expect(material.color.getHexString()).toBe(
            PORTAL_FRAME_STEEL_COLOR.replace('#', ''),
        );
        expect(material.metalness).toBeLessThan(0.3);
        expect(material.roughness).toBeGreaterThan(0.65);
    });

    it('uses reflective galvanized steel for secondary members', () => {
        const material = createGalvanizedSteelMaterial();

        expect(material.color.getHexString()).toBe(
            PORTAL_FRAME_SECONDARY_STEEL_COLOR.replace('#', ''),
        );
        expect(material.metalness).toBeGreaterThan(0.5);
        expect(material.roughness).toBeLessThan(0.5);
    });

    it('uses warm concrete for foundations and slabs', () => {
        const material = createConcreteMaterial();

        expect(material.color.getHexString()).toBe(
            PORTAL_FRAME_FOUNDATION_COLOR.replace('#', ''),
        );
        expect(material.metalness).toBe(0);
        expect(material.roughness).toBeGreaterThan(0.9);
    });

    it('selects galvanized material for purlins and side rails', () => {
        const purlin: FrameMember = {
            id: 'purlin-0',
            role: 'purlin',
            start: [0, 0, 0],
            end: [1, 0, 0],
            section: findZSection('202 Z 16'),
        };

        expect(createFrameMemberSteelMaterial(purlin).metalness).toBe(
            createGalvanizedSteelMaterial().metalness,
        );
    });

    it('configures shadow flags for the slab and foundations', () => {
        const slab = new Mesh(undefined, new MeshStandardMaterial());
        slab.name = 'ground-floor-slab';
        configurePortalFrameMeshShadows(slab);
        expect(slab.castShadow).toBe(false);
        expect(slab.receiveShadow).toBe(true);

        const footing = new Mesh(undefined, new MeshStandardMaterial());
        configurePortalFrameMeshShadows(footing, 'foundation');
        expect(footing.castShadow).toBe(true);
        expect(footing.receiveShadow).toBe(true);

        const column = new Mesh(undefined, new MeshStandardMaterial());
        configurePortalFrameMeshShadows(column, 'column');
        expect(column.castShadow).toBe(true);
        expect(column.receiveShadow).toBe(false);
    });
});
