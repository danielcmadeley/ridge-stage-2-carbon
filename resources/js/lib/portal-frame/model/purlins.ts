import { spacedOffsetsAlongSpan } from '@/lib/portal-frame/model/member-spacing';
import type {
    FrameMember,
    PortalFrameDesign,
    UbSectionDimensions,
    ZSectionDimensions,
} from '@/types/portal-frame';

const PURLIN_START_OFFSET_M = 1.0;
const PURLIN_END_OFFSET_M = 0.25;
const PURLIN_SPACING_M = 1.5;

export type RafterSlopeSide = 'left' | 'right';

export function rafterLengthM(design: PortalFrameDesign): number {
    const halfSpan = design.span / 2;
    const pitchRadians = (design.roofPitchDeg * Math.PI) / 180;
    const rise = halfSpan * Math.tan(pitchRadians);

    return Math.hypot(halfSpan, rise);
}

export function rafterRoofNormal(
    side: RafterSlopeSide,
    halfSpan: number,
    roofPitchDeg: number,
): { x: number; z: number } {
    const pitchRadians = (roofPitchDeg * Math.PI) / 180;
    const rise = halfSpan * Math.tan(pitchRadians);
    const length = Math.hypot(rise, halfSpan);

    if (side === 'left') {
        return { x: -rise / length, z: halfSpan / length };
    }

    return { x: rise / length, z: halfSpan / length };
}

export function pointOnRafter(
    design: PortalFrameDesign,
    side: RafterSlopeSide,
    offsetAlongRafterM: number,
): { x: number; z: number } {
    const halfSpan = design.span / 2;
    const pitchRadians = (design.roofPitchDeg * Math.PI) / 180;
    const rise = halfSpan * Math.tan(pitchRadians);
    const rafterLength = Math.hypot(halfSpan, rise);
    const fraction = offsetAlongRafterM / rafterLength;
    const eavesX = side === 'left' ? -halfSpan : halfSpan;
    const apexHeight = design.eavesHeight + rise;

    return {
        x: eavesX + (0 - eavesX) * fraction,
        z: design.eavesHeight + (apexHeight - design.eavesHeight) * fraction,
    };
}

/** Point on the rafter top flange, offset from the member centreline along the roof normal. */
export function pointOnRafterTopFlange(
    design: PortalFrameDesign,
    side: RafterSlopeSide,
    offsetAlongRafterM: number,
    rafterSection: UbSectionDimensions,
): { x: number; z: number } {
    const centreline = pointOnRafter(design, side, offsetAlongRafterM);
    const halfDepthM = rafterSection.h / 2000;
    const normal = rafterRoofNormal(side, design.span / 2, design.roofPitchDeg);

    return {
        x: centreline.x + normal.x * halfDepthM,
        z: centreline.z + normal.z * halfDepthM,
    };
}

export function pointOnRafterAtX(
    design: PortalFrameDesign,
    x: number,
): { z: number; side: RafterSlopeSide } {
    const halfSpan = design.span / 2;
    const pitchRadians = (design.roofPitchDeg * Math.PI) / 180;
    const rise = halfSpan * Math.tan(pitchRadians);
    const apexHeight = design.eavesHeight + rise;

    if (x <= 0) {
        const fraction = (x + halfSpan) / halfSpan;

        return {
            z:
                design.eavesHeight +
                fraction * (apexHeight - design.eavesHeight),
            side: 'left',
        };
    }

    const fraction = (halfSpan - x) / halfSpan;

    return {
        z: design.eavesHeight + fraction * (apexHeight - design.eavesHeight),
        side: 'right',
    };
}

/** Vertical height where a gable column meets the underside of the rafter flange above. */
export function rafterUndersideZAtX(
    design: PortalFrameDesign,
    x: number,
    rafterSection: UbSectionDimensions,
): number {
    const { z, side } = pointOnRafterAtX(design, x);
    const halfDepthM = rafterSection.h / 2000;
    const normal = rafterRoofNormal(side, design.span / 2, design.roofPitchDeg);

    return z - normal.z * halfDepthM;
}

/** Point where the purlin member axis is anchored so the Z bottom flange sits on the rafter top flange. */
export function purlinAnchorPoint(
    design: PortalFrameDesign,
    side: RafterSlopeSide,
    offsetAlongRafterM: number,
    rafterSection: UbSectionDimensions,
    purlinSection: ZSectionDimensions,
): { x: number; z: number } {
    const rafterTop = pointOnRafterTopFlange(
        design,
        side,
        offsetAlongRafterM,
        rafterSection,
    );
    const purlinHalfDepthM = purlinSection.depth / 2000;
    const normal = rafterRoofNormal(side, design.span / 2, design.roofPitchDeg);

    return {
        x: rafterTop.x + normal.x * purlinHalfDepthM,
        z: rafterTop.z + normal.z * purlinHalfDepthM,
    };
}

export function buildAnalyticalPurlins(
    design: PortalFrameDesign,
    section: ZSectionDimensions,
): FrameMember[] {
    const bayCount = Math.max(
        1,
        Math.round(design.buildingLength / design.baySpacing),
    );
    const rafterLength = rafterLengthM(design);
    const offsets = spacedOffsetsAlongSpan(
        rafterLength,
        PURLIN_START_OFFSET_M,
        PURLIN_END_OFFSET_M,
        PURLIN_SPACING_M,
    );
    const members: FrameMember[] = [];

    for (const side of ['left', 'right'] as const) {
        offsets.forEach((offset, index) => {
            const { x, z } = pointOnRafter(design, side, offset);

            for (let bayIndex = 0; bayIndex < bayCount; bayIndex++) {
                const startY = bayIndex * design.baySpacing;
                const endY = (bayIndex + 1) * design.baySpacing;

                members.push({
                    id: `purlin-${side}-${index}-bay-${bayIndex}`,
                    role: 'purlin',
                    start: [x, startY, z],
                    end: [x, endY, z],
                    section,
                    orientation: {
                        halfSpan: design.span / 2,
                        roofPitchDeg: design.roofPitchDeg,
                    },
                });
            }
        });
    }

    return members;
}

export function buildPurlins(
    design: PortalFrameDesign,
    section: ZSectionDimensions,
    rafterSection: UbSectionDimensions,
): FrameMember[] {
    const bayCount = Math.max(
        1,
        Math.round(design.buildingLength / design.baySpacing),
    );
    const frameCount = bayCount + 1;
    const buildingLengthEnd = (frameCount - 1) * design.baySpacing;
    const rafterLength = rafterLengthM(design);
    const offsets = spacedOffsetsAlongSpan(
        rafterLength,
        PURLIN_START_OFFSET_M,
        PURLIN_END_OFFSET_M,
        PURLIN_SPACING_M,
    );
    const members: FrameMember[] = [];

    for (const side of ['left', 'right'] as const) {
        offsets.forEach((offset, index) => {
            const { x, z } = purlinAnchorPoint(
                design,
                side,
                offset,
                rafterSection,
                section,
            );

            members.push({
                id: `purlin-${side}-${index}`,
                role: 'purlin',
                start: [x, 0, z],
                end: [x, buildingLengthEnd, z],
                section,
                orientation: {
                    halfSpan: design.span / 2,
                    roofPitchDeg: design.roofPitchDeg,
                },
            });
        });
    }

    return members;
}
