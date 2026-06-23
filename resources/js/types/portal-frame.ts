export type ColumnRestraint = 'restrained' | 'unrestrained';

export type PortalFrameDesign = {
    span: number;
    eavesHeight: number;
    buildingLength: number;
    baySpacing: number;
    deadLoadKnM2: number;
    liveLoadKnM2: number;
    columnRestraint: ColumnRestraint;
    roofPitchDeg: number;
};

export type UbSectionDimensions = {
    name: string;
    h: number;
    b: number;
    tw: number;
    tf: number;
    /** Major-axis second moment of area (cm⁴). */
    iyCm4: number;
    /** Cross-sectional area (cm²). */
    areaCm2: number;
};

export type FrameMemberRole = 'column' | 'rafter' | 'foundation' | 'haunch';

/** Local coordinates use Z-up: X span, Y length, Z height. */
export type FrameMember = {
    id: string;
    role: FrameMemberRole;
    start: [number, number, number];
    end: [number, number, number];
    section: UbSectionDimensions;
    footing?: {
        width: number;
        depth: number;
        height: number;
    };
};

export type ResolvedPortalFrameSections = {
    rafterLineLoadKnM: number;
    lookupSpanM: number;
    rafter: UbSectionDimensions;
    column: UbSectionDimensions;
};

export const PORTAL_FRAME_TABULATED_SPANS = [15, 20, 25, 30, 35, 40] as const;

export const PORTAL_FRAME_STEEL_COLOR = '#dc2626';
export const PORTAL_FRAME_FOUNDATION_COLOR = '#9ca3af';

export const defaultPortalFrameDesign = (): PortalFrameDesign => ({
    span: 24,
    eavesHeight: 6,
    buildingLength: 40,
    baySpacing: 5,
    deadLoadKnM2: 1.25,
    liveLoadKnM2: 0.75,
    columnRestraint: 'restrained',
    roofPitchDeg: 6,
});

export function rafterLineLoadKnM(design: PortalFrameDesign): number {
    return (design.deadLoadKnM2 + design.liveLoadKnM2) * design.baySpacing;
}

export function snapSpanToTabulated(span: number): number {
    let nearest = PORTAL_FRAME_TABULATED_SPANS[0];
    let smallestDelta = Math.abs(span - nearest);

    for (const tabulatedSpan of PORTAL_FRAME_TABULATED_SPANS) {
        const delta = Math.abs(span - tabulatedSpan);

        if (delta < smallestDelta) {
            nearest = tabulatedSpan;
            smallestDelta = delta;
        }
    }

    return nearest;
}
