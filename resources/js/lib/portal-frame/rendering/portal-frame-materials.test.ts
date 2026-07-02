import { Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import {
    configurePortalFrameMeshShadows,
    createConcreteMaterial,
    createFrameMemberSteelMaterial,
    createGalvanizedSteelMaterial,
    createRedOxideSteelMaterial,
    createSlabMaterial,
} from '@/lib/portal-frame/rendering/portal-frame-materials';
import { findZSection } from '@/lib/portal-frame/sections/z-sections';
import type { FrameMember } from '@/types/portal-frame';
import {
    PORTAL_FRAME_FOUNDATION_COLOR,
    PORTAL_FRAME_SECONDARY_STEEL_COLOR,
    PORTAL_FRAME_SLAB_COLOR,
    PORTAL_FRAME_STEEL_COLOR,
} from '@/types/portal-frame';

describe('portal frame materials', () => {
    it('uses matte red oxide paint for primary steel', () => {
        const material = createRedOxideSteelMaterial();

        expect(material).toBeInstanceOf(MeshStandardMaterial);
        expect(material.color.getHexString()).toBe(
            PORTAL_FRAME_STEEL_COLOR.replace('#', ''),
        );
        expect(material.metalness).toBeLessThan(0.25);
        expect(material.roughness).toBeLessThan(0.7);
    });

    it('uses reflective galvanized steel for secondary members', () => {
        const material = createGalvanizedSteelMaterial();

        expect(material.color.getHexString()).toBe(
            PORTAL_FRAME_SECONDARY_STEEL_COLOR.replace('#', ''),
        );
        expect(material.metalness).toBeGreaterThan(0.4);
        expect(material.roughness).toBeLessThan(0.4);
    });

    it('uses dark grey concrete for foundations', () => {
        const material = createConcreteMaterial();

        expect(material.color.getHexString()).toBe(
            PORTAL_FRAME_FOUNDATION_COLOR.replace('#', ''),
        );
        expect(material.metalness).toBe(0);
        expect(material.roughness).toBeLessThan(0.8);
    });

    it('uses lighter grey concrete for the ground floor slab', () => {
        const material = createSlabMaterial();

        expect(material.color.getHexString()).toBe(
            PORTAL_FRAME_SLAB_COLOR.replace('#', ''),
        );
        expect(material.transparent).toBe(true);
        expect(material.opacity).toBe(0.92);
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
