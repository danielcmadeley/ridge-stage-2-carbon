/**
 * Stage 2 MASS (plain concrete) PAD foundation sizer — TypeScript port.
 *
 * No reinforcement. Geotech (bearing, sliding, EQU) is identical to the reinforced
 * pad; structural design is EN 1992-1-1 §12.9.3 (plain concrete): the column-face
 * projection a must not exceed a_max = 0.85*h*sqrt(f_ctd,pl/(3*f_dz)) (exp. 12.13).
 * This rule fixes the depth. Carbon = concrete only.
 *
 * Geotechnical : EN 1997-1:2004 +A1:2013 & UK NA (DA1, combinations C1/C2)
 * Structural   : EN 1992-1-1:2004 +A1:2014 §12 & UK NA (plain concrete footing)
 * Combinations : EN 1990 (incl. EQU set A1.2(A))
 */

const d2r = (x: number) => (x * Math.PI) / 180;
const r2d = (x: number) => (x * 180) / Math.PI;

// =====================================================================
// INPUTS
// =====================================================================
export interface InputsConfig {
    F_Gz_k?: number;
    F_Wx_k?: number;
    gammaSoil?: number;
    c_k?: number;
    phi_k?: number;
    delta_k?: number;
    P_bearing?: number;
    E_soil?: number;
    nu_soil?: number;
    colX?: number;
    colY?: number;
    hSoil?: number;
    gammaConc?: number;
    fck?: number;
    gammaC?: number;
    acc?: number;
    act_pl?: number;
    gG?: number;
    gGf?: number;
    gQ?: number;
    gG2?: number;
    gQ2?: number;
    gphi_M2?: number;
    gG_dst?: number;
    gG_stb?: number;
    gQ_dst?: number;
    ecfConc?: number;
    ecfExcav?: number;
    includePassive?: boolean;
    includeExcavationCarbon?: boolean;
    B_min?: number;
    B_max?: number;
    B_step?: number;
    h_min?: number;
    h_max?: number;
    h_step?: number;
}

export class Inputs {
    // variable inputs
    F_Gz_k = 250;
    F_Wx_k = 150;
    gammaSoil = 18;
    c_k = 0;
    phi_k = 30;
    delta_k = 20;
    P_bearing = 150;
    E_soil = 25000;
    nu_soil = 0.3;
    // fixed / default inputs
    colX = 0.3;
    colY = 0.3;
    hSoil = 0.6;
    gammaConc = 25;
    fck = 28;
    gammaC = 1.5;
    acc = 0.85;
    act_pl = 0.8; // plain-concrete tensile strength coeff (cl.12.3.1)
    // DA1 / EQU partial factors
    gG = 1.35;
    gGf = 1.0;
    gQ = 1.5;
    gG2 = 1.0;
    gQ2 = 1.3;
    gphi_M2 = 1.25;
    gG_dst = 1.1;
    gG_stb = 0.9;
    gQ_dst = 1.5;
    // carbon (A1-A3)
    ecfConc = 329;
    ecfExcav = 5.0;
    // engine config / toggles
    includePassive = true;
    includeExcavationCarbon = false;
    B_min = 0.6;
    B_max = 4.0;
    B_step = 0.05;
    h_min = 0.3;
    h_max = 1.5;
    h_step = 0.025;
    // derived
    readonly fctm: number;
    readonly fcd: number;
    readonly f_ctd_pl: number;

    constructor(cfg: InputsConfig = {}) {
        Object.assign(this, cfg);
        this.fctm = 0.3 * this.fck ** (2 / 3);
        this.fcd = (this.acc * this.fck) / this.gammaC;
        this.f_ctd_pl = (this.act_pl * (0.7 * this.fctm)) / this.gammaC; // N/mm2
    }
}

// =====================================================================
// RESULT
// =====================================================================
export interface Sliding {
    combo: number;
    util: number;
    H: number;
    R_H: number;
    friction: number;
    passive: number;
    Kp: number;
    delta_d: number;
}
export interface Result {
    feasible: boolean;
    B: number;
    h: number;
    carbon: number;
    qmax_sls: number;
    ex_sls: number;
    Fdz_sls: number;
    slide_c1: Sliding;
    slide_c2: Sliding;
    slide_nopassive_util: number;
    equ_util: number;
    M_dst: number;
    M_stb: number;
    settlement_mm: number;
    plain_a: number;
    plain_a_max: number;
    plain_fdz: number;
    plain_util: number;
    vol_conc: number;
    carbon_conc: number;
    excav_vol: number;
    reasons: string[];
}

// =====================================================================
// ENGINE
// =====================================================================
function bearingPressure(I: Inputs, B: number, h: number) {
    const Fswt = h * I.gammaConc,
        Fsoil = I.hSoil * I.gammaSoil;
    const A = B * B;
    const Fdz = A * (Fswt + Fsoil) + I.F_Gz_k;
    const ex = (I.F_Wx_k * h) / Fdz;
    let qmax: number;

    if (ex <= B / 6) {
        qmax = (Fdz / A) * (1 + (6 * ex) / B);
    } else if (ex < 0.5 * B) {
        qmax = (2 * Fdz) / (B * 3 * (B / 2 - ex));
    } else {
        qmax = Infinity;
    }

    return { qmax, ex, Fdz };
}

function sliding(I: Inputs, B: number, h: number, combo: number): Sliding {
    const Fswt = h * I.gammaConc,
        Fsoil = I.hSoil * I.gammaSoil;
    const Fdz = B * B * (Fswt + Fsoil) + I.F_Gz_k; // favourable vertical, gGf=1.0
    let H: number, phid: number, deld: number;

    if (combo === 1) {
        H = I.gQ * I.F_Wx_k;
        phid = I.phi_k;
        deld = I.delta_k;
    } else {
        H = I.gQ2 * I.F_Wx_k;
        phid = r2d(Math.atan(Math.tan(d2r(I.phi_k)) / I.gphi_M2));
        deld = r2d(Math.atan(Math.tan(d2r(I.delta_k)) / I.gphi_M2));
    }

    const friction = Fdz * Math.tan(d2r(deld));
    const fp = d2r(phid),
        dp = d2r(deld);
    const num = Math.sin(d2r(90) - fp) ** 2;
    const den =
        Math.sin(d2r(90) + dp) *
        (1 -
            Math.sqrt(
                (Math.sin(fp + dp) * Math.sin(fp)) / Math.sin(d2r(90) + dp),
            )) **
            2;
    const Kp = num / den;
    const passive = I.includePassive
        ? (Kp * Math.cos(dp) * I.gammaSoil * B * h * (h + 2 * I.hSoil)) / 2
        : 0.0;
    const R_H = friction + passive;

    return {
        combo,
        util: H / R_H,
        H,
        R_H,
        friction,
        passive,
        Kp,
        delta_d: deld,
    };
}

function slidingNoPassiveUtil(I: Inputs, B: number, h: number): number {
    const Fswt = h * I.gammaConc,
        Fsoil = I.hSoil * I.gammaSoil;
    const Fdz = B * B * (Fswt + Fsoil) + I.F_Gz_k;
    const H = I.gQ2 * I.F_Wx_k;
    const deld = r2d(Math.atan(Math.tan(d2r(I.delta_k)) / I.gphi_M2));

    return H / (Fdz * Math.tan(d2r(deld)));
}

function overturning(I: Inputs, B: number, h: number) {
    const Fswt = h * I.gammaConc,
        Fsoil = I.hSoil * I.gammaSoil;
    const V = B * B * (Fswt + Fsoil) + I.F_Gz_k;
    const M_dst = I.gQ_dst * I.F_Wx_k * h;
    const M_stb = I.gG_stb * V * (B / 2);

    return { util: M_dst / M_stb, M_dst, M_stb };
}

// EC2 §12.9.3 plain footing: projection a <= a_max(h, f_dz, f_ctd,pl)
function plainFooting(I: Inputs, B: number, h: number) {
    const Fswt = h * I.gammaConc,
        Fsoil = I.hSoil * I.gammaSoil;
    let f_dz = 0.0;

    for (const [gg, gq] of [
        [I.gG, I.gQ],
        [I.gG2, I.gQ2],
    ]) {
        const Fdz = gg * (B * B * (Fswt + Fsoil) + I.F_Gz_k);
        const ex = (gq * I.F_Wx_k * h) / Fdz;
        const Aeff = Math.max(B - 2 * ex, 1e-6) * B;
        f_dz = Math.max(f_dz, Fdz / Aeff); // kN/m2
    }

    const a = ((B - I.colX) / 2) * 1000; // mm
    const a_max =
        0.85 * (h * 1000) * Math.sqrt(I.f_ctd_pl / ((3 * f_dz) / 1000));

    return { a, a_max, f_dz, util: a / a_max };
}

export function evaluate(I: Inputs, B: number, h: number): Result {
    const reasons: string[] = [];

    const {
        qmax: qmax_sls,
        ex: ex_sls,
        Fdz: Fdz_sls,
    } = bearingPressure(I, B, h);

    if (qmax_sls > I.P_bearing) {
        reasons.push('bearing');
    }

    if (ex_sls > B / 3) {
        reasons.push('eccentricity>L/3');
    }

    const sc1 = sliding(I, B, h, 1),
        sc2 = sliding(I, B, h, 2);

    if (Math.max(sc1.util, sc2.util) > 1.0) {
        reasons.push('sliding');
    }

    const np_util = slidingNoPassiveUtil(I, B, h);

    const { util: equ_util, M_dst, M_stb } = overturning(I, B, h);

    if (equ_util > 1.0) {
        reasons.push('EQU');
    }

    const pf = plainFooting(I, B, h);

    if (pf.util > 1.0) {
        reasons.push('plain-footing projection (a>a_max)');
    }

    if (h < 0.3) {
        reasons.push('h<300');
    }

    const Is = 0.82;
    const settlement =
        (((Fdz_sls / (B * B)) * B * (1 - I.nu_soil ** 2) * Is) / I.E_soil) *
        1000;

    const vol = B * B * h;
    const excav = B * B * (I.hSoil + h);
    const carbon_conc = vol * I.ecfConc;
    const carbon =
        carbon_conc + (I.includeExcavationCarbon ? excav * I.ecfExcav : 0.0);

    return {
        feasible: reasons.length === 0,
        B,
        h,
        carbon,
        qmax_sls,
        ex_sls,
        Fdz_sls,
        slide_c1: sc1,
        slide_c2: sc2,
        slide_nopassive_util: np_util,
        equ_util,
        M_dst,
        M_stb,
        settlement_mm: settlement,
        plain_a: pf.a,
        plain_a_max: pf.a_max,
        plain_fdz: pf.f_dz,
        plain_util: pf.util,
        vol_conc: vol,
        carbon_conc,
        excav_vol: excav,
        reasons,
    };
}

// ---------------------------------------------------------------------
// SIZE — original brute-force 2-D grid search (1:1 with Python ref)
// ---------------------------------------------------------------------
export function size(I: Inputs): Result {
    let best: Result | null = null;
    const nB = Math.round((I.B_max - I.B_min) / I.B_step) + 1;
    const nh = Math.round((I.h_max - I.h_min) / I.h_step) + 1;

    for (let i = 0; i < nB; i++) {
        const B = Math.round((I.B_min + i * I.B_step) * 1000) / 1000;

        for (let j = 0; j < nh; j++) {
            const h = Math.round((I.h_min + j * I.h_step) * 1000) / 1000;
            const r = evaluate(I, B, h);

            if (r.feasible && (best === null || r.carbon < best.carbon)) {
                best = r;
            }
        }
    }

    if (best === null) {
        throw new Error(
            'No feasible plain pad in the search range - widen B_max/h_max ' +
                'or relax inputs (includePassive, P_bearing, fck for f_ctd,pl).',
        );
    }

    return best;
}

// ---------------------------------------------------------------------
// SIZE (FAST) — for each B, scan up from h_min to the first feasible depth.
// Depth is NOT driven by the §12.9.3 plain-footing rule alone: sliding
// (passive resistance grows with depth) and EQU also demand depth, while
// bearing worsens with it (self-weight), so the feasible depths for a
// given B form an interval that a closed-form §12.9.3 estimate can miss
// entirely. Carbon at fixed B increases with h, so the first feasible h
// is that B's minimum-carbon depth; keep the best carbon across widths.
// ---------------------------------------------------------------------
export function sizeFast(I: Inputs): Result {
    let best: Result | null = null;
    const nB = Math.round((I.B_max - I.B_min) / I.B_step) + 1;
    const nh = Math.round((I.h_max - I.h_min) / I.h_step) + 1;

    for (let i = 0; i < nB; i++) {
        const B = Math.round((I.B_min + i * I.B_step) * 1000) / 1000;

        for (let j = 0; j < nh; j++) {
            const h = Math.round((I.h_min + j * I.h_step) * 1000) / 1000;
            const r = evaluate(I, B, h);

            if (r.feasible) {
                if (best === null || r.carbon < best.carbon) {
                    best = r;
                }

                break;
            }
        }
    }

    if (best === null) {
        throw new Error(
            'No feasible plain pad in range - check P_bearing / passive / fck.',
        );
    }

    return best;
}

// =====================================================================
// REPORT
// =====================================================================
export function report(I: Inputs, r: Result): string {
    const out: string[] = [];
    const p = (s: string) => out.push(s);
    const line = (name: string, val: number, extra = '') => {
        const flag = val <= 1.0 ? 'OK ' : 'XX ';
        p(
            `   ${flag}${name.padEnd(34)}${val.toFixed(2).padStart(5)}  ${extra}`,
        );
    };
    const HV =
        I.F_Wx_k /
        (r.B * r.B * (r.h * I.gammaConc + I.hSoil * I.gammaSoil) + I.F_Gz_k);
    p('='.repeat(64));
    p(' MASS (PLAIN) CONCRETE PAD - STAGE 2 SIZING');
    p('='.repeat(64));
    p(
        ` Inputs : V=${I.F_Gz_k.toFixed(0)} kN  H=${I.F_Wx_k.toFixed(0)} kN  phi'=${I.phi_k.toFixed(0)}  ` +
            `delta=${I.delta_k.toFixed(0)}  P_bear=${I.P_bearing.toFixed(0)}  ` +
            `passive=${I.includePassive ? 'on' : 'OFF'}`,
    );
    p('-'.repeat(64));
    p(
        ` SIZED PAD : ${r.B.toFixed(2)} m square x ${(Math.ceil((r.h * 1000) / 50) * 50).toFixed(0)} mm ` +
            `(computed ${(r.h * 1000).toFixed(0)} mm)  -  UNREINFORCED`,
    );
    p(
        ` Plain check (EC2 12.9.3): a=${r.plain_a.toFixed(0)} <= a_max=${r.plain_a_max.toFixed(0)} mm ` +
            `(util ${r.plain_util.toFixed(2)}; f_dz=${r.plain_fdz.toFixed(0)} kN/m2, ` +
            `f_ctd,pl=${I.f_ctd_pl.toFixed(2)})`,
    );
    p(` Concrete  : ${r.vol_conc.toFixed(2)} m3      Rebar : none`);
    p(` CARBON A1-A3 : ${r.carbon.toFixed(0)} kgCO2e (concrete only)`);
    p('-'.repeat(64));
    p(' Limit-state utilisations');
    line(
        'Bearing (SLS peak vs presumed)',
        r.qmax_sls / I.P_bearing,
        `qmax=${r.qmax_sls.toFixed(0)}  e=${(r.ex_sls * 1000).toFixed(0)}mm`,
    );
    line('Sliding DA1-C1 (passive incl.)', r.slide_c1.util);
    line('Sliding DA1-C2 (passive incl.)', r.slide_c2.util);
    p(
        `   !! Sliding C2 passive DISCOUNTED  ${r.slide_nopassive_util.toFixed(2).padStart(5)}  ` +
            `(robustness - confirm soil in front cannot be removed)`,
    );
    line('Overturning EQU', r.equ_util);
    line('Plain footing projection a/a_max', r.plain_util, '<- governs depth');
    p('-'.repeat(64));
    p(' Added checks');
    p(
        `   Settlement (immediate, elastic est.) ~ ${r.settlement_mm.toFixed(1)} mm`,
    );
    p(`   Mass concrete: no reinforcement; depth set by EC2 §12.9.3`);
    p(`   Check column-interface bearing (EC2 §6.7) at detailed design`);
    p('-'.repeat(64));
    p(
        ` H/V = ${HV.toFixed(2)} (steep -> consider EC7 Annex D inclination factors for bearing)`,
    );

    if (r.reasons.length) {
        p(` NOTE: returned pad still flags: ${JSON.stringify(r.reasons)}`);
    }

    p('='.repeat(64));

    return out.join('\n');
}
