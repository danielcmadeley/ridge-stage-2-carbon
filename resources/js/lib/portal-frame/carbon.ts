import { carbonFactors, type CarbonFactors } from '@/lib/portal-frame/carbon-factors';
import {
    buildPortalFrame,
    type BuiltPortalFrame,
} from '@/lib/portal-frame/geometry-builder';
import { analyzeGoverningPortalFrame } from '@/lib/portal-frame/frame-analysis';
import { HAUNCH_LENGTH_FRACTION } from '@/lib/portal-frame/haunch-geometry';
import { memberLengthM } from '@/lib/portal-frame/member-basis';
import {
    sizeFoundationReactions,
    type FoundationSizingResult,
} from '@/lib/portal-frame/foundation-sizing';
import {
    scorsBandForIntensity,
    type ScorsBand,
} from '@/lib/portal-frame/scors';
import {
    GROUND_FLOOR_SLAB_DEPTH_M,
    GROUND_FLOOR_SLAB_REBAR_DIAMETER_MM,
    GROUND_FLOOR_SLAB_REBAR_SPACING_M,
    groundFloorSlab,
} from '@/lib/portal-frame/ground-floor-slab';
import type { FrameMember, PortalFrameDesign } from '@/types/portal-frame';

export const STEEL_DENSITY_KG_M3 = 7850;
export const GRAVITY_M_S2 = 9.80665;
export {
    GROUND_FLOOR_SLAB_DEPTH_M,
    GROUND_FLOOR_SLAB_REBAR_DIAMETER_MM,
    GROUND_FLOOR_SLAB_REBAR_SPACING_M,
};
export const CONNECTIONS_STEEL_ALLOWANCE = 0.1;

/**
 * Eaves haunches are fabricated from a diagonal cutting of the rafter UB
 * section, tapering from full depth at the column to nothing at the tip. On
 * average the cutting carries roughly half of the rafter cross-section over the
 * haunch length, so its mass is estimated as half of an equivalent rafter run.
 */
export const HAUNCH_TAPER_MASS_FACTOR = 0.5;

export type CarbonQuantity = {
    massKg: number;
    carbonKg: number;
};

export type PortalFrameCarbonBreakdown = {
    columns: CarbonQuantity;
    gableColumns: CarbonQuantity;
    rafters: CarbonQuantity;
    haunches: CarbonQuantity;
    ties: CarbonQuantity;
    braces: CarbonQuantity;
    sideRails: CarbonQuantity;
    purlins: CarbonQuantity;
    concrete: CarbonQuantity;
    rebar: CarbonQuantity;
    slabConcrete: CarbonQuantity;
    slabRebar: CarbonQuantity;
    connections: CarbonQuantity;
};

export type PortalFrameCarbon = {
    /** Combined embodied carbon of the whole portal frame (kgCO2e). */
    totalCarbonKg: number;
    /** Combined carbon of the hot-rolled steel sections (kgCO2e). */
    steelSectionsCarbonKg: number;
    /** Gross internal floor area used for the intensity (m²). */
    floorAreaM2: number;
    /** Embodied carbon per unit floor area (kgCO2e/m²). */
    carbonIntensityKgM2: number;
    /** IStructE SCORS band for the carbon intensity. */
    scorsBand: ScorsBand;
    breakdown: PortalFrameCarbonBreakdown;
    factors: CarbonFactors;
};

type FoundationSizingBySide = {
    left: FoundationSizingResult;
    right: FoundationSizingResult;
};

function emptyQuantity(): CarbonQuantity {
    return { massKg: 0, carbonKg: 0 };
}

function addMass(quantity: CarbonQuantity, massKg: number, factor: number): void {
    quantity.massKg += massKg;
    quantity.carbonKg += massKg * factor;
}

function concreteMassDensityKgM3(design: PortalFrameDesign): number {
    const weightDensityKnM3 = design.foundation.assumptions.concreteDensityKnM3;
    const safeWeightDensity =
        Number.isFinite(weightDensityKnM3) && weightDensityKnM3 > 0
            ? weightDensityKnM3
            : 24;

    return (safeWeightDensity * 1000) / GRAVITY_M_S2;
}

function foundationConcreteVolumeM3(member: FrameMember): number {
    if (member.footing) {
        return member.footing.width * member.footing.depth * member.footing.height;
    }

    if (member.pile) {
        return (Math.PI / 4) * member.pile.diameter ** 2 * member.pile.depth;
    }

    return 0;
}

function rebarMassForPadKg(
    result: FoundationSizingResult,
    member: FrameMember,
): number {
    if (!result.reinforcement || !member.footing) {
        return 0;
    }

    // Bottom mat reinforced each way: total bar volume across both directions.
    const areaMm2PerM = result.reinforcement.areaMm2PerM;
    const volumeM3 =
        2 * areaMm2PerM * 1e-6 * member.footing.width * member.footing.depth;

    return volumeM3 * STEEL_DENSITY_KG_M3;
}

function slabConcreteMassKg(design: PortalFrameDesign, densityKgM3: number): number {
    const slab = groundFloorSlab(design);

    return slab.widthM * slab.lengthM * slab.depthM * densityKgM3;
}

function slabRebarMassKg(design: PortalFrameDesign): number {
    const slab = groundFloorSlab(design);
    const floorAreaM2 = slab.widthM * slab.lengthM;
    const barAreaM2 =
        (Math.PI * (GROUND_FLOOR_SLAB_REBAR_DIAMETER_MM / 1000) ** 2) / 4;
    const barLengthPerM2 =
        // Two orthogonal directions in both the top and bottom mats.
        4 / GROUND_FLOOR_SLAB_REBAR_SPACING_M;

    return floorAreaM2 * barAreaM2 * barLengthPerM2 * STEEL_DENSITY_KG_M3;
}

function isMainColumnPad(member: FrameMember): boolean {
    return (
        member.role === 'foundation' &&
        member.footing !== undefined &&
        member.id.startsWith('frame-') &&
        member.id.includes('-footing-')
    );
}

function foundationSizingForDesign(
    built: BuiltPortalFrame,
    design: PortalFrameDesign,
): FoundationSizingBySide | null {
    try {
        const reactions = analyzeGoverningPortalFrame(built, design).reactions;

        return sizeFoundationReactions(reactions, design.foundation);
    } catch {
        return null;
    }
}

/**
 * Estimate the embodied carbon of every element of the portal frame, grouped so
 * the user can compare where their carbon is coming from.
 *
 * - Hot-rolled steel sections (columns, gable columns, rafters, haunches, ties,
 *   bracing) use the "Steel, Section" factor.
 * - Side rails and purlins use the "Steel, hot-dip galvanized steel" factor.
 * - Foundation concrete uses the "28/35 MPa" factor.
 * - Pad foundation reinforcement uses the "Steel, Rebar" factor. Pile caps and
 *   gable footings are not reinforcement-sized by the model, so they contribute
 *   no rebar.
 * - The ground floor slab is 250 mm concrete with H12 bars top and bottom each
 *   way at 200 mm centres.
 * - Connections add 10% to the hot-rolled steel section mass.
 */
export function calculatePortalFrameCarbon(
    design: PortalFrameDesign,
): PortalFrameCarbon {
    const built = buildPortalFrame(design);
    const members = built.members;
    const foundationSizing = foundationSizingForDesign(built, design);
    const concreteDensity = concreteMassDensityKgM3(design);

    const breakdown: PortalFrameCarbonBreakdown = {
        columns: emptyQuantity(),
        gableColumns: emptyQuantity(),
        rafters: emptyQuantity(),
        haunches: emptyQuantity(),
        ties: emptyQuantity(),
        braces: emptyQuantity(),
        sideRails: emptyQuantity(),
        purlins: emptyQuantity(),
        concrete: emptyQuantity(),
        rebar: emptyQuantity(),
        slabConcrete: emptyQuantity(),
        slabRebar: emptyQuantity(),
        connections: emptyQuantity(),
    };

    for (const member of members) {
        const lengthM = memberLengthM(member);
        const massPerMKg = member.section.massPerMKg;

        switch (member.role) {
            case 'column':
                addMass(
                    breakdown.columns,
                    lengthM * massPerMKg,
                    carbonFactors.steelSection,
                );
                break;
            case 'gable_column':
                addMass(
                    breakdown.gableColumns,
                    lengthM * massPerMKg,
                    carbonFactors.steelSection,
                );
                break;
            case 'rafter': {
                addMass(
                    breakdown.rafters,
                    lengthM * massPerMKg,
                    carbonFactors.steelSection,
                );

                const haunchMassKg =
                    lengthM *
                    HAUNCH_LENGTH_FRACTION *
                    massPerMKg *
                    HAUNCH_TAPER_MASS_FACTOR;
                addMass(breakdown.haunches, haunchMassKg, carbonFactors.steelSection);
                break;
            }
            case 'tie':
                addMass(
                    breakdown.ties,
                    lengthM * massPerMKg,
                    carbonFactors.steelSection,
                );
                break;
            case 'brace':
                addMass(
                    breakdown.braces,
                    lengthM * massPerMKg,
                    carbonFactors.steelSection,
                );
                break;
            case 'side_rail':
                addMass(
                    breakdown.sideRails,
                    lengthM * massPerMKg,
                    carbonFactors.galvanizedSteel,
                );
                break;
            case 'purlin':
                addMass(
                    breakdown.purlins,
                    lengthM * massPerMKg,
                    carbonFactors.galvanizedSteel,
                );
                break;
            case 'foundation': {
                const concreteMassKg =
                    foundationConcreteVolumeM3(member) * concreteDensity;
                addMass(breakdown.concrete, concreteMassKg, carbonFactors.concrete);

                if (foundationSizing && isMainColumnPad(member)) {
                    const side = member.start[0] < 0 ? 'left' : 'right';
                    const rebarMassKg = rebarMassForPadKg(
                        foundationSizing[side],
                        member,
                    );
                    addMass(breakdown.rebar, rebarMassKg, carbonFactors.rebar);
                }

                break;
            }
        }
    }

    const steelSectionsCarbonKg =
        breakdown.columns.carbonKg +
        breakdown.gableColumns.carbonKg +
        breakdown.rafters.carbonKg +
        breakdown.haunches.carbonKg +
        breakdown.ties.carbonKg +
        breakdown.braces.carbonKg;
    const steelSectionsMassKg =
        breakdown.columns.massKg +
        breakdown.gableColumns.massKg +
        breakdown.rafters.massKg +
        breakdown.haunches.massKg +
        breakdown.ties.massKg +
        breakdown.braces.massKg;
    const connectionsMassKg = steelSectionsMassKg * CONNECTIONS_STEEL_ALLOWANCE;

    addMass(breakdown.connections, connectionsMassKg, carbonFactors.steelSection);
    addMass(
        breakdown.slabConcrete,
        slabConcreteMassKg(design, concreteDensity),
        carbonFactors.concrete,
    );
    addMass(breakdown.slabRebar, slabRebarMassKg(design), carbonFactors.rebar);

    const totalCarbonKg =
        steelSectionsCarbonKg +
        breakdown.sideRails.carbonKg +
        breakdown.purlins.carbonKg +
        breakdown.concrete.carbonKg +
        breakdown.rebar.carbonKg +
        breakdown.slabConcrete.carbonKg +
        breakdown.slabRebar.carbonKg +
        breakdown.connections.carbonKg;

    const floorAreaM2 = design.span * design.buildingLength;
    const carbonIntensityKgM2 =
        floorAreaM2 > 0 ? totalCarbonKg / floorAreaM2 : 0;

    return {
        totalCarbonKg,
        steelSectionsCarbonKg,
        floorAreaM2,
        carbonIntensityKgM2,
        scorsBand: scorsBandForIntensity(carbonIntensityKgM2),
        breakdown,
        factors: carbonFactors,
    };
}
