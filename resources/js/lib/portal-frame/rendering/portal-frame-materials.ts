import type { Mesh } from 'three';
import { MeshStandardMaterial } from 'three';
import type { FrameMember } from '@/types/portal-frame';
import {
    PORTAL_FRAME_FOUNDATION_COLOR,
    PORTAL_FRAME_SECONDARY_STEEL_COLOR,
    PORTAL_FRAME_STEEL_COLOR,
} from '@/types/portal-frame';

export function createRedOxideSteelMaterial(): MeshStandardMaterial {
    return new MeshStandardMaterial({
        color: PORTAL_FRAME_STEEL_COLOR,
        metalness: 0.18,
        roughness: 0.72,
    });
}

export function createGalvanizedSteelMaterial(): MeshStandardMaterial {
    return new MeshStandardMaterial({
        color: PORTAL_FRAME_SECONDARY_STEEL_COLOR,
        metalness: 0.62,
        roughness: 0.38,
    });
}

export function createConcreteMaterial(
    options: { transparent?: boolean; opacity?: number } = {},
): MeshStandardMaterial {
    return new MeshStandardMaterial({
        color: PORTAL_FRAME_FOUNDATION_COLOR,
        metalness: 0,
        roughness: 0.96,
        ...options,
    });
}

export function createFrameMemberSteelMaterial(
    member: FrameMember,
): MeshStandardMaterial {
    if (member.role === 'purlin' || member.role === 'side_rail') {
        return createGalvanizedSteelMaterial();
    }

    return createRedOxideSteelMaterial();
}

export function configurePortalFrameMeshShadows(
    mesh: Mesh,
    role?: FrameMember['role'],
): void {
    if (mesh.name === 'ground-floor-slab') {
        mesh.receiveShadow = true;
        mesh.castShadow = false;

        return;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = role === 'foundation';
}
