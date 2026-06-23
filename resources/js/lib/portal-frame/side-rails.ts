import { gableColumnXPositions } from '@/lib/portal-frame/gable-columns';
import { spacedOffsetsAlongSpan } from '@/lib/portal-frame/member-spacing';
import type {
    CSectionDimensions,
    FrameMember,
    PortalFrameDesign,
    UbSectionDimensions,
} from '@/types/portal-frame';

const SIDE_RAIL_START_OFFSET_M = 1.0;
const SIDE_RAIL_SPACING_M = 1.5;

export function outerColumnFlangeX(
    halfSpan: number,
    columnSection: UbSectionDimensions,
    side: 'left' | 'right',
): number {
    const halfFlangeWidthM = columnSection.b / 2000;

    return side === 'left'
        ? -halfSpan - halfFlangeWidthM
        : halfSpan + halfFlangeWidthM;
}

export function sideRailAnchorX(
    halfSpan: number,
    columnSection: UbSectionDimensions,
    sideRailSection: CSectionDimensions,
    side: 'left' | 'right',
): number {
    const outerFlangeX = outerColumnFlangeX(halfSpan, columnSection, side);
    const sideRailDepthM = sideRailSection.depth / 1000;

    return side === 'left'
        ? outerFlangeX - sideRailDepthM
        : outerFlangeX + sideRailDepthM;
}

export function outerGableColumnFlangeY(
    gableColumnY: number,
    gableColumnSection: UbSectionDimensions,
    gable: 'front' | 'rear',
): number {
    const halfFlangeWidthM = gableColumnSection.b / 2000;

    return gable === 'front'
        ? gableColumnY - halfFlangeWidthM
        : gableColumnY + halfFlangeWidthM;
}

export function sideRailGableAnchorY(
    gableColumnY: number,
    gableColumnSection: UbSectionDimensions,
    sideRailSection: CSectionDimensions,
    gable: 'front' | 'rear',
): number {
    const outerFlangeY = outerGableColumnFlangeY(
        gableColumnY,
        gableColumnSection,
        gable,
    );
    const sideRailDepthM = sideRailSection.depth / 1000;

    return gable === 'front'
        ? outerFlangeY - sideRailDepthM
        : outerFlangeY + sideRailDepthM;
}

export function buildAnalyticalSideRails(
    design: PortalFrameDesign,
    section: CSectionDimensions,
): FrameMember[] {
    const bayCount = Math.max(1, Math.round(design.buildingLength / design.baySpacing));
    const frameCount = bayCount + 1;
    const buildingLengthEnd = (frameCount - 1) * design.baySpacing;
    const halfSpan = design.span / 2;
    const heights = spacedOffsetsAlongSpan(
        design.eavesHeight,
        SIDE_RAIL_START_OFFSET_M,
        0,
        SIDE_RAIL_SPACING_M,
    );
    const members: FrameMember[] = [];

    for (const side of ['left', 'right'] as const) {
        const x = side === 'left' ? -halfSpan : halfSpan;

        heights.forEach((height, index) => {
            for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
                const startY = bayIndex * design.baySpacing;
                const endY = (bayIndex + 1) * design.baySpacing;

                members.push({
                    id: `side-rail-${side}-${index}-bay-${bayIndex}`,
                    role: 'side_rail',
                    start: [x, startY, height],
                    end: [x, endY, height],
                    section,
                });
            }
        });
    }

    const gableColumnPositions = gableColumnXPositions(design.span);

    for (const [gableLabel, y] of [
        ['front', 0],
        ['rear', buildingLengthEnd],
    ] as const) {
        heights.forEach((height, index) => {
            for (
                let segmentIndex = 0;
                segmentIndex < gableColumnPositions.length - 1;
                segmentIndex++
            ) {
                const startX = gableColumnPositions[segmentIndex]!;
                const endX = gableColumnPositions[segmentIndex + 1]!;

                members.push({
                    id: `side-rail-gable-${gableLabel}-${index}-seg-${segmentIndex}`,
                    role: 'side_rail',
                    start: [startX, y, height],
                    end: [endX, y, height],
                    section,
                });
            }
        });
    }

    return members;
}

export function buildSideRails(
    design: PortalFrameDesign,
    section: CSectionDimensions,
    columnSection: UbSectionDimensions,
    gableColumnSection: UbSectionDimensions,
): FrameMember[] {
    const bayCount = Math.max(1, Math.round(design.buildingLength / design.baySpacing));
    const frameCount = bayCount + 1;
    const buildingLengthEnd = (frameCount - 1) * design.baySpacing;
    const halfSpan = design.span / 2;
    const heights = spacedOffsetsAlongSpan(
        design.eavesHeight,
        SIDE_RAIL_START_OFFSET_M,
        0,
        SIDE_RAIL_SPACING_M,
    );
    const frontGableAnchorY = sideRailGableAnchorY(
        0,
        gableColumnSection,
        section,
        'front',
    );
    const rearGableAnchorY = sideRailGableAnchorY(
        buildingLengthEnd,
        gableColumnSection,
        section,
        'rear',
    );
    const members: FrameMember[] = [];

    for (const side of ['left', 'right'] as const) {
        const x = sideRailAnchorX(halfSpan, columnSection, section, side);

        heights.forEach((height, index) => {
            members.push({
                id: `side-rail-${side}-${index}`,
                role: 'side_rail',
                start: [x, frontGableAnchorY, height],
                end: [x, rearGableAnchorY, height],
                section,
            });
        });
    }

    const leftAnchorX = sideRailAnchorX(halfSpan, columnSection, section, 'left');
    const rightAnchorX = sideRailAnchorX(halfSpan, columnSection, section, 'right');

    for (const [gableLabel, y] of [
        ['front', frontGableAnchorY],
        ['rear', rearGableAnchorY],
    ] as const) {
        heights.forEach((height, index) => {
            members.push({
                id: `side-rail-gable-${gableLabel}-${index}`,
                role: 'side_rail',
                start: [leftAnchorX, y, height],
                end: [rightAnchorX, y, height],
                section,
            });
        });
    }

    return members;
}
