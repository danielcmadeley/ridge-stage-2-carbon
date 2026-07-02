import { Group, Line, Mesh, Sprite } from 'three';
import { createForceDiagramGroup } from '@/lib/portal-frame/analysis/force-diagram-3d';
import type {
    AnalyticalForceMode,
    AnalyticalLoadCase,
} from '@/lib/portal-frame/analysis/force-diagram-3d';
import { adjustMembersForAnalysis } from '@/lib/portal-frame/model/analytical-adjustments';
import {
    buildPortalFrame,
    portalFrameApexHeight,
    portalFrameCenter,
} from '@/lib/portal-frame/model/geometry-builder';
import { createGroundFloorSlabMesh } from '@/lib/portal-frame/model/ground-floor-slab';
import { createEavesHaunches } from '@/lib/portal-frame/model/haunch-geometry';
import { adjustMembersForRendering } from '@/lib/portal-frame/model/render-adjustments';
import { createColumnGridGroup } from '@/lib/portal-frame/rendering/column-grid/column-grid';
import { createPortalFrameGroup } from '@/lib/portal-frame/rendering/geometries/i-shape-geometry';
import { createStickAnalysisGroup } from '@/lib/portal-frame/rendering/stick-model';
import { createSupportAnnotationsGroup } from '@/lib/portal-frame/rendering/support-annotations';
import type { PortalFrameDesign } from '@/types/portal-frame';

export type PortalFrameViewMode = 'solid' | 'analytical';
export type { AnalyticalForceMode, AnalyticalLoadCase };

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
    loadCase: AnalyticalLoadCase = 'unfactored',
): Group {
    const built = buildPortalFrame(design);
    const group = new Group();

    if (viewMode === 'analytical') {
        const analysisMembers = adjustMembersForAnalysis(built.members, design);
        group.add(createStickAnalysisGroup(analysisMembers));
        group.add(
            createForceDiagramGroup(
                built.members,
                built,
                design,
                forceMode,
                loadCase,
            ),
        );
        group.add(
            createSupportAnnotationsGroup(
                analysisMembers,
                built,
                design,
                loadCase,
            ),
        );
    } else {
        const renderMembers = adjustMembersForRendering(built.members);
        group.add(createGroundFloorSlabMesh(design));
        createPortalFrameGroup(renderMembers).forEach((mesh) =>
            group.add(mesh),
        );
        createEavesHaunches(built.members, renderMembers, design.span).forEach(
            (mesh) => group.add(mesh),
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
    loadCase: AnalyticalLoadCase = 'unfactored',
): Group {
    if (current) {
        disposeObject3D(current);
    }

    return buildPortalFrameThreeGroup(design, viewMode, forceMode, loadCase);
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
