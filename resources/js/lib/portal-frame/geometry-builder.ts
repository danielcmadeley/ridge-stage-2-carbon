import { lookupP399Section, snapSpanToTabulated } from '@/lib/portal-frame/p399-lookup';
import { findUbSection } from '@/lib/portal-frame/ub-sections';
import type {
    FrameMember,
    PortalFrameDesign,
    ResolvedPortalFrameSections,
    UbSectionDimensions,
} from '@/types/portal-frame';
import { rafterLineLoadKnM } from '@/types/portal-frame';

const FOOTING_WIDTH_M = 1.5;
const FOOTING_DEPTH_M = 1.5;
const FOOTING_HEIGHT_M = 0.5;

export type BuiltPortalFrame = ResolvedPortalFrameSections & {
    members: FrameMember[];
};

export function buildPortalFrame(design: PortalFrameDesign): BuiltPortalFrame {
    if (design.baySpacing <= 0) {
        throw new Error('Bay spacing must be greater than zero.');
    }

    const lineLoad = rafterLineLoadKnM(design);
    const lookupSpanM = snapSpanToTabulated(design.span);

    const rafterDesignation = lookupP399Section(
        'Rafter',
        lineLoad,
        design.eavesHeight,
        design.span,
    );

    const columnMemberType =
        design.columnRestraint === 'unrestrained'
            ? 'Unrestrained Column'
            : 'Restrained Column';

    const columnDesignation = lookupP399Section(
        columnMemberType,
        lineLoad,
        design.eavesHeight,
        design.span,
    );

    const rafter = findUbSection(rafterDesignation);
    const column = findUbSection(columnDesignation);

    return {
        rafterLineLoadKnM: lineLoad,
        lookupSpanM,
        rafter,
        column,
        members: buildMembers(design, rafter, column),
    };
}

function buildMembers(
    design: PortalFrameDesign,
    rafterSection: UbSectionDimensions,
    columnSection: UbSectionDimensions,
): FrameMember[] {
    const members: FrameMember[] = [];
    // A building length spanning N bays has N + 1 frames (one at each bay
    // boundary), e.g. 10 m at 5 m spacing -> 2 bays -> 3 frames at y = 0, 5, 10.
    const bayCount = Math.max(1, Math.round(design.buildingLength / design.baySpacing));
    const frameCount = bayCount + 1;
    const halfSpan = design.span / 2;
    const pitchRadians = (design.roofPitchDeg * Math.PI) / 180;
    const apexHeight = design.eavesHeight + halfSpan * Math.tan(pitchRadians);
    const footingSection: UbSectionDimensions = {
        name: 'Footing',
        h: FOOTING_HEIGHT_M * 1000,
        b: FOOTING_WIDTH_M * 1000,
        tw: FOOTING_DEPTH_M * 1000,
        tf: 0,
        areaCm2: FOOTING_WIDTH_M * FOOTING_DEPTH_M * 10000,
        iyCm4: 1,
    };

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const y = frameIndex * design.baySpacing;

        for (const side of [-1, 1] as const) {
            const x = side * halfSpan;
            const sideLabel = side < 0 ? 'left' : 'right';

            members.push({
                id: `frame-${frameIndex}-column-${sideLabel}`,
                role: 'column',
                start: [x, y, 0],
                end: [x, y, design.eavesHeight],
                section: columnSection,
            });

            members.push({
                id: `frame-${frameIndex}-rafter-${sideLabel}`,
                role: 'rafter',
                start: [x, y, design.eavesHeight],
                end: [0, y, apexHeight],
                section: rafterSection,
            });

            members.push({
                id: `frame-${frameIndex}-footing-${sideLabel}`,
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
        }
    }

    return members;
}

export function portalFrameApexHeight(design: PortalFrameDesign): number {
    const pitchRadians = (design.roofPitchDeg * Math.PI) / 180;

    return design.eavesHeight + (design.span / 2) * Math.tan(pitchRadians);
}

export function portalFrameCenter(design: PortalFrameDesign): [number, number, number] {
    return [0, design.buildingLength / 2, portalFrameApexHeight(design) / 2];
}
