export type ColumnRestraint = 'restrained' | 'unrestrained';

export type FoundationType = 'two_pile_cap' | 'reinforced_pad' | 'mass_filled';

/** EC0 partial safety factor for permanent (dead + services) actions, γ_G. */
export const DEAD_LOAD_PARTIAL_FACTOR = 1.35;
/** EC0 partial safety factor for variable (live/wind) actions, γ_Q. */
export const LIVE_LOAD_PARTIAL_FACTOR = 1.5;

export type FoundationAssumptions = {
    allowableBearingKpa: number;
    pileWorkingCapacityKn: number;
    pileDiameterM: number;
    pileSpacingFactor: number;
    pileDepthM: number;
    concreteDensityKnM3: number;
    soilCoverDensityKnM3: number;
    /** Effective soil friction angle φ' (degrees), EC7 characteristic. */
    effectiveFrictionAngleDeg: number;
    /** Soil– concrete interface friction angle δ (degrees). */
    interfaceFrictionAngleDeg: number;
    /** Retained soil depth over the pad (m). */
    retainedSoilDepthM: number;
    /** Drained soil Young's modulus (kN/m²), immediate-settlement estimate. */
    soilModulusKnM2: number;
    /** Characteristic concrete cylinder strength fck (N/mm²). */
    concreteStrengthMpa: number;
    /** Pile-cap edge overhang past the pile face (mm). */
    capOverhangMm: number;
    /** Stage-2 reinforcement rate for pile caps (kg/m³). */
    rebarRateKgM3: number;
    /** Reinforcement mass uplift factor applied to pad bottom+top mesh. */
    rebarUpliftFactor: number;
    /** @deprecated replaced by interfaceFrictionAngleDeg; kept for back-compat. */
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
    /** Permanent dead (self-weight + structure), factored by γ_G. */
    deadLoadKnM2: number;
    /** Permanent services (M&E / ceilings), factored by γ_G alongside dead. */
    servicesLoadKnM2: number;
    /** Variable imposed live load, factored by γ_Q. */
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

export const PORTAL_FRAME_STEEL_COLOR = '#943c32';
export const PORTAL_FRAME_SECONDARY_STEEL_COLOR = '#aec8e8';
export const PORTAL_FRAME_SLAB_COLOR = '#c8c2b9';
export const PORTAL_FRAME_FOUNDATION_COLOR = '#868079';

export const defaultFoundationAssumptions = (): FoundationAssumptions => ({
    allowableBearingKpa: 150,
    pileWorkingCapacityKn: 300,
    pileDiameterM: 0.45,
    pileSpacingFactor: 3,
    pileDepthM: 6,
    concreteDensityKnM3: 24,
    soilCoverDensityKnM3: 18,
    effectiveFrictionAngleDeg: 30,
    interfaceFrictionAngleDeg: 20,
    retainedSoilDepthM: 0.6,
    soilModulusKnM2: 25_000,
    concreteStrengthMpa: 28,
    capOverhangMm: 150,
    rebarRateKgM3: 110,
    rebarUpliftFactor: 1.1,
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
    deadLoadKnM2: 0.3,
    servicesLoadKnM2: 0.25,
    liveLoadKnM2: 0.6,
    columnRestraint: 'restrained',
    roofPitchDeg: 6,
    foundation: defaultFoundationDesign(),
});

/** Merge a partial server design onto the app defaults. */
export function normalizePortalFrameDesign(
    design: Partial<PortalFrameDesign> | PortalFrameDesign,
): PortalFrameDesign {
    const defaults = defaultPortalFrameDesign();

    return {
        ...defaults,
        ...design,
        // Pre-services schemes (no servicesLoadKnM2 sent) keep 0 so their
        // carbon numbers don't silently shift; fresh drafts get the 0.25
        // default via the spread above.
        servicesLoadKnM2: design.servicesLoadKnM2 ?? 0,
        foundation: {
            type: design.foundation?.type ?? defaults.foundation.type,
            assumptions: {
                ...defaults.foundation.assumptions,
                ...(design.foundation?.assumptions ?? {}),
            },
        },
    };
}

export function frameCount(design: PortalFrameDesign): number {
    const bayCount = Math.max(
        1,
        Math.round(design.buildingLength / design.baySpacing),
    );

    return bayCount + 1;
}

export function isGableEndFrame(
    frameIndex: number,
    design: PortalFrameDesign,
): boolean {
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

/** Permanent (dead + services) load, characteristic, kN/m². */
export function permanentLoadKnM2(design: PortalFrameDesign): number {
    return design.deadLoadKnM2 + design.servicesLoadKnM2;
}

/** ULS factored area load, kN/m²: γ_G·(dead+services) + γ_Q·live. */
export function factoredAreaLoadKnM2(design: PortalFrameDesign): number {
    return (
        DEAD_LOAD_PARTIAL_FACTOR * permanentLoadKnM2(design) +
        LIVE_LOAD_PARTIAL_FACTOR * design.liveLoadKnM2
    );
}

/** Interior-frame characteristic line load (dead + services + live) × bay, kN/m. */
export function rafterLineLoadKnM(design: PortalFrameDesign): number {
    return (
        (permanentLoadKnM2(design) + design.liveLoadKnM2) * design.baySpacing
    );
}

/** Per-frame characteristic line load using each frame's tributary width, kN/m. */
export function rafterLineLoadKnMForFrame(
    design: PortalFrameDesign,
    frameIndex: number,
): number {
    return (
        (permanentLoadKnM2(design) + design.liveLoadKnM2) *
        frameTributaryWidthM(design, frameIndex)
    );
}

/** Interior-frame ULS factored line load used for section lookup, kN/m. */
export function factoredRafterLineLoadKnM(design: PortalFrameDesign): number {
    return factoredAreaLoadKnM2(design) * design.baySpacing;
}

/** Per-frame ULS factored line load using each frame's tributary width, kN/m. */
export function factoredRafterLineLoadKnMForFrame(
    design: PortalFrameDesign,
    frameIndex: number,
): number {
    return (
        factoredAreaLoadKnM2(design) * frameTributaryWidthM(design, frameIndex)
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
