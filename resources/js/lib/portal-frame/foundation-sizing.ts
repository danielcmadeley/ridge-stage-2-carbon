import type { SupportReaction } from '@/lib/portal-frame/frame-analysis';
import type {
    FoundationAssumptions,
    FoundationDesign,
    FoundationType,
} from '@/types/portal-frame';

export type FoundationCheck = {
    label: string;
    demand: number;
    capacity: number;
    unit: string;
    utilisation: number;
    passes: boolean;
};

export type FoundationDimensions = {
    widthM: number;
    depthM: number;
    heightM: number;
};

export type FoundationSizingResult = {
    type: FoundationType;
    label: string;
    dimensions: FoundationDimensions;
    checks: FoundationCheck[];
    calculationLines: string[];
    reinforcement?: {
        areaMm2PerM: number;
        barDiameterMm: number;
        spacingMm: number;
    };
    pileCap?: {
        pileSpacingM: number;
        pileDiameterM: number;
        pileDepthM: number;
        pileCount: number;
        pileCompressionKn: number;
        pileTensionKn: number;
    };
};
type FoundationReinforcement = NonNullable<FoundationSizingResult['reinforcement']>;

export const TWO_PILE_CAP_PILE_COUNT = 2;
export const TWO_PILE_CAP_PILE_DIAMETER_M = 0.45;
export const TWO_PILE_CAP_PILE_DEPTH_M = 6;
export const TWO_PILE_CAP_PILE_SPACING_FACTOR = 3;

const COLUMN_BASE_SIZE_M = 0.3;
const MIN_PAD_WIDTH_M = 1.2;
const MIN_PAD_HEIGHT_M = 0.35;
const MIN_MASS_WIDTH_M = 1.2;
const MIN_MASS_HEIGHT_M = 0.75;
const MAX_ITERATIONS = 200;

function finitePositive(value: number, fallback: number): number {
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function roundUp(value: number, increment: number): number {
    return Math.ceil(value / increment) * increment;
}

function utilisation(demand: number, capacity: number): number {
    if (capacity <= 0) {
        return Number.POSITIVE_INFINITY;
    }

    return demand / capacity;
}

function check(
    label: string,
    demand: number,
    capacity: number,
    unit: string,
): FoundationCheck {
    const ratio = utilisation(demand, capacity);

    return {
        label,
        demand,
        capacity,
        unit,
        utilisation: ratio,
        passes: ratio <= 1,
    };
}

function reactionDemands(reaction: SupportReaction): {
    compressionKn: number;
    horizontalKn: number;
    momentKnm: number;
} {
    return {
        compressionKn: Math.max(reaction.fzKn, 0),
        horizontalKn: Math.abs(reaction.fxKn),
        momentKnm: Math.abs(reaction.momentKnm),
    };
}

function bearingPressure(
    verticalKn: number,
    momentKnm: number,
    widthM: number,
    depthM: number,
): { averageKpa: number; maximumKpa: number; minimumKpa: number } {
    const areaM2 = widthM * depthM;
    const averageKpa = verticalKn / areaM2;
    const momentPressureKpa = momentKnm === 0 ? 0 : (6 * momentKnm) / (widthM * depthM ** 2);

    return {
        averageKpa,
        maximumKpa: averageKpa + momentPressureKpa,
        minimumKpa: averageKpa - momentPressureKpa,
    };
}

function concreteWeightKn(
    dimensions: FoundationDimensions,
    assumptions: FoundationAssumptions,
): number {
    return (
        dimensions.widthM *
        dimensions.depthM *
        dimensions.heightM *
        finitePositive(assumptions.concreteDensityKnM3, 24)
    );
}

function soilCoverWeightKn(
    dimensions: FoundationDimensions,
    assumptions: FoundationAssumptions,
): number {
    const soilCoverM = 0.3;

    return (
        dimensions.widthM *
        dimensions.depthM *
        soilCoverM *
        finitePositive(assumptions.soilCoverDensityKnM3, 18)
    );
}

function sizeTwoPileCap(
    reaction: SupportReaction,
    assumptions: FoundationAssumptions,
): FoundationSizingResult {
    const { compressionKn, horizontalKn, momentKnm } = reactionDemands(reaction);
    const pileDiameterM = TWO_PILE_CAP_PILE_DIAMETER_M;
    const pileSpacingM = roundUp(
        pileDiameterM * TWO_PILE_CAP_PILE_SPACING_FACTOR,
        0.05,
    );
    const edgeDistanceM = Math.max(1.5 * pileDiameterM, 0.3);
    const dimensions: FoundationDimensions = {
        widthM: roundUp(pileSpacingM + 2 * edgeDistanceM, 0.05),
        depthM: roundUp(Math.max(3 * pileDiameterM, 0.75), 0.05),
        heightM: roundUp(Math.max(1.5 * pileDiameterM, 0.45), 0.05),
    };
    const pileCompressionKn = compressionKn / 2 + momentKnm / pileSpacingM;
    const pileTensionKn = Math.max(momentKnm / pileSpacingM - compressionKn / 2, 0);
    const lateralPerPileKn = horizontalKn / 2;
    const pileCapacityKn = finitePositive(assumptions.pileWorkingCapacityKn, 300);

    return {
        type: 'two_pile_cap',
        label: 'Two-pile pile cap',
        dimensions,
        pileCap: {
            pileSpacingM,
            pileDiameterM,
            pileDepthM: TWO_PILE_CAP_PILE_DEPTH_M,
            pileCount: TWO_PILE_CAP_PILE_COUNT,
            pileCompressionKn,
            pileTensionKn,
        },
        checks: [
            check('Pile compression', pileCompressionKn, pileCapacityKn, 'kN'),
            check('Indicative lateral per pile', lateralPerPileKn, pileCapacityKn * 0.1, 'kN'),
        ],
        calculationLines: [
            `Compression N = ${compressionKn.toFixed(1)} kN, horizontal H = ${horizontalKn.toFixed(1)} kN, moment M = ${momentKnm.toFixed(1)} kNm.`,
            `Two ${pileDiameterM.toFixed(2)} m diameter piles are ${TWO_PILE_CAP_PILE_DEPTH_M.toFixed(1)} m deep.`,
            `Pile spacing = ${pileSpacingM.toFixed(2)} m centre-to-centre using ${TWO_PILE_CAP_PILE_SPACING_FACTOR} x pile diameter.`,
            `Maximum pile load = N / 2 + M / spacing = ${pileCompressionKn.toFixed(1)} kN.`,
        ],
    };
}

function reinforcedPadHeight(widthM: number): number {
    return roundUp(Math.max(MIN_PAD_HEIGHT_M, widthM / 6), 0.05);
}

function reinforcementForPad(
    maximumBearingKpa: number,
    widthM: number,
    heightM: number,
    assumptions: FoundationAssumptions,
): FoundationReinforcement {
    const cantileverM = Math.max((widthM - COLUMN_BASE_SIZE_M) / 2, 0);
    const designMomentKnmPerM = (maximumBearingKpa * cantileverM ** 2) / 2;
    const barDiameterMm = finitePositive(assumptions.preferredBarDiameterMm, 12);
    const effectiveDepthM =
        heightM - finitePositive(assumptions.concreteCoverM, 0.05) - barDiameterMm / 2000;
    const leverArmMm = Math.max(0.9 * effectiveDepthM * 1000, 1);
    const fyMpa = finitePositive(assumptions.reinforcementYieldStrengthMpa, 500);
    const requiredAreaMm2PerM =
        (designMomentKnmPerM * 1_000_000) / (0.87 * fyMpa * leverArmMm);
    const minimumAreaMm2PerM = 0.0013 * 1000 * heightM * 1000;
    const areaMm2PerM = Math.max(requiredAreaMm2PerM, minimumAreaMm2PerM);
    const barAreaMm2 = (Math.PI * barDiameterMm ** 2) / 4;
    const spacingMm = Math.max(75, Math.min(300, Math.floor((barAreaMm2 * 1000) / areaMm2PerM / 25) * 25));

    return {
        areaMm2PerM,
        barDiameterMm,
        spacingMm,
    };
}

function sizeReinforcedPad(
    reaction: SupportReaction,
    assumptions: FoundationAssumptions,
): FoundationSizingResult {
    const { compressionKn, horizontalKn, momentKnm } = reactionDemands(reaction);
    const allowableBearingKpa = finitePositive(assumptions.allowableBearingKpa, 150);
    const frictionCoefficient = finitePositive(assumptions.frictionCoefficient, 0.45);
    let widthM = roundUp(Math.max(Math.sqrt(Math.max(compressionKn, 1) / allowableBearingKpa), MIN_PAD_WIDTH_M), 0.1);
    let dimensions: FoundationDimensions = {
        widthM,
        depthM: widthM,
        heightM: reinforcedPadHeight(widthM),
    };
    let verticalKn = compressionKn + concreteWeightKn(dimensions, assumptions);
    let pressures = bearingPressure(verticalKn, momentKnm, widthM, widthM);

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const slidingCapacityKn = frictionCoefficient * verticalKn;

        if (
            pressures.maximumKpa <= allowableBearingKpa &&
            pressures.minimumKpa >= 0 &&
            slidingCapacityKn >= horizontalKn
        ) {
            break;
        }

        widthM = roundUp(widthM + 0.1, 0.1);
        dimensions = {
            widthM,
            depthM: widthM,
            heightM: reinforcedPadHeight(widthM),
        };
        verticalKn = compressionKn + concreteWeightKn(dimensions, assumptions);
        pressures = bearingPressure(verticalKn, momentKnm, widthM, widthM);
    }

    const reinforcement = reinforcementForPad(
        pressures.maximumKpa,
        dimensions.widthM,
        dimensions.heightM,
        assumptions,
    );

    return {
        type: 'reinforced_pad',
        label: 'Reinforced pad foundation',
        dimensions,
        reinforcement,
        checks: [
            check('Maximum bearing', pressures.maximumKpa, allowableBearingKpa, 'kPa'),
            check('Sliding', horizontalKn, frictionCoefficient * verticalKn, 'kN'),
        ],
        calculationLines: [
            `Compression N = ${compressionKn.toFixed(1)} kN with ${concreteWeightKn(dimensions, assumptions).toFixed(1)} kN footing self-weight.`,
            `Maximum bearing = ${pressures.maximumKpa.toFixed(1)} kPa on ${dimensions.widthM.toFixed(1)} m x ${dimensions.depthM.toFixed(1)} m.`,
            `Bottom reinforcement = ${reinforcement.areaMm2PerM.toFixed(0)} mm2/m, use T${reinforcement.barDiameterMm.toFixed(0)} @ ${reinforcement.spacingMm.toFixed(0)} mm each way.`,
        ],
    };
}

function massBlockHeight(widthM: number): number {
    return roundUp(Math.max(MIN_MASS_HEIGHT_M, widthM / 2.5), 0.05);
}

function sizeMassFilled(
    reaction: SupportReaction,
    assumptions: FoundationAssumptions,
): FoundationSizingResult {
    const { compressionKn, horizontalKn, momentKnm } = reactionDemands(reaction);
    const allowableBearingKpa = finitePositive(assumptions.allowableBearingKpa, 150);
    const frictionCoefficient = finitePositive(assumptions.frictionCoefficient, 0.45);
    let widthM = roundUp(Math.max(Math.sqrt(Math.max(compressionKn, 1) / allowableBearingKpa), MIN_MASS_WIDTH_M), 0.1);
    let dimensions: FoundationDimensions = {
        widthM,
        depthM: widthM,
        heightM: massBlockHeight(widthM),
    };
    let verticalKn =
        compressionKn +
        concreteWeightKn(dimensions, assumptions) +
        soilCoverWeightKn(dimensions, assumptions);
    let pressures = bearingPressure(verticalKn, momentKnm, widthM, widthM);

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const slidingCapacityKn = frictionCoefficient * verticalKn;

        if (
            pressures.maximumKpa <= allowableBearingKpa &&
            pressures.minimumKpa >= 0 &&
            slidingCapacityKn >= horizontalKn
        ) {
            break;
        }

        widthM = roundUp(widthM + 0.1, 0.1);
        dimensions = {
            widthM,
            depthM: widthM,
            heightM: massBlockHeight(widthM),
        };
        verticalKn =
            compressionKn +
            concreteWeightKn(dimensions, assumptions) +
            soilCoverWeightKn(dimensions, assumptions);
        pressures = bearingPressure(verticalKn, momentKnm, widthM, widthM);
    }

    return {
        type: 'mass_filled',
        label: 'Mass-filled foundation',
        dimensions,
        checks: [
            check('Maximum bearing', pressures.maximumKpa, allowableBearingKpa, 'kPa'),
            check('Sliding', horizontalKn, frictionCoefficient * verticalKn, 'kN'),
        ],
        calculationLines: [
            `Compression N = ${compressionKn.toFixed(1)} kN plus ${concreteWeightKn(dimensions, assumptions).toFixed(1)} kN concrete mass.`,
            `Maximum bearing = ${pressures.maximumKpa.toFixed(1)} kPa on ${dimensions.widthM.toFixed(1)} m x ${dimensions.depthM.toFixed(1)} m.`,
            `Sliding resistance = ${(frictionCoefficient * verticalKn).toFixed(1)} kN from foundation mass and vertical reaction.`,
        ],
    };
}

export function sizeFoundation(
    reaction: SupportReaction,
    design: FoundationDesign,
): FoundationSizingResult {
    if (design.type === 'two_pile_cap') {
        return sizeTwoPileCap(reaction, design.assumptions);
    }

    if (design.type === 'mass_filled') {
        return sizeMassFilled(reaction, design.assumptions);
    }

    return sizeReinforcedPad(reaction, design.assumptions);
}

export function sizeFoundationReactions(
    reactions: { left: SupportReaction; right: SupportReaction },
    design: FoundationDesign,
): { left: FoundationSizingResult; right: FoundationSizingResult } {
    return {
        left: sizeFoundation(reactions.left, design),
        right: sizeFoundation(reactions.right, design),
    };
}
