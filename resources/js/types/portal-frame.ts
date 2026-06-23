export type ColumnRestraint = 'restrained' | 'unrestrained';

export type FoundationType = 'two_pile_cap' | 'reinforced_pad' | 'mass_filled';

export type FoundationAssumptions = {
    allowableBearingKpa: number;
    pileWorkingCapacityKn: number;
    pileDiameterM: number;
    pileSpacingFactor: number;
    concreteDensityKnM3: number;
    soilCoverDensityKnM3: number;
    frictionCoefficient: number;
    concreteCoverM: number;
    reinforcementYieldStrengthMpa: number;
    preferredBarDiameterMm: number;
};

export type FoundationDesign = {
    type: FoundationType;
    assumptions: FoundationAssumptions;
};

export type PortalFrameDesign = {
    span: number;
    eavesHeight: number;
    buildingLength: number;
    baySpacing: number;
    deadLoadKnM2: number;
    liveLoadKnM2: number;
    columnRestraint: ColumnRestraint;
    roofPitchDeg: number;
    foundation: FoundationDesign;
};

export type UbSectionDimensions = {
    profile: 'ub';
    name: string;
    h: number;
    b: number;
    tw: number;
    tf: number;
    /** Major-axis second moment of area (cm⁴). */
    iyCm4: number;
    /** Cross-sectional area (cm²). */
    areaCm2: number;
    /** Self-weight per metre run (kg/m). */
    massPerMKg: number;
};

export type ZSectionDimensions = {
    profile: 'z';
    name: string;
    depth: number;
    topFlange: number;
    bottomFlange: number;
    t: number;
    areaCm2: number;
    /** Self-weight per metre run (kg/m). */
    massPerMKg: number;
};

export type CSectionDimensions = {
    profile: 'c';
    name: string;
    depth: number;
    flange: number;
    t: number;
    areaCm2: number;
    /** Self-weight per metre run (kg/m). */
    massPerMKg: number;
};

export type ChsSectionDimensions = {
    profile: 'chs';
    name: string;
    /** Outside diameter (mm). */
    d: number;
    /** Wall thickness (mm). */
    t: number;
    areaCm2: number;
    /** Second moment of area (cm⁴). */
    iCm4: number;
    /** Self-weight per metre run (kg/m). */
    massPerMKg: number;
};

export type MemberSection =
    | UbSectionDimensions
    | ZSectionDimensions
    | CSectionDimensions
    | ChsSectionDimensions;

export type FrameMemberRole =
    | 'column'
    | 'gable_column'
    | 'rafter'
    | 'foundation'
    | 'haunch'
    | 'tie'
    | 'brace'
    | 'purlin'
    | 'side_rail';

/** Local coordinates use Z-up: X span, Y length, Z height. */
export type FrameMember = {
    id: string;
    role: FrameMemberRole;
    start: [number, number, number];
    end: [number, number, number];
    section: MemberSection;
    footing?: {
        width: number;
        depth: number;
        height: number;
    };
    pile?: {
        diameter: number;
        depth: number;
    };
    /** Used by purlins to orient the Z section to the roof slope. */
    orientation?: {
        halfSpan: number;
        roofPitchDeg: number;
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
export const PORTAL_FRAME_SECONDARY_STEEL_COLOR = '#9ca3af';
export const PORTAL_FRAME_FOUNDATION_COLOR = '#d1d5db';

export const defaultFoundationAssumptions = (): FoundationAssumptions => ({
    allowableBearingKpa: 150,
    pileWorkingCapacityKn: 300,
    pileDiameterM: 0.45,
    pileSpacingFactor: 3,
    concreteDensityKnM3: 24,
    soilCoverDensityKnM3: 18,
    frictionCoefficient: 0.45,
    concreteCoverM: 0.05,
    reinforcementYieldStrengthMpa: 500,
    preferredBarDiameterMm: 12,
});

export const defaultFoundationDesign = (): FoundationDesign => ({
    type: 'reinforced_pad',
    assumptions: defaultFoundationAssumptions(),
});

export const defaultPortalFrameDesign = (): PortalFrameDesign => ({
    span: 24,
    eavesHeight: 6,
    buildingLength: 40,
    baySpacing: 5,
    deadLoadKnM2: 1.25,
    liveLoadKnM2: 0.75,
    columnRestraint: 'restrained',
    roofPitchDeg: 6,
    foundation: defaultFoundationDesign(),
});

export function frameCount(design: PortalFrameDesign): number {
    const bayCount = Math.max(1, Math.round(design.buildingLength / design.baySpacing));

    return bayCount + 1;
}

export function isGableEndFrame(frameIndex: number, design: PortalFrameDesign): boolean {
    const count = frameCount(design);

    return frameIndex === 0 || frameIndex === count - 1;
}

export function frameTributaryWidthM(
    design: PortalFrameDesign,
    frameIndex: number,
): number {
    return isGableEndFrame(frameIndex, design)
        ? design.baySpacing / 2
        : design.baySpacing;
}

/** Interior-frame line load used for section lookup and worst-case design. */
export function rafterLineLoadKnM(design: PortalFrameDesign): number {
    return (
        (design.deadLoadKnM2 + design.liveLoadKnM2) * design.baySpacing
    );
}

export function rafterLineLoadKnMForFrame(
    design: PortalFrameDesign,
    frameIndex: number,
): number {
    return (
        (design.deadLoadKnM2 + design.liveLoadKnM2) *
        frameTributaryWidthM(design, frameIndex)
    );
}

/** First interior frame index, or 0 when every frame is a gable end. */
export function representativeInteriorFrameIndex(
    design: PortalFrameDesign,
): number {
    const count = frameCount(design);

    return count <= 2 ? 0 : 1;
}

export function snapSpanToTabulated(span: number): number {
    let nearest: (typeof PORTAL_FRAME_TABULATED_SPANS)[number] =
        PORTAL_FRAME_TABULATED_SPANS[0];
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
