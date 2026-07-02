import type { SupportReaction } from '@/lib/portal-frame/analysis/frame-analysis';
import { foundationWindLoadKn } from '@/lib/portal-frame/foundation/foundation-wind-load';
import {
    evaluate as evaluateMass,
    Inputs as MassInputs,
    sizeFast as sizeMassFast,
} from '@/lib/portal-frame/foundation/sizers/pad-mass-sizer';
import type { Result as MassResult } from '@/lib/portal-frame/foundation/sizers/pad-mass-sizer';
import {
    evaluate as evaluatePad,
    Inputs as PadInputs,
    sizeFast as sizePadFast,
} from '@/lib/portal-frame/foundation/sizers/pad-sizer';
import type { Result as PadResult } from '@/lib/portal-frame/foundation/sizers/pad-sizer';
import {
    Inputs as PileCapInputs,
    sizeBestEffort as sizePileCapBestEffort,
} from '@/lib/portal-frame/foundation/sizers/pile-cap-2-sizer';
import type { Result as PileCapResult } from '@/lib/portal-frame/foundation/sizers/pile-cap-2-sizer';
import type {
    FoundationAssumptions,
    FoundationDesign,
    FoundationType,
    PortalFrameDesign,
    UbSectionDimensions,
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
    /** Reinforcement mass (kg) from the underlying sizer; drives the carbon rebar line. */
    rebarMassKg?: number;
};

/** @deprecated kept for back-compat; the new pile-cap sizer derives these from FoundationAssumptions. */
export const TWO_PILE_CAP_PILE_COUNT = 2;
export const TWO_PILE_CAP_PILE_DIAMETER_M = 0.45;
export const TWO_PILE_CAP_PILE_DEPTH_M = 6;
export const TWO_PILE_CAP_PILE_SPACING_FACTOR = 3;

const DEFAULT_COLUMN_PLAN_M = 0.3;
const MM_PER_M = 1000;
const ROUND50_MM = 50;

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

function columnPlanMm(column: UbSectionDimensions | undefined): {
    colXmm: number;
    colYmm: number;
} {
    if (!column) {
        return {
            colXmm: DEFAULT_COLUMN_PLAN_M * MM_PER_M,
            colYmm: DEFAULT_COLUMN_PLAN_M * MM_PER_M,
        };
    }

    return { colXmm: column.h, colYmm: column.b };
}

function roundTo50Mm(m: number): number {
    return (Math.ceil((m * MM_PER_M) / ROUND50_MM) * ROUND50_MM) / MM_PER_M;
}

const padLabel = 'Reinforced pad foundation';
const massLabel = 'Mass-filled foundation';
const pileCapLabel = 'Two-pile pile cap';

// =====================================================================
// PAD (REINFORCED)
// =====================================================================
function buildPadInputs(
    reaction: SupportReaction,
    design: FoundationDesign,
    column: UbSectionDimensions | undefined,
    windKn: number,
): PadInputs {
    const a = design.assumptions;
    const { colXmm, colYmm } = columnPlanMm(column);
    const verticalKn = Math.max(reaction.fzKn, 0);

    return new PadInputs({
        F_Gz_k: verticalKn, // treated as permanent by the sizer
        F_Wx_k: windKn, // characteristic wind (variable action), not frame fx
        gammaSoil: a.soilCoverDensityKnM3,
        c_k: 0,
        phi_k: a.effectiveFrictionAngleDeg,
        delta_k: a.interfaceFrictionAngleDeg,
        P_bearing: a.allowableBearingKpa,
        E_soil: a.soilModulusKnM2,
        nu_soil: 0.3,
        colX: colXmm / MM_PER_M,
        colY: colYmm / MM_PER_M,
        hSoil: a.retainedSoilDepthM,
        gammaConc: a.concreteDensityKnM3,
        fck: a.concreteStrengthMpa,
        fyk: a.reinforcementYieldStrengthMpa,
        gammaC: 1.5,
        gammaS: 1.15,
        acc: 0.85,
        cnom: a.concreteCoverM * MM_PER_M,
        Es: 200_000,
        includePassive: true,
        includeExcavationCarbon: false,
        // Carbon factors are not consumed by the carbon breakdown (which uses its own
        // kg/kg factors); set neutral so the sizer's internal carbon field is inert.
        ecfConc: 0,
        ecfRebar: 0,
        ecfExcav: 0,
        rhoSteel: 7850,
        rebarUplift: a.rebarUpliftFactor,
    });
}

function padResultToSizing(
    inputs: PadInputs,
    r: PadResult,
): FoundationSizingResult {
    const colXm = inputs.colX;
    const projMm = ((r.B - colXm) / 2) * MM_PER_M;
    const dAvgMm = r.h * MM_PER_M - inputs.cnom - 12;
    const checks: FoundationCheck[] = [
        check(
            'Bearing (SLS peak vs presumed)',
            r.qmax_sls,
            inputs.P_bearing,
            'kPa',
        ),
        check(
            'Eccentricity e \u2264 L/3',
            r.ex_sls * MM_PER_M,
            (r.B / 3) * MM_PER_M,
            'mm',
        ),
        check(
            'Sliding DA1-C1 (passive incl.)',
            r.slide_c1.H,
            r.slide_c1.R_H,
            'kN',
        ),
        check(
            'Sliding DA1-C2 (passive incl.)',
            r.slide_c2.H,
            r.slide_c2.R_H,
            'kN',
        ),
        check(
            'Sliding C2 (passive-discounted)',
            r.slide_c2.H,
            r.slide_c2.friction,
            'kN',
        ),
        check('Overturning EQU', r.M_dst, r.M_stb, 'kNm'),
        check('One-way shear', r.V_Ed, r.V_Rdc, 'kN'),
        check(
            'Punching face crushing',
            r.punch.vEd0,
            r.punch.vRdmax,
            'N/mm\u00b2',
        ),
        check('Punching perimeter', r.punch.vEd1, r.punch.vRdc, 'N/mm\u00b2'),
        check('Rigidity (projection \u2264 2d)', projMm, 2 * dAvgMm, 'mm'),
        check('Minimum depth h \u2265 300 mm', 300, r.h * MM_PER_M, 'mm'),
    ];

    return {
        type: 'reinforced_pad',
        label: padLabel,
        dimensions: {
            widthM: r.B,
            depthM: r.B,
            heightM: roundTo50Mm(r.h),
        },
        reinforcement: {
            areaMm2PerM: r.As_prov / r.B,
            barDiameterMm: r.bar_dia,
            spacingMm: r.bar_spc,
        },
        checks,
        rebarMassKg: r.mass_rebar,
        calculationLines: [
            `Vertical N_k = ${r.Fdz_sls.toFixed(1)} kN at underside (incl. self-weight + soil), horizontal H_k = ${r.slide_c2.H.toFixed(1)} kN (variable).`,
            `Soil \u03c6' = ${inputs.phi_k.toFixed(0)}\u00b0, \u03b4 = ${inputs.delta_k.toFixed(0)}\u00b0, \u03b3_soil = ${inputs.gammaSoil.toFixed(0)} kN/m\u00b3, E_soil = ${inputs.E_soil.toFixed(0)} kN/m\u00b2, presumed bearing = ${inputs.P_bearing.toFixed(0)} kPa.`,
            `Sized pad: ${r.B.toFixed(2)} m square \u00d7 ${(Math.ceil((r.h * MM_PER_M) / ROUND50_MM) * ROUND50_MM).toFixed(0)} mm (computed ${(r.h * MM_PER_M).toFixed(0)} mm), fck = ${inputs.fck.toFixed(0)} N/mm\u00b2, cover = ${inputs.cnom.toFixed(0)} mm.`,
            `Bearing (SLS): q_max = ${r.qmax_sls.toFixed(1)} kPa, eccentricity e = ${(r.ex_sls * MM_PER_M).toFixed(0)} mm.`,
            `Sliding DA1-C2: friction ${r.slide_c2.friction.toFixed(1)} kN + passive ${r.slide_c2.passive.toFixed(1)} kN = ${r.slide_c2.R_H.toFixed(1)} kN vs H = ${r.slide_c2.H.toFixed(1)} kN (passive-discounted util ${r.slide_nopassive_util.toFixed(2)}).`,
            `Overturning EQU: M_dst = ${r.M_dst.toFixed(1)} kNm / M_stb = ${r.M_stb.toFixed(1)} kNm, util ${r.equ_util.toFixed(2)}.`,
            `Flexure: M_Ed = ${r.M_Ed.toFixed(0)} kNm, As_req = ${r.As_req.toFixed(0)} mm\u00b2, As_flex ${r.As_flex.toFixed(0)} / As_min ${r.As_min.toFixed(0)}.`,
            `Bottom reinforcement: T${r.bar_dia.toFixed(0)} @ ${r.bar_spc.toFixed(0)} mm c/c each way (As = ${r.As_prov.toFixed(0)} mm\u00b2); top: T${r.top_dia.toFixed(0)} @ ${r.top_spc.toFixed(0)} mm c/c.`,
            `One-way shear: V_Ed = ${r.V_Ed.toFixed(0)} kN vs V_Rdc = ${r.V_Rdc.toFixed(0)} kN.`,
            `Punching: \u03b2 = ${r.punch.beta.toFixed(2)}, v_Ed0 = ${r.punch.vEd0.toFixed(2)} N/mm\u00b2 vs v_Rd,max = ${r.punch.vRdmax.toFixed(2)} N/mm\u00b2, v_Ed1 = ${r.punch.vEd1.toFixed(2)} vs v_Rdc = ${r.punch.vRdc.toFixed(2)}.`,
            `Anchorage l_bd \u2248 ${r.lbd.toFixed(0)} mm (bobbed), lap l_0 \u2248 ${r.l0.toFixed(0)} mm.`,
            `Settlement (immediate, elastic est.) \u2248 ${r.settlement_mm.toFixed(1)} mm.`,
            `Concrete volume ${r.vol_conc.toFixed(2)} m\u00b3, rebar mass ${r.mass_rebar.toFixed(0)} kg (uplift ${inputs.rebarUplift.toFixed(2)}).`,
            ...(r.reasons.length
                ? [
                      `No fully feasible geometry in the search range; outstanding flags: ${r.reasons.join(', ')}.`,
                  ]
                : []),
        ],
    };
}

function sizeReinforcedPad(
    reaction: SupportReaction,
    design: FoundationDesign,
    column: UbSectionDimensions | undefined,
    windKn: number,
): FoundationSizingResult {
    const inputs = buildPadInputs(reaction, design, column, windKn);

    try {
        return padResultToSizing(inputs, sizePadFast(inputs));
    } catch {
        // No feasible geometry in range — surface the best-effort largest pad so the
        // user sees which limit state governs instead of an opaque error.
        const fallback = evaluatePad(inputs, inputs.B_max, inputs.h_max);

        return padResultToSizing(inputs, fallback);
    }
}

// =====================================================================
// MASS (PLAIN CONCRETE)
// =====================================================================
function buildMassInputs(
    reaction: SupportReaction,
    design: FoundationDesign,
    column: UbSectionDimensions | undefined,
    windKn: number,
): MassInputs {
    const a = design.assumptions;
    const { colXmm, colYmm } = columnPlanMm(column);
    const verticalKn = Math.max(reaction.fzKn, 0);

    return new MassInputs({
        F_Gz_k: verticalKn,
        F_Wx_k: windKn,
        gammaSoil: a.soilCoverDensityKnM3,
        c_k: 0,
        phi_k: a.effectiveFrictionAngleDeg,
        delta_k: a.interfaceFrictionAngleDeg,
        P_bearing: a.allowableBearingKpa,
        E_soil: a.soilModulusKnM2,
        nu_soil: 0.3,
        colX: colXmm / MM_PER_M,
        colY: colYmm / MM_PER_M,
        hSoil: a.retainedSoilDepthM,
        gammaConc: a.concreteDensityKnM3,
        fck: a.concreteStrengthMpa,
        gammaC: 1.5,
        acc: 0.85,
        act_pl: 0.8,
        ecfConc: 0,
        ecfExcav: 0,
        includePassive: true,
        includeExcavationCarbon: false,
    });
}

function massResultToSizing(
    a: FoundationAssumptions,
    r: MassResult,
): FoundationSizingResult {
    const checks: FoundationCheck[] = [
        check(
            'Bearing (SLS peak vs presumed)',
            r.qmax_sls,
            a.allowableBearingKpa,
            'kPa',
        ),
        check(
            'Eccentricity e \u2264 L/3',
            r.ex_sls * MM_PER_M,
            (r.B / 3) * MM_PER_M,
            'mm',
        ),
        check(
            'Sliding DA1-C1 (passive incl.)',
            r.slide_c1.H,
            r.slide_c1.R_H,
            'kN',
        ),
        check(
            'Sliding DA1-C2 (passive incl.)',
            r.slide_c2.H,
            r.slide_c2.R_H,
            'kN',
        ),
        check(
            'Sliding C2 (passive-discounted)',
            r.slide_c2.H,
            r.slide_c2.friction,
            'kN',
        ),
        check('Overturning EQU', r.M_dst, r.M_stb, 'kNm'),
        check(
            'Plain footing projection a \u2264 a_max',
            r.plain_a,
            r.plain_a_max,
            'mm',
        ),
        check(
            'Minimum depth h \u2265 300 mm',
            ROUND50_MM * 6,
            r.h * MM_PER_M,
            'mm',
        ),
    ];

    return {
        type: 'mass_filled',
        label: massLabel,
        dimensions: {
            widthM: r.B,
            depthM: r.B,
            heightM: roundTo50Mm(r.h),
        },
        checks,
        rebarMassKg: 0,
        calculationLines: [
            `Vertical N_k = ${r.Fdz_sls.toFixed(1)} kN at underside (incl. self-weight + soil), horizontal H_k = ${r.slide_c2.H.toFixed(1)} kN (variable).`,
            `Soil \u03c6' = ${a.effectiveFrictionAngleDeg.toFixed(0)}\u00b0, \u03b4 = ${a.interfaceFrictionAngleDeg.toFixed(0)}\u00b0, \u03b3_soil = ${a.soilCoverDensityKnM3.toFixed(0)} kN/m\u00b3, E_soil = ${a.soilModulusKnM2.toFixed(0)} kN/m\u00b2, presumed bearing = ${a.allowableBearingKpa.toFixed(0)} kPa.`,
            `Sized mass pad: ${r.B.toFixed(2)} m square \u00d7 ${(Math.ceil((r.h * MM_PER_M) / ROUND50_MM) * ROUND50_MM).toFixed(0)} mm (computed ${(r.h * MM_PER_M).toFixed(0)} mm), UNREINFORCED, fck = ${a.concreteStrengthMpa.toFixed(0)} N/mm\u00b2.`,
            `EC2 \u00a712.9.3 plain-footing check: a = ${r.plain_a.toFixed(0)} mm \u2264 a_max = ${r.plain_a_max.toFixed(0)} mm (util ${r.plain_util.toFixed(2)}; f_dz = ${r.plain_fdz.toFixed(0)} kN/m\u00b2).`,
            `Bearing (SLS): q_max = ${r.qmax_sls.toFixed(1)} kPa, eccentricity e = ${(r.ex_sls * MM_PER_M).toFixed(0)} mm.`,
            `Sliding DA1-C2: friction ${r.slide_c2.friction.toFixed(1)} kN + passive ${r.slide_c2.passive.toFixed(1)} kN = ${r.slide_c2.R_H.toFixed(1)} kN vs H = ${r.slide_c2.H.toFixed(1)} kN (passive-discounted util ${r.slide_nopassive_util.toFixed(2)}).`,
            `Overturning EQU: M_dst = ${r.M_dst.toFixed(1)} kNm / M_stb = ${r.M_stb.toFixed(1)} kNm, util ${r.equ_util.toFixed(2)}.`,
            `Settlement (immediate, elastic est.) \u2248 ${r.settlement_mm.toFixed(1)} mm.`,
            `Concrete volume ${r.vol_conc.toFixed(2)} m\u00b3, rebar: none.`,
            ...(r.reasons.length
                ? [
                      `No fully feasible geometry in the search range; outstanding flags: ${r.reasons.join(', ')}.`,
                  ]
                : []),
        ],
    };
}

function sizeMassFilled(
    reaction: SupportReaction,
    design: FoundationDesign,
    column: UbSectionDimensions | undefined,
    windKn: number,
): FoundationSizingResult {
    const inputs = buildMassInputs(reaction, design, column, windKn);

    try {
        return massResultToSizing(design.assumptions, sizeMassFast(inputs));
    } catch {
        const fallback = evaluateMass(inputs, inputs.B_max, inputs.h_max);

        return massResultToSizing(design.assumptions, fallback);
    }
}

// =====================================================================
// TWO-PILE CAP
// =====================================================================
function buildPileCapInputs(
    reaction: SupportReaction,
    a: FoundationAssumptions,
    column: UbSectionDimensions | undefined,
    deadLoadKnM2: number,
    servicesLoadKnM2: number,
    liveLoadKnM2: number,
    windKn: number,
): PileCapInputs {
    const { colXmm, colYmm } = columnPlanMm(column);

    // Split the vertical reaction into permanent/variable parts using the
    // design permanent/live ratio. Services are permanent (factored by γ_G
    // = 1.35 alongside the dead load) so they fold into the permanent side
    // of the split; the sizer then applies γ_G/γ_Q internally.
    const permanentTotal = deadLoadKnM2 + servicesLoadKnM2;
    const liveTotal = liveLoadKnM2;
    const denominator = permanentTotal + liveTotal;
    const permanentFraction =
        denominator > 0 ? permanentTotal / denominator : 1;
    const variableFraction = 1 - permanentFraction;

    const verticalKn = Math.max(reaction.fzKn, 0);
    const momentKnm = Math.abs(reaction.momentKnm);

    return new PileCapInputs({
        N_G: permanentFraction * verticalKn,
        N_Q: variableFraction * verticalKn,
        Fvx_G: 0,
        Fvx_Q: windKn,
        M_G: permanentFraction * momentKnm,
        M_Q: variableFraction * momentKnm,
        colEcc: 0,
        pileCapacity: a.pileWorkingCapacityKn,
        pileDia: a.pileDiameterM * MM_PER_M,
        colX: colXmm,
        colY: colYmm,
        overhang: a.capOverhangMm,
        spacingFactor: a.pileSpacingFactor,
        fck: a.concreteStrengthMpa,
        fyk: a.reinforcementYieldStrengthMpa,
        gammaC_density: a.concreteDensityKnM3,
        gammaC: 1.5,
        acc: 0.85,
        coverBot: a.concreteCoverM * MM_PER_M,
        coverSide: 50,
        coverTop: 50,
        barTie: a.preferredBarDiameterMm,
        gG: 1.35,
        gQ: 1.5,
        ecfConc: 0,
        ecfRebar: 0,
        rebarRate: a.rebarRateKgM3,
        rhoSteel: 7850,
        includePileCarbon: false,
        pileLength: a.pileDepthM,
        ecfPileConc: 0,
        strutAngleMin: 45,
        D_step: 0.025,
        D_max: 2.0,
    });
}

function pileCapResultToSizing(
    a: FoundationAssumptions,
    r: PileCapResult,
): FoundationSizingResult {
    const pileSpacingM = r.s / MM_PER_M;
    const pileTensionKn = Math.max(
        0,
        (2 * Math.abs(r.M_serv)) / pileSpacingM - r.P_serv_max,
    );

    const checks: FoundationCheck[] = [
        check(
            'Pile capacity (service)',
            r.P_serv_max,
            a.pileWorkingCapacityKn,
            'kN',
        ),
        check('Beam shear (enhanced)', r.V_red, r.V_Rdc, 'kN'),
        check('Strut crushing v_Rd,max', r.P_ult_max, r.VRd_max, 'kN'),
        check('CCC node (column)', r.ccc_sed, r.ccc_srd, 'N/mm\u00b2'),
        check('CCT node (pile)', r.cct_force, r.cct_cap, 'kN'),
        check('Column punching', r.punch_util, 1, '\u2014'),
        check('Strut angle \u2265 min', 45, r.strut_angle, '\u00b0'),
        check(
            'Minimum depth D \u2265 2 \u00d7 pile \u00d8',
            2 * a.pileDiameterM * MM_PER_M,
            r.D * MM_PER_M,
            'mm',
        ),
    ];

    return {
        type: 'two_pile_cap',
        label: pileCapLabel,
        dimensions: {
            widthM: r.Lx / MM_PER_M,
            depthM: r.Ly / MM_PER_M,
            heightM: r.D,
        },
        pileCap: {
            pileSpacingM,
            pileDiameterM: a.pileDiameterM,
            pileDepthM: a.pileDepthM,
            pileCount: 2,
            pileCompressionKn: r.P_serv_max,
            pileTensionKn,
        },
        checks,
        rebarMassKg: r.mass_rebar,
        calculationLines: [
            `Reactions split into permanent (dead + services, \u03b3_G = 1.35) and variable (live, \u03b3_Q = 1.50) parts inside the sizer; applied moment ${r.M_serv.toFixed(0)} kNm (service), ${r.M_ult.toFixed(0)} kNm (ultimate).`,
            `Pile: 2 \u00d7 ${a.pileDiameterM * MM_PER_M} mm \u00d8, ${a.pileDepthM.toFixed(1)} m deep, working capacity ${a.pileWorkingCapacityKn.toFixed(0)} kN, spacing factor ${a.pileSpacingFactor.toFixed(1)} \u00d7 \u00d8 = ${(pileSpacingM * MM_PER_M).toFixed(0)} mm c/c.`,
            `Cap plan: ${r.Lx.toFixed(0)} \u00d7 ${r.Ly.toFixed(0)} mm, depth D = ${(r.D * MM_PER_M).toFixed(0)} mm (d = ${r.d.toFixed(0)} mm); overhang ${a.capOverhangMm.toFixed(0)} mm.`,
            `Pile reactions: service ${r.P_serv_max.toFixed(0)} kN (max) vs capacity ${a.pileWorkingCapacityKn.toFixed(0)} kN, ultimate ${r.P_ult_max.toFixed(0)} kN; M_serv ${r.M_serv.toFixed(0)} kNm, M_ult ${r.M_ult.toFixed(0)} kNm.`,
            `Main tie: T = ${r.tie_force.toFixed(0)} kN \u2192 As_req = ${r.As_tie_req.toFixed(0)} mm\u00b2 \u2192 ${r.tie_n}B${r.tie_dia} (${r.As_tie_prov.toFixed(0)} mm\u00b2).`,
            `Beam shear (EC2 6.2.2(6) enhanced): a_v = ${r.shear_av.toFixed(0)} mm, \u03b2 = ${r.shear_beta.toFixed(2)}, V_red = ${r.V_red.toFixed(0)} kN vs V_Rdc = ${r.V_Rdc.toFixed(0)} kN.`,
            `Strut crushing: V_Rd,max = ${r.VRd_max.toFixed(0)} kN, strut angle = ${r.strut_angle.toFixed(0)}\u00b0.`,
            `Nodes: CCC \u03c3_ed = ${r.ccc_sed.toFixed(1)} / \u03c3_rd = ${r.ccc_srd.toFixed(1)} N/mm\u00b2; CCT ${r.cct_force.toFixed(0)} / ${r.cct_cap.toFixed(0)} kN.`,
            `Column punching util ${r.punch_util.toFixed(2)}.`,
            `Concrete volume ${r.vol_conc.toFixed(2)} m\u00b3, rebar mass ${r.mass_rebar.toFixed(0)} kg (rate ${a.rebarRateKgM3.toFixed(0)} kg/m\u00b3). Cubic self-weight ${r.selfweight.toFixed(0)} kN.`,
            ...(r.reasons.length
                ? [
                      `No fully feasible depth in range; outstanding flags: ${r.reasons.join(', ')}.`,
                  ]
                : []),
        ],
    };
}

function sizeTwoPileCap(
    reaction: SupportReaction,
    a: FoundationAssumptions,
    column: UbSectionDimensions | undefined,
    deadLoadKnM2: number,
    servicesLoadKnM2: number,
    liveLoadKnM2: number,
    windKn: number,
): FoundationSizingResult {
    const inputs = buildPileCapInputs(
        reaction,
        a,
        column,
        deadLoadKnM2,
        servicesLoadKnM2,
        liveLoadKnM2,
        windKn,
    );

    // Best effort: the min-carbon feasible depth, or the least-overstressed
    // depth (with its failing checks surfaced) when no 2-pile cap works.
    return pileCapResultToSizing(a, sizePileCapBestEffort(inputs));
}

// =====================================================================
// DISPATCH
// =====================================================================
export function sizeFoundation(
    reaction: SupportReaction,
    design: PortalFrameDesign,
    columnSection?: UbSectionDimensions,
): FoundationSizingResult {
    const foundation = design.foundation;
    const windKn = foundationWindLoadKn(design);

    if (foundation.type === 'two_pile_cap') {
        return sizeTwoPileCap(
            reaction,
            foundation.assumptions,
            columnSection,
            design.deadLoadKnM2,
            design.servicesLoadKnM2,
            design.liveLoadKnM2,
            windKn,
        );
    }

    if (foundation.type === 'mass_filled') {
        return sizeMassFilled(reaction, foundation, columnSection, windKn);
    }

    return sizeReinforcedPad(reaction, foundation, columnSection, windKn);
}

export function sizeFoundationReactions(
    reactions: { left: SupportReaction; right: SupportReaction },
    design: PortalFrameDesign,
    columnSection?: UbSectionDimensions,
): { left: FoundationSizingResult; right: FoundationSizingResult } {
    return {
        left: sizeFoundation(reactions.left, design, columnSection),
        right: sizeFoundation(reactions.right, design, columnSection),
    };
}
