/**
 * Stage 2 TWO-PILE CAP sizer (embodied-carbon tool) — TypeScript port.
 *
 * A *sizer*, not a checker. Supply column loads (vertical + horizontal), the
 * pile working capacity, pile diameter and column size; the tool fixes the cap
 * plan from the pile geometry and searches the cap DEPTH for the minimum-carbon
 * section satisfying strut-and-tie, beam shear, node and pile-load limits.
 *
 * Codes: EC2:2004 + UK NA; pile spacing to BS 8004:2015 (>= 3*dia friction piles).
 * Piles excluded (separate geotechnical element) unless includePileCarbon = true.
 */

// =====================================================================
// INPUTS
// =====================================================================
export interface InputsConfig {
    // --- loads (kN) ---
    N_G?: number; // permanent (dead) vertical column load
    N_Q?: number; // variable (imposed) vertical column load
    Fvx_G?: number; // permanent horizontal shear at column base (x)
    Fvx_Q?: number; // variable horizontal shear (x)
    M_G?: number; // applied permanent column moment about y-y (kNm)
    M_Q?: number; // applied variable column moment about y-y (kNm)
    colEcc?: number; // column eccentricity along pile line (mm)

    // --- pile / column / geometry ---
    pileCapacity?: number; // kN working (service) capacity per pile
    pileDia?: number; // mm
    colX?: number; // mm column dim along the pile line (spanning dir)
    colY?: number; // mm column dim transverse
    overhang?: number; // mm cap edge beyond pile face
    spacingFactor?: number; // pile c/c spacing = factor * dia (BS 8004 >= 3)

    // --- materials / cover ---
    fck?: number;
    fyk?: number;
    gammaC_density?: number; // kN/m3 concrete density
    gammaC?: number; // partial factor concrete
    acc?: number;
    coverBot?: number; // mm (piles)
    coverSide?: number;
    coverTop?: number;
    barTie?: number; // mm assumed main tie bar (for lever arm d)

    // --- load factors ---
    gG?: number;
    gQ?: number;

    // --- carbon (A1-A3) ---
    ecfConc?: number; // kgCO2e/m3  C28/35
    ecfRebar?: number; // kgCO2e/kg  UK EAF rebar
    rebarRate?: number; // kg/m3 Stage-2 reinforcement rate for caps
    rhoSteel?: number;
    includePileCarbon?: boolean;
    pileLength?: number; // m (only if includePileCarbon)
    ecfPileConc?: number;

    // --- engine config ---
    strutAngleMin?: number; // deg, strut-to-tie (from horizontal)
    D_step?: number; // m
    D_max?: number; // m
}

export class Inputs {
    // loads
    N_G = 600;
    N_Q = 400;
    Fvx_G = 60;
    Fvx_Q = 40;
    M_G = 0;
    M_Q = 0;
    colEcc = 0;
    // pile / column / geometry
    pileCapacity = 600;
    pileDia = 450;
    colX = 500;
    colY = 300;
    overhang = 150;
    spacingFactor = 3.0;
    // materials / cover
    fck = 28;
    fyk = 500;
    gammaC_density = 25;
    gammaC = 1.5;
    acc = 0.85;
    coverBot = 75;
    coverSide = 50;
    coverTop = 50;
    barTie = 25;
    // load factors
    gG = 1.35;
    gQ = 1.5;
    // carbon
    ecfConc = 329;
    ecfRebar = 0.76;
    rebarRate = 110;
    rhoSteel = 7850;
    includePileCarbon = false;
    pileLength = 12;
    ecfPileConc = 329;
    // engine config
    strutAngleMin = 45;
    D_step = 0.025;
    D_max = 2.0;

    // derived (computed in constructor)
    readonly fcd: number;
    readonly fyd: number;
    readonly s: number; // pile spacing (mm)
    readonly Lx: number; // long dim (mm)
    readonly Ly: number; // short dim (mm)

    constructor(cfg: InputsConfig = {}) {
        Object.assign(this, cfg);
        this.fcd = (this.acc * this.fck) / this.gammaC;
        this.fyd = 0.87 * this.fyk;
        this.s = this.spacingFactor * this.pileDia;
        this.Lx = this.s + this.pileDia + 2 * this.overhang;
        this.Ly = this.pileDia + 2 * this.overhang;
    }
}

// =====================================================================
// RESULT
// =====================================================================
export interface Result {
    feasible: boolean;
    D: number;
    d: number;
    Lx: number;
    Ly: number;
    s: number;
    selfweight: number;
    P_serv_max: number;
    P_ult_max: number;
    M_serv: number;
    M_ult: number;
    tie_force: number;
    As_tie_req: number;
    tie_dia: number;
    tie_n: number;
    As_tie_prov: number;
    shear_av: number;
    shear_beta: number;
    V_red: number;
    V_Rdc: number;
    shear_util: number;
    VRd_max: number;
    ccc_sed: number;
    ccc_srd: number;
    cct_force: number;
    cct_cap: number;
    punch_util: number;
    strut_angle: number;
    vol_conc: number;
    mass_rebar: number;
    carbon_conc: number;
    carbon_rebar: number;
    carbon_pile: number;
    carbon: number;
    reasons: string[];
}

// =====================================================================
// ENGINE
// =====================================================================
interface GeoLoads {
    selfweight: number;
    M_serv: number;
    M_ult: number;
    N_ult_net: number;
    P_serv_max: number;
    P_ult_max: number;
}

function geometryLoads(I: Inputs, D: number): GeoLoads {
    const vol = (I.Lx / 1000) * (I.Ly / 1000) * D; // m3
    const selfweight = vol * I.gammaC_density; // kN
    // moment about cap centre = applied moment + horizontal shear * cap depth + ecc*N
    const M_serv =
        I.M_G +
        I.M_Q +
        (I.Fvx_G + I.Fvx_Q) * D +
        ((I.N_G + I.N_Q) * I.colEcc) / 1000;
    const M_ult =
        I.gG * I.M_G +
        I.gQ * I.M_Q +
        (I.gG * I.Fvx_G + I.gQ * I.Fvx_Q) * D +
        ((I.gG * I.N_G + I.gQ * I.N_Q) * I.colEcc) / 1000;
    const N_serv = I.N_G + I.N_Q + selfweight;
    const N_ult = I.gG * (I.N_G + selfweight) + I.gQ * I.N_Q;
    const N_ult_net = I.gG * I.N_G + I.gQ * I.N_Q; // excl. selfweight
    const s_m = I.s / 1000;
    const P_serv_max = N_serv / 2 + Math.abs(M_serv) / s_m; // P = N/n +/- M/s (2 piles)
    const P_ult_max = N_ult / 2 + Math.abs(M_ult) / s_m;

    return { selfweight, M_serv, M_ult, N_ult_net, P_serv_max, P_ult_max };
}

interface TieResult {
    T: number;
    As_req: number;
    dia: number;
    n: number;
    As: number;
}

function tieSteel(I: Inputs, d: number, P_ult_max: number): TieResult {
    // CIRIA/Reynolds tie force: T = F*(3*l^2 - a^2)/(12*l*d), F = 2*max pile reaction
    const F = 2 * P_ult_max; // kN
    const l = I.s,
        a = I.colX;
    const T = (F * (3 * l ** 2 - a ** 2)) / (12 * l * d); // kN
    const As_req = (T * 1000) / I.fyd; // mm2
    let n = 2,
        As = 0,
        dia = 40;

    for (const tryDia of [16, 20, 25, 32, 40]) {
        n = Math.max(2, Math.ceil(As_req / ((Math.PI * tryDia ** 2) / 4)));
        As = (n * Math.PI * tryDia ** 2) / 4;
        dia = tryDia;

        if (As >= As_req && n <= 12) {
            return { T, As_req, dia, n, As };
        }
    }

    return { T, As_req, dia: 40, n, As };
}

function vrdcStress(I: Inputs, d: number, As: number, b: number): number {
    const k = Math.min(1 + Math.sqrt(200 / d), 2.0);
    const rho = Math.min(As / (b * d), 0.02);
    const vmin = 0.035 * k ** 1.5 * Math.sqrt(I.fck);

    return Math.max(0.12 * k * (100 * rho * I.fck) ** (1 / 3), vmin);
}

export function evaluate(I: Inputs, D: number): Result {
    const reasons: string[] = [];
    const d = D * 1000 - I.coverBot - I.barTie / 2; // effective depth (mm)
    const gl = geometryLoads(I, D);
    const { P_serv_max, P_ult_max } = gl;

    // pile capacity (service, incl. moment)
    if (P_serv_max > I.pileCapacity) {
        reasons.push('pile capacity (load/pile > capacity)');
    }

    // tie steel
    const tie = tieSteel(I, d, P_ult_max);

    // strut angle (node under column centre -> node over pile)
    const strut_angle = (Math.atan(d / (I.s / 2)) * 180) / Math.PI;

    if (strut_angle < I.strutAngleMin) {
        reasons.push(
            `strut angle ${strut_angle.toFixed(0)}deg < ${I.strutAngleMin.toFixed(0)}`,
        );
    }

    // beam shear with EC2 6.2.2(6) enhancement
    const av = I.s / 2 - I.colX / 2; // column face -> pile centre
    const beta_enh = Math.min(av / (2 * d), 1.0);
    const V_red = P_ult_max * beta_enh; // kN
    const vRdc = vrdcStress(I, d, tie.As, I.Ly);
    const V_Rdc = (vRdc * I.Ly * d) / 1000; // kN
    const shear_util = V_red / V_Rdc;

    if (shear_util > 1.0) {
        reasons.push('beam shear');
    }

    // max shear (strut crushing limit)
    const v = 0.6 * (1 - I.fck / 250);
    const VRd_max = (0.5 * I.Ly * d * v * I.fcd) / 1000;

    if (P_ult_max > VRd_max) {
        reasons.push('VRd,max (strut crushing)');
    }

    // CCC node at column face
    const vprime = 1 - I.fck / 250;
    const ccc_sed = (gl.N_ult_net * 1000) / (I.colX * I.colY); // N/mm2
    const ccc_srd = 1.0 * vprime * I.fcd;

    if (ccc_sed > ccc_srd) {
        reasons.push('CCC node (column)');
    }

    // CCT node over pile
    const cct_force = P_ult_max;
    const cct_cap =
        (((Math.PI * I.pileDia ** 2) / 4) * 0.85 * vprime * I.fcd) / 1000; // kN

    if (cct_force > cct_cap) {
        reasons.push('CCT node (pile)');
    }

    // column punching (rarely governs) - face stress vs vRd,max
    const u0 = 2 * (I.colX + I.colY);
    const punch_util = VRd_max
        ? (1.15 * gl.N_ult_net * 1000) / (u0 * d) / VRd_max
        : 9;

    if (punch_util > 1.0) {
        reasons.push('punching');
    }

    // practical minimum depth (anchorage / rigidity): D >= 2*pile_dia for small piles
    if (D < (2 * I.pileDia) / 1000) {
        reasons.push('D < 2*pile_dia (practical min)');
    }

    // quantities & carbon
    const vol = (I.Lx / 1000) * (I.Ly / 1000) * D;
    const mass_rebar = I.rebarRate * vol;
    const carbon_conc = vol * I.ecfConc;
    const carbon_rebar = mass_rebar * I.ecfRebar;
    let carbon_pile = 0;

    if (I.includePileCarbon) {
        const pile_vol =
            ((2 * Math.PI * (I.pileDia / 1000) ** 2) / 4) * I.pileLength;
        carbon_pile =
            pile_vol * I.ecfPileConc + pile_vol * I.rebarRate * I.ecfRebar;
    }

    const carbon = carbon_conc + carbon_rebar + carbon_pile;

    return {
        feasible: reasons.length === 0,
        D,
        d,
        Lx: I.Lx,
        Ly: I.Ly,
        s: I.s,
        selfweight: gl.selfweight,
        P_serv_max,
        P_ult_max,
        M_serv: gl.M_serv,
        M_ult: gl.M_ult,
        tie_force: tie.T,
        As_tie_req: tie.As_req,
        tie_dia: tie.dia,
        tie_n: tie.n,
        As_tie_prov: tie.As,
        shear_av: av,
        shear_beta: beta_enh,
        V_red,
        V_Rdc,
        shear_util,
        VRd_max,
        ccc_sed,
        ccc_srd,
        cct_force,
        cct_cap,
        punch_util,
        strut_angle,
        vol_conc: vol,
        mass_rebar,
        carbon_conc,
        carbon_rebar,
        carbon_pile,
        carbon,
        reasons,
    };
}

// ---------------------------------------------------------------------
// SIZE — original linear sweep (kept for 1:1 parity with the Python ref)
// ---------------------------------------------------------------------
export function size(I: Inputs): Result {
    let best: Result | null = null;
    const D_min = 0.3;
    const n = Math.round((I.D_max - D_min) / I.D_step) + 1;

    for (let i = 0; i < n; i++) {
        const D = Math.round((D_min + i * I.D_step) * 1000) / 1000;
        const r = evaluate(I, D);

        if (r.feasible && (best === null || r.carbon < best.carbon)) {
            best = r;
        }
    }

    if (best === null) {
        throw new Error(
            'No feasible 2-pile cap in depth range. Likely pile capacity exceeded ' +
                '(need >2 piles) or strut/shear cannot be met - check inputs.',
        );
    }

    return best;
}

// ---------------------------------------------------------------------
// SIZE (FAST) — bottom-up scan to the first feasible depth.
// Feasibility in D is an interval, NOT monotonic: shear, strut angle and
// anchorage improve with depth, but the service pile load worsens (cap
// selfweight and the Fvx*D moment both grow with D), so a cap can be
// feasible at 0.9 m yet infeasible at D_max. Carbon increases with D
// (concrete dominates), so the first feasible depth from the bottom of
// the grid is the minimum-carbon section.
// ---------------------------------------------------------------------
export function sizeFast(I: Inputs): Result {
    const D_min = 0.3;
    const steps = Math.round((I.D_max - D_min) / I.D_step);

    for (let i = 0; i <= steps; i++) {
        const D = Math.round((D_min + i * I.D_step) * 1000) / 1000;
        const r = evaluate(I, D);

        if (r.feasible) {
            return r;
        }
    }

    throw new Error(
        'No feasible 2-pile cap in depth range. Likely pile capacity exceeded ' +
            '(need >2 piles) or strut/shear cannot be met - check inputs.',
    );
}

function worstUtilisation(I: Inputs, r: Result): number {
    return Math.max(
        r.P_serv_max / I.pileCapacity,
        r.shear_util,
        r.P_ult_max / r.VRd_max,
        r.ccc_sed / r.ccc_srd,
        r.cct_force / r.cct_cap,
        r.punch_util,
        I.strutAngleMin / Math.max(r.strut_angle, 1e-9),
        (2 * I.pileDia) / 1000 / r.D,
    );
}

// ---------------------------------------------------------------------
// SIZE (BEST EFFORT) — the minimum-carbon feasible depth when one exists;
// otherwise the least-overstressed depth on the grid, so callers can show
// an honest near-miss (with its failing checks) instead of an arbitrary
// full-depth cap.
// ---------------------------------------------------------------------
export function sizeBestEffort(I: Inputs): Result {
    const D_min = 0.3;
    const steps = Math.round((I.D_max - D_min) / I.D_step);
    let leastBad: Result | null = null;
    let leastBadUtil = Number.POSITIVE_INFINITY;

    for (let i = 0; i <= steps; i++) {
        const D = Math.round((D_min + i * I.D_step) * 1000) / 1000;
        const r = evaluate(I, D);

        if (r.feasible) {
            return r;
        }

        const util = worstUtilisation(I, r);

        if (util < leastBadUtil) {
            leastBadUtil = util;
            leastBad = r;
        }
    }

    return leastBad!;
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
            `   ${flag}${name.padEnd(32)}${val.toFixed(2).padStart(6)}  ${extra}`,
        );
    };
    p('='.repeat(66));
    p(' TWO-PILE CAP - STAGE 2 SIZING');
    p('='.repeat(66));
    p(
        ` Inputs : N=${I.N_G.toFixed(0)}G+${I.N_Q.toFixed(0)}Q kN  ` +
            `Fvx=${I.Fvx_G.toFixed(0)}G+${I.Fvx_Q.toFixed(0)}Q kN  ` +
            `pile cap.=${I.pileCapacity.toFixed(0)} kN  dia=${I.pileDia.toFixed(0)}  ` +
            `col=${I.colX.toFixed(0)}x${I.colY.toFixed(0)}`,
    );
    p('-'.repeat(66));
    p(
        ` SIZED CAP : ${r.Lx.toFixed(0)} x ${r.Ly.toFixed(0)} x ${(r.D * 1000).toFixed(0)} mm deep ` +
            `(2 piles @ ${r.s.toFixed(0)} c/c)   d=${r.d.toFixed(0)} mm`,
    );
    p(
        ` Main tie  : T=${r.tie_force.toFixed(0)} kN -> As_req=${r.As_tie_req.toFixed(0)} mm2 ` +
            `-> ${r.tie_n}B${r.tie_dia} (${r.As_tie_prov.toFixed(0)} mm2)`,
    );
    p(
        ` Concrete  : ${r.vol_conc.toFixed(2)} m3   Rebar (rate ${I.rebarRate.toFixed(0)} kg/m3): ` +
            `${r.mass_rebar.toFixed(0)} kg`,
    );
    p(
        ` CARBON A1-A3 (cap only) : ${(r.carbon - r.carbon_pile).toFixed(0)} kgCO2e ` +
            `(conc ${r.carbon_conc.toFixed(0)} + rebar ${r.carbon_rebar.toFixed(0)})`,
    );

    if (I.includePileCarbon) {
        p(
            `   + piles : ${r.carbon_pile.toFixed(0)} kgCO2e  -> total ${r.carbon.toFixed(0)}`,
        );
    }

    p('-'.repeat(66));
    p(' Pile reactions');
    p(
        `   Service max : ${r.P_serv_max.toFixed(0)} kN  (cap ${I.pileCapacity.toFixed(0)}) ` +
            `util ${(r.P_serv_max / I.pileCapacity).toFixed(2)}   M_serv=${r.M_serv.toFixed(0)} kNm`,
    );
    p(
        `   Ultimate max: ${r.P_ult_max.toFixed(0)} kN   M_ult=${r.M_ult.toFixed(0)} kNm`,
    );
    p(' Limit-state utilisations');
    line('Pile capacity (service)', r.P_serv_max / I.pileCapacity);
    line(
        'Beam shear (enhanced)',
        r.shear_util,
        `av=${r.shear_av.toFixed(0)} beta=${r.shear_beta.toFixed(2)} ` +
            `Vred=${r.V_red.toFixed(0)}/VRdc=${r.V_Rdc.toFixed(0)}`,
    );
    line('Strut crushing VRd,max', r.P_ult_max / r.VRd_max);
    line(
        'CCC node (column)',
        r.ccc_sed / r.ccc_srd,
        `${r.ccc_sed.toFixed(1)}/${r.ccc_srd.toFixed(1)} N/mm2`,
    );
    line(
        'CCT node (pile)',
        r.cct_force / r.cct_cap,
        `${r.cct_force.toFixed(0)}/${r.cct_cap.toFixed(0)} kN`,
    );
    line('Column punching', r.punch_util);
    p(
        `   .. strut angle = ${r.strut_angle.toFixed(0)} deg ` +
            `(>= ${I.strutAngleMin.toFixed(0)} req'd)`,
    );
    p('-'.repeat(66));
    p(' NOTE: cap only - piles excluded (separate geotechnical element).');
    p(
        '       Rebar carbon uses a Stage-2 rate; tie steel above is the design check.',
    );

    if (r.reasons.length) {
        p(` FLAGS: ${JSON.stringify(r.reasons)}`);
    }

    p('='.repeat(66));

    return out.join('\n');
}
