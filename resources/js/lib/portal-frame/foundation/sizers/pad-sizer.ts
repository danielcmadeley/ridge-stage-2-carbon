/**
 * Stage 2 pad foundation SIZER (embodied-carbon tool) — TypeScript port.
 *
 * A *sizer*, not a checker. Supply vertical load, horizontal load and soil
 * properties; the tool searches feasible square pads (B, h) and returns the
 * minimum A1-A3 embodied-carbon geometry that passes every limit state.
 *
 * Geotechnical : EN 1997-1:2004 +A1:2013 & UK NA (DA1, combinations C1/C2)
 * Structural   : EN 1992-1-1:2004 +A1:2014 & UK NA
 * Combinations : EN 1990 (incl. EQU set A1.2(A))
 *
 * Caveats (carried over from the Python reference):
 *  - Bearing checked on PEAK edge pressure vs presumed allowable (no-tension aware).
 *  - Sliding includes passive by default; a passive-discounted util is also reported.
 *  - Depth bounded below by rigidity (projection <= 2d) to keep rigid-pad assumptions valid.
 *  - Excavation/disposal (A4/A5) excluded from the carbon objective unless enabled.
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
    fyk?: number;
    gammaC?: number;
    gammaS?: number;
    acc?: number;
    cnom?: number;
    Es?: number;
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
    ecfRebar?: number;
    ecfExcav?: number;
    rhoSteel?: number;
    rebarUplift?: number;
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
    F_Gz_k = 250; // kN permanent vertical column load
    F_Wx_k = 150; // kN variable (wind) horizontal load, x
    gammaSoil = 18; // kN/m3 soil bulk unit weight
    c_k = 0; // kN/m2 effective cohesion (unused in resistance)
    phi_k = 30; // deg effective shear resistance angle
    delta_k = 20; // deg soil-concrete interface friction angle
    P_bearing = 150; // kN/m2 presumed (allowable) bearing pressure (SLS)
    E_soil = 25000; // kN/m2 drained modulus (settlement estimate only)
    nu_soil = 0.3;
    // fixed / default inputs
    colX = 0.3;
    colY = 0.3; // m column plan
    hSoil = 0.6; // m retained soil over pad
    gammaConc = 25; // kN/m3 concrete
    fck = 28;
    fyk = 500; // N/mm2
    gammaC = 1.5;
    gammaS = 1.15;
    acc = 0.85;
    cnom = 50; // mm cover all faces
    Es = 200000;
    // DA1 / EQU partial factors
    gG = 1.35;
    gGf = 1.0;
    gQ = 1.5; // A1 (Combination 1)
    gG2 = 1.0;
    gQ2 = 1.3; // A2 (Combination 2)
    gphi_M2 = 1.25; // M2 on tan(phi)
    gG_dst = 1.1;
    gG_stb = 0.9;
    gQ_dst = 1.5; // EQU
    // carbon (A1-A3)
    ecfConc = 329;
    ecfRebar = 0.76;
    ecfExcav = 5.0;
    rhoSteel = 7850;
    rebarUplift = 1.1;
    // engine config / toggles
    includePassive = true;
    includeExcavationCarbon = false;
    B_min = 0.6;
    B_max = 4.0;
    B_step = 0.05;
    h_min = 0.3;
    h_max = 1.2;
    h_step = 0.025;
    // derived
    readonly fctm: number;
    readonly fcd: number;
    readonly fyd: number;

    constructor(cfg: InputsConfig = {}) {
        Object.assign(this, cfg);
        this.fctm = 0.3 * this.fck ** (2 / 3);
        this.fcd = (this.acc * this.fck) / this.gammaC;
        this.fyd = this.fyk / this.gammaS;
    }
}

// =====================================================================
// RESULT CONTAINERS
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
export interface Punching {
    beta: number;
    u0: number;
    u1: number;
    W1: number;
    vEd0: number;
    vRdmax: number;
    vEd1: number;
    vRdc: number;
    VEd: number;
    d: number;
}
export interface RebarPick {
    As: number;
    dia: number;
    spc: number;
    n: number;
    As_req: number;
    As_flex: number;
    As_min: number;
    z: number;
    d: number;
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
    M_Ed: number;
    As_req: number;
    As_min: number;
    As_flex: number;
    bar_dia: number;
    bar_spc: number;
    As_prov: number;
    z: number;
    d_flex: number;
    top_dia: number;
    top_spc: number;
    V_Ed: number;
    V_Rdc: number;
    punch: Punching;
    lb_rqd: number;
    lbd: number;
    l0: number;
    fbd: number;
    vol_conc: number;
    mass_rebar: number;
    carbon_conc: number;
    carbon_rebar: number;
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
    const Fdz = A * (Fswt + Fsoil) + I.F_Gz_k; // characteristic vertical at underside
    const ex = (I.F_Wx_k * h) / Fdz; // net ecc = overturning moment / V
    let qmax: number;

    if (ex <= B / 6) {
        qmax = (Fdz / A) * (1 + (6 * ex) / B); // full contact, linear
    } else if (ex < 0.5 * B) {
        qmax = (2 * Fdz) / (B * 3 * (B / 2 - ex)); // partial, triangular
    } else {
        qmax = Infinity;
    }

    return { qmax, ex, Fdz };
}

function sliding(I: Inputs, B: number, h: number, combo: number): Sliding {
    const Fswt = h * I.gammaConc,
        Fsoil = I.hSoil * I.gammaSoil;
    const Fdz = B * B * (Fswt + Fsoil) + I.F_Gz_k; // favourable vertical, gGf = 1.0
    let H: number, phid: number, deld: number;

    if (combo === 1) {
        H = I.gQ * I.F_Wx_k;
        phid = I.phi_k;
        deld = I.delta_k; // M1, no reduction
    } else {
        H = I.gQ2 * I.F_Wx_k;
        phid = r2d(Math.atan(Math.tan(d2r(I.phi_k)) / I.gphi_M2));
        deld = r2d(Math.atan(Math.tan(d2r(I.delta_k)) / I.gphi_M2));
    }

    const friction = Fdz * Math.tan(d2r(deld));
    // Coulomb passive coefficient
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

function ulsPressures(I: Inputs, B: number, h: number, combo: number) {
    const Fswt = h * I.gammaConc,
        Fsoil = I.hSoil * I.gammaSoil;
    const [gg, gq] = combo === 1 ? [I.gG, I.gQ] : [I.gG2, I.gQ2];
    const Fdz = gg * (B * B * (Fswt + Fsoil) + I.F_Gz_k);
    const M = gq * I.F_Wx_k * h;
    const ex = M / Fdz;
    const A = B * B;
    const q_self = gg * (Fswt + Fsoil);
    const qmax = (Fdz / A) * (1 + (6 * ex) / B) - q_self;
    const qmin = (Fdz / A) * (1 - (6 * ex) / B) - q_self;

    return { qmax, qmin, Fdz, ex };
}

function flexureShear(I: Inputs, B: number, h: number, dia = 12.0) {
    const d = h * 1000 - I.cnom - dia / 2;
    let best_M = 0,
        best_V = 0;

    for (const combo of [1, 2]) {
        const { qmax, qmin } = ulsPressures(I, B, h, combo);
        const proj = (B - I.colX) / 2;
        const q_face = qmax - (qmax - qmin) * (proj / B);
        // moment of trapezoidal pressure (q_face..qmax over proj) about column face
        const M =
            ((q_face * proj ** 2) / 2 + ((qmax - q_face) * proj ** 2) / 3) * B;
        // one-way shear at d from the face
        const a = Math.max(proj - d / 1000, 0.0);
        const q_a = qmax - (qmax - qmin) * ((B - a) / B);
        const V = ((qmax + q_a) / 2) * a * B;
        best_M = Math.max(best_M, M);
        best_V = Math.max(best_V, V);
    }

    return { M: best_M, V: best_V, d };
}

function vrdc(I: Inputs, d: number, As_prov: number, b: number): number {
    const k = Math.min(1 + Math.sqrt(200 / d), 2.0);
    const rl = Math.min(As_prov / (b * d), 0.02);
    const vmin = 0.035 * k ** 1.5 * Math.sqrt(I.fck);

    return Math.max(0.12 * k * (100 * rl * I.fck) ** (1 / 3), vmin);
}

function designRebar(I: Inputs, B: number, h: number, M_ed: number): RebarPick {
    const d = h * 1000 - I.cnom - 12 / 2;
    let z: number, As_flex: number;

    if (M_ed > 0) {
        const K = (M_ed * 1e6) / (B * 1000 * d * d * I.fck);
        z = Math.min(
            0.95 * d,
            0.5 *
                d *
                (1 + Math.sqrt(Math.max(1 - (2 * K) / (I.acc / I.gammaC), 0))),
        );
        As_flex = (M_ed * 1e6) / (I.fyd * z);
    } else {
        z = 0.95 * d;
        As_flex = 0.0;
    }

    const As_min = Math.max((0.26 * I.fctm) / I.fyk, 0.0013) * (B * 1000) * d;
    const As_req = Math.max(As_flex, As_min);
    let As = 0,
        n = 0;

    for (const dia of [12, 16, 20, 25]) {
        for (const spc of [200, 175, 150, 125, 100]) {
            n = Math.floor((B * 1000 - 2 * I.cnom) / spc) + 1;
            As = (n * Math.PI * dia ** 2) / 4;

            if (
                As >= As_req &&
                Math.max(75, dia) <= spc &&
                spc <= Math.min(3 * h * 1000, 400)
            ) {
                return { As, dia, spc, n, As_req, As_flex, As_min, z, d };
            }
        }
    }

    return { As, dia: 25, spc: 100, n, As_req, As_flex, As_min, z, d };
}

function punching(I: Inputs, B: number, h: number, As_prov: number): Punching {
    const d = h * 1000 - I.cnom - 12;
    const u0 = 2 * (I.colX + I.colY) * 1000;
    const { qmax, qmin } = ulsPressures(I, B, h, 1);
    const q_av = (qmax + qmin) / 2;
    const VEd = q_av * B * B; // net column ULS load
    const c1 = I.colX * 1000,
        c2 = I.colY * 1000;
    const u1 = u0 + 2 * Math.PI * 2 * d;
    const W1 =
        (c1 * c1) / 2 +
        c1 * c2 +
        4 * c2 * d +
        16 * d * d +
        2 * Math.PI * d * c1;
    const M_t = I.gQ * I.F_Wx_k * h * 1e3; // kNmm (~ base moment)
    const k_t = 0.6; // Table 6.1, c1/c2 = 1
    const eMV = VEd > 0 ? M_t / VEd : 0.0;
    const beta = 1 + k_t * eMV * (u1 / W1);
    const v = 0.6 * (1 - I.fck / 250);
    const vRdmax = 0.5 * v * I.fcd;
    const vEd0 = (beta * VEd * 1e3) / (u0 * d);
    const a_crit = (2 * d) / 1000;
    const area_in = Math.min(
        (I.colX + 2 * a_crit) * (I.colY + 2 * a_crit),
        B * B,
    );
    const Vred = Math.max(VEd - q_av * area_in, 0.0);
    const vEd1 = (beta * Vred * 1e3) / (u1 * d);
    const vRdc = vrdc(I, d, As_prov, B * 1000);

    return { beta, u0, u1, W1, vEd0, vRdmax, vEd1, vRdc, VEd, d };
}

export function evaluate(I: Inputs, B: number, h: number): Result {
    const reasons: string[] = [];
    // rigidity: projection <= 2d (keeps rigid/linear-pressure assumptions valid)
    const d_avg = h * 1000 - I.cnom - 12;
    const proj = (B - I.colX) / 2;

    if (proj > (2 * d_avg) / 1000) {
        reasons.push('rigidity (projection>2d)');
    }

    // bearing (SLS peak)
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

    // sliding (governing combo)
    const sc1 = sliding(I, B, h, 1),
        sc2 = sliding(I, B, h, 2);

    if (Math.max(sc1.util, sc2.util) > 1.0) {
        reasons.push('sliding');
    }

    const np_util = slidingNoPassiveUtil(I, B, h);

    // overturning EQU
    const { util: equ_util, M_dst, M_stb } = overturning(I, B, h);

    if (equ_util > 1.0) {
        reasons.push('EQU');
    }

    // flexure + one-way shear + rebar
    const { M: M_Ed, V: V_Ed, d: d_b } = flexureShear(I, B, h);
    const bot = designRebar(I, B, h, M_Ed);
    const top = designRebar(I, B, h, 0.0);
    const V_Rdc = (vrdc(I, d_b, bot.As, B * 1000) * B * 1000 * d_b) / 1e3;

    if (V_Ed > V_Rdc) {
        reasons.push('one-way shear');
    }

    // punching
    const pu = punching(I, B, h, bot.As);

    if (pu.vEd0 > pu.vRdmax) {
        reasons.push('punching crushing');
    }

    if (pu.vEd1 > pu.vRdc) {
        reasons.push('punching perimeter');
    }

    if (h < 0.3) {
        reasons.push('h<300');
    }

    // settlement estimate (immediate elastic, rigid square)
    const Is = 0.82;
    const settlement =
        (((Fdz_sls / (B * B)) * B * (1 - I.nu_soil ** 2) * Is) / I.E_soil) *
        1000;

    // detailing
    const fctk05 = 0.7 * I.fctm;
    const fctd = (1.0 * fctk05) / I.gammaC;
    const fbd = 2.25 * 1.0 * 1.0 * fctd;
    const lb_rqd = (bot.dia / 4) * (I.fyd / fbd);
    const lbd = Math.max(0.7 * lb_rqd, 10 * bot.dia, 100);
    const l0 = 1.5 * lb_rqd;

    // quantities & carbon (bottom + top mesh, both ways)
    const L = B - (2 * I.cnom) / 1000;
    const mass_bot =
        ((2 * bot.n * ((Math.PI * bot.dia ** 2) / 4)) / 1e6) * L * I.rhoSteel;
    const mass_top =
        ((2 * top.n * ((Math.PI * top.dia ** 2) / 4)) / 1e6) * L * I.rhoSteel;
    const mass = (mass_bot + mass_top) * I.rebarUplift;
    const vol = B * B * h;
    const excav = B * B * (I.hSoil + h);
    const carbon_conc = vol * I.ecfConc;
    const carbon_rebar = mass * I.ecfRebar;
    let carbon = carbon_conc + carbon_rebar;

    if (I.includeExcavationCarbon) {
        carbon += excav * I.ecfExcav;
    }

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
        M_Ed,
        As_req: bot.As_req,
        As_min: bot.As_min,
        As_flex: bot.As_flex,
        bar_dia: bot.dia,
        bar_spc: bot.spc,
        As_prov: bot.As,
        z: bot.z,
        d_flex: bot.d,
        top_dia: top.dia,
        top_spc: top.spc,
        V_Ed,
        V_Rdc,
        punch: pu,
        lb_rqd,
        lbd,
        l0,
        fbd,
        vol_conc: vol,
        mass_rebar: mass,
        carbon_conc,
        carbon_rebar,
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
            'No feasible pad in the search range - widen B_max/h_max ' +
                'or relax inputs (e.g. includePassive, P_bearing).',
        );
    }

    return best;
}

// ---------------------------------------------------------------------
// SIZE (FAST) — for each B, scan up from h_min to the first feasible depth.
// Feasibility in h is an interval, NOT monotonic: one-way shear, punching
// and rigidity improve with depth, but bearing worsens (pad selfweight
// grows with h), so a B can be feasible at shallow depths yet infeasible
// at h_max — demanding feasibility at h_max (the old binary search) skips
// exactly the marginal-bearing widths that hold the minimum-carbon pad.
// Carbon at fixed B increases with h, so the first feasible h is that B's
// minimum-carbon depth; keep the best carbon across widths.
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
            'No feasible pad in the search range - widen B_max/h_max ' +
                'or relax inputs (e.g. includePassive, P_bearing).',
        );
    }

    return best;
}

// =====================================================================
// REPORTING
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
    p(' PAD FOUNDATION - STAGE 2 SIZING');
    p('='.repeat(64));
    p(
        ` Inputs : V=${I.F_Gz_k.toFixed(0)} kN  H=${I.F_Wx_k.toFixed(0)} kN  ` +
            `phi'=${I.phi_k.toFixed(0)}  delta=${I.delta_k.toFixed(0)}  ` +
            `P_bear=${I.P_bearing.toFixed(0)} kN/m2  passive=${I.includePassive ? 'on' : 'OFF'}`,
    );
    p('-'.repeat(64));
    p(
        ` SIZED PAD : ${r.B.toFixed(2)} m square x ${(Math.ceil((r.h * 1000) / 50) * 50).toFixed(0)} mm ` +
            `(computed ${(r.h * 1000).toFixed(0)} mm)`,
    );
    p(
        ` Bottom rft: ${r.bar_dia} mm @ ${r.bar_spc} c/c e.w.  (As=${r.As_prov.toFixed(0)} mm2)`,
    );
    p(` Top rft   : ${r.top_dia} mm @ ${r.top_spc} c/c e.w.  (min steel)`);
    p(
        ` Concrete  : ${r.vol_conc.toFixed(2)} m3      Rebar : ${r.mass_rebar.toFixed(0)} kg`,
    );
    p(
        ` CARBON A1-A3 : ${r.carbon.toFixed(0)} kgCO2e ` +
            `(conc ${r.carbon_conc.toFixed(0)} + rebar ${r.carbon_rebar.toFixed(0)})`,
    );
    p('-'.repeat(64));
    p(' Limit-state utilisations');
    line(
        'Bearing (SLS peak vs presumed)',
        r.qmax_sls / I.P_bearing,
        `qmax=${r.qmax_sls.toFixed(0)}  e=${(r.ex_sls * 1000).toFixed(0)}mm`,
    );
    line('Sliding DA1-C1 (passive incl.)', r.slide_c1.util);
    line(
        'Sliding DA1-C2 (passive incl.)',
        r.slide_c2.util,
        '<- usually governs depth',
    );
    p(
        `   !! Sliding C2 passive DISCOUNTED  ${r.slide_nopassive_util.toFixed(2).padStart(5)}  ` +
            `(robustness - confirm soil in front cannot be removed)`,
    );
    line('Overturning EQU', r.equ_util);
    line(
        'One-way shear',
        r.V_Ed / r.V_Rdc,
        `VEd=${r.V_Ed.toFixed(0)} VRdc=${r.V_Rdc.toFixed(0)} kN`,
    );
    line(
        'Punching face crushing',
        r.punch.vEd0 / r.punch.vRdmax,
        `beta=${r.punch.beta.toFixed(2)} vEd0=${r.punch.vEd0.toFixed(2)}`,
    );
    p('-'.repeat(64));
    p(' Added checks');
    p(
        `   Settlement (immediate, elastic est.) ~ ${r.settlement_mm.toFixed(1)} mm`,
    );
    p(
        r.As_min >= r.As_flex
            ? `   Flexure: M_Ed=${r.M_Ed.toFixed(0)} kNm  As_req=${r.As_req.toFixed(0)} ` +
                  `(flex ${r.As_flex.toFixed(0)} / min ${r.As_min.toFixed(0)}) -> min steel governs`
            : `   Flexure: M_Ed=${r.M_Ed.toFixed(0)} kNm  As_req=${r.As_req.toFixed(0)} mm2`,
    );
    p(
        `   Punching beta (EC2 6.4.3) = ${r.punch.beta.toFixed(2)}  (not the figure 1.5)`,
    );
    p(
        `   Anchorage l_bd ~ ${r.lbd.toFixed(0)} mm (bobbed) / ${r.lb_rqd.toFixed(0)} mm straight; ` +
            `lap l0 ~ ${r.l0.toFixed(0)} mm`,
    );
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
