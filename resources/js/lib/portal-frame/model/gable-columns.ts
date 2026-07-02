import { spacedOffsetsAlongSpan } from '@/lib/portal-frame/model/member-spacing';
import {
    pointOnRafterAtX,
    rafterUndersideZAtX,
} from '@/lib/portal-frame/model/purlins';
import type {
    FrameMember,
    PortalFrameDesign,
    UbSectionDimensions,
} from '@/types/portal-frame';

export const GABLE_COLUMN_SPACING_M = 6;

const FOOTING_WIDTH_M = 1.5;
const FOOTING_DEPTH_M = 1.5;
const FOOTING_HEIGHT_M = 0.5;

export function gableColumnXPositions(span: number): number[] {
    const halfSpan = span / 2;

    return spacedOffsetsAlongSpan(span, 0, 0, GABLE_COLUMN_SPACING_M).map(
        (offset) => -halfSpan + offset,
    );
}

export function isExistingGableCornerColumn(
    x: number,
    y: number,
    halfSpan: number,
    buildingLengthEnd: number,
): boolean {
    if (Math.abs(Math.abs(x) - halfSpan) > 1e-9) {
        return false;
    }

    return Math.abs(y) < 1e-9 || Math.abs(y - buildingLengthEnd) < 1e-9;
}

export function buildAnalyticalGableColumns(
    design: PortalFrameDesign,
    gableColumnSection: UbSectionDimensions,
): FrameMember[] {
    const bayCount = Math.max(
        1,
        Math.round(design.buildingLength / design.baySpacing),
    );
    const frameCount = bayCount + 1;
    const buildingLengthEnd = (frameCount - 1) * design.baySpacing;
    const halfSpan = design.span / 2;
    const xPositions = gableColumnXPositions(design.span);
    const members: FrameMember[] = [];

    for (const [gableLabel, y] of [
        ['front', 0],
        ['rear', buildingLengthEnd],
    ] as const) {
        xPositions.forEach((x, index) => {
            if (
                isExistingGableCornerColumn(x, y, halfSpan, buildingLengthEnd)
            ) {
                return;
            }

            const topZ = pointOnRafterAtX(design, x).z;

            members.push({
                id: `gable-${gableLabel}-column-${index}`,
                role: 'gable_column',
                start: [x, y, 0],
                end: [x, y, topZ],
                section: gableColumnSection,
            });
        });
    }

    return members;
}

export function buildGableColumns(
    design: PortalFrameDesign,
    gableColumnSection: UbSectionDimensions,
    rafterSection: UbSectionDimensions,
): FrameMember[] {
    const bayCount = Math.max(
        1,
        Math.round(design.buildingLength / design.baySpacing),
    );
    const frameCount = bayCount + 1;
    const buildingLengthEnd = (frameCount - 1) * design.baySpacing;
    const halfSpan = design.span / 2;
    const xPositions = gableColumnXPositions(design.span);
    const footingSection: UbSectionDimensions = {
        profile: 'ub',
        name: 'Footing',
        h: FOOTING_HEIGHT_M * 1000,
        b: FOOTING_WIDTH_M * 1000,
        tw: FOOTING_DEPTH_M * 1000,
        tf: 0,
        areaCm2: FOOTING_WIDTH_M * FOOTING_DEPTH_M * 10000,
        iyCm4: 1,
        massPerMKg: 0,
    };
    const members: FrameMember[] = [];

    for (const [gableLabel, y] of [
        ['front', 0],
        ['rear', buildingLengthEnd],
    ] as const) {
        xPositions.forEach((x, index) => {
            if (
                isExistingGableCornerColumn(x, y, halfSpan, buildingLengthEnd)
            ) {
                return;
            }

            const topZ = rafterUndersideZAtX(design, x, rafterSection);

            members.push({
                id: `gable-${gableLabel}-column-${index}`,
                role: 'gable_column',
                start: [x, y, 0],
                end: [x, y, topZ],
                section: gableColumnSection,
            });

            members.push({
                id: `gable-${gableLabel}-footing-${index}`,
                role: 'foundation',
                start: [x, y, -FOOTING_HEIGHT_M],
                end: [x, y, 0],
                section: footingSection,
                footing: {
                    width: FOOTING_WIDTH_M,
                    depth: FOOTING_DEPTH_M,
                    height: FOOTING_HEIGHT_M,
                },
            });
        });
    }

    return members;
}
