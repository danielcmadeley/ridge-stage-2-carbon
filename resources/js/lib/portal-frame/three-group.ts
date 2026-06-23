import { Group, Line, Mesh, Sprite } from 'three';
import {
    buildPortalFrame,
    portalFrameApexHeight,
    portalFrameCenter,
} from '@/lib/portal-frame/geometry-builder';
import { createColumnGridGroup } from '@/lib/portal-frame/column-grid';
import { createPortalFrameGroup } from '@/lib/portal-frame/i-shape-geometry';
import { createEavesHaunches } from '@/lib/portal-frame/haunch-geometry';
import { adjustMembersForAnalysis } from '@/lib/portal-frame/analytical-adjustments';
import { adjustMembersForRendering } from '@/lib/portal-frame/render-adjustments';
import { createStickAnalysisGroup } from '@/lib/portal-frame/stick-model';
import {
    createForceDiagramGroup,
    type AnalyticalForceMode,
} from '@/lib/portal-frame/force-diagram-3d';
import { createGroundFloorSlabMesh } from '@/lib/portal-frame/ground-floor-slab';
import type { PortalFrameDesign } from '@/types/portal-frame';

export type PortalFrameViewMode = 'solid' | 'analytical';
export type { AnalyticalForceMode };

function disposeObject3D(object: Group): void {
    object.traverse((child) => {
        if (child instanceof Mesh || child instanceof Line) {
            child.geometry.dispose();

            if (Array.isArray(child.material)) {
                child.material.forEach((material) => material.dispose());
            } else {
                child.material.dispose();
            }
        }

        if (child instanceof Sprite) {
            child.material.map?.dispose();
            child.material.dispose();
        }
    });
}

export function buildPortalFrameThreeGroup(
    design: PortalFrameDesign,
    viewMode: PortalFrameViewMode = 'solid',
    forceMode: AnalyticalForceMode = 'moment',
): Group {
    const built = buildPortalFrame(design);
    const group = new Group();

    if (viewMode === 'analytical') {
        const analysisMembers = adjustMembersForAnalysis(built.members, design);
        group.add(createStickAnalysisGroup(analysisMembers));
        group.add(createForceDiagramGroup(built.members, built, design, forceMode));
    } else {
        const renderMembers = adjustMembersForRendering(built.members);
        group.add(createGroundFloorSlabMesh(design));
        createPortalFrameGroup(renderMembers).forEach((mesh) => group.add(mesh));
        createEavesHaunches(built.members, renderMembers).forEach((mesh) =>
            group.add(mesh),
        );
    }

    addColumnGridSafely(group, design);
    group.position.set(0, -design.buildingLength / 2, 0);

    return group;
}

function addColumnGridSafely(group: Group, design: PortalFrameDesign): void {
    try {
        group.add(createColumnGridGroup(design));
    } catch {
        // Grid labels need a browser canvas; never fail the structural preview.
    }
}

export function replacePortalFrameThreeGroup(
    current: Group | null,
    design: PortalFrameDesign,
    viewMode: PortalFrameViewMode = 'solid',
    forceMode: AnalyticalForceMode = 'moment',
): Group {
    if (current) {
        disposeObject3D(current);
    }

    return buildPortalFrameThreeGroup(design, viewMode, forceMode);
}

export function portalFramePreviewMetrics(design: PortalFrameDesign): {
    apexHeight: number;
    center: [number, number, number];
    size: number;
} {
    const apexHeight = portalFrameApexHeight(design);
    const center = portalFrameCenter(design);
    const size = Math.max(design.span, design.buildingLength, apexHeight);

    return { apexHeight, center, size };
}

export { disposeObject3D };
