import { describe, expect, it } from 'vitest';
import {
    Inputs,
    size,
    sizeFast,
} from '@/lib/portal-frame/foundation/sizers/pad-mass-sizer';

describe('mass pad worked example (theory/mass_fill.md)', () => {
    // 250 kN permanent + 150 kN wind on 150 kPa soil, C28/35 plain concrete.
    it('reproduces the sized 2.20 m x 750 mm pad at 1194 kgCO2e', () => {
        const r = size(new Inputs());

        expect(r.B).toBeCloseTo(2.2, 6);
        expect(r.h).toBeCloseTo(0.75, 6);
        expect(r.vol_conc).toBeCloseTo(3.63, 2);
        expect(r.carbon).toBeCloseTo(1194, 0);
        expect(r.qmax_sls).toBeCloseTo(144.6, 1);
        expect(r.plain_a).toBeCloseTo(950, 0);
        expect(r.plain_a_max).toBeCloseTo(952, 0);
        expect(r.slide_c1.util).toBeCloseTo(0.73, 2);
        expect(r.slide_c2.util).toBeCloseTo(0.87, 2);
        expect(r.slide_nopassive_util).toBeCloseTo(1.7, 1);
        expect(r.equ_util).toBeCloseTo(0.43, 2);
    });

    it('derives f_ctd,pl per EC2 cl.12.3.1', () => {
        const inputs = new Inputs();

        expect(inputs.f_ctd_pl).toBeCloseTo(1.03, 2);
    });
});

describe('mass pad sizeFast', () => {
    // Depth is demanded by sliding/EQU as well as the plain-footing rule, and
    // bearing worsens with depth — the old closed-form estimate (plain rule +
    // 8 bump-ups) over-sized by up to ~19% carbon and falsely reported
    // "infeasible" on heavy loads. These cases all diverged before the fix.
    it.each([
        [100, 150, 150],
        [150, 150, 250],
        [250, 220, 250],
        [400, 220, 100],
        [600, 150, 100],
        [900, 220, 150],
    ])(
        'matches the exhaustive oracle at G=%i kN, W=%i kN, bearing=%i kPa',
        (F_Gz_k, F_Wx_k, P_bearing) => {
            const inputs = new Inputs({ F_Gz_k, F_Wx_k, P_bearing });
            const oracle = size(inputs);
            const fast = sizeFast(inputs);

            expect(fast.B).toBe(oracle.B);
            expect(fast.h).toBe(oracle.h);
            expect(fast.carbon).toBeCloseTo(oracle.carbon, 6);
        },
    );

    it('matches the oracle on the reference inputs', () => {
        const oracle = size(new Inputs());
        const fast = sizeFast(new Inputs());

        expect(fast.B).toBe(oracle.B);
        expect(fast.h).toBe(oracle.h);
    });
});
