import { describe, expect, it } from 'vitest';
import {
    Inputs,
    size,
    sizeFast,
} from '@/lib/portal-frame/foundation/sizers/pad-sizer';

describe('reinforced pad worked example (theory/pad_foundation.md)', () => {
    // 250 kN permanent + 150 kN wind on 150 kPa soil, C28/35, 12 mm bars.
    it('reproduces the sized 2.10 m x 675 mm pad at 1080 kgCO2e', () => {
        const r = size(new Inputs());

        expect(r.B).toBeCloseTo(2.1, 6);
        expect(r.h).toBeCloseTo(0.675, 6);
        expect(r.bar_dia).toBe(12);
        expect(r.bar_spc).toBe(125);
        expect(r.As_prov).toBeCloseTo(1923, 0);
        expect(r.vol_conc).toBeCloseTo(2.98, 2);
        expect(r.mass_rebar).toBeCloseTo(133, 0);
        expect(r.carbon).toBeCloseTo(1080, 0);
    });

    it('reproduces the documented limit-state utilisations', () => {
        const inputs = new Inputs();
        const r = size(inputs);

        expect(r.qmax_sls / inputs.P_bearing).toBeCloseTo(1.0, 2);
        expect(r.ex_sls * 1000).toBeCloseTo(272, 0);
        expect(r.Fdz_sls).toBeCloseTo(372.0, 1);
        expect(r.slide_c1.util).toBeCloseTo(0.83, 2);
        expect(r.slide_c2.util).toBeCloseTo(0.98, 2);
        expect(r.slide_nopassive_util).toBeCloseTo(1.8, 1);
        expect(r.equ_util).toBeCloseTo(0.43, 2);
        expect(r.As_min).toBeCloseTo(1870, 0);
        expect(r.settlement_mm).toBeCloseTo(5.3, 1);
    });
});

describe('pad sizeFast', () => {
    // Bearing worsens with depth (selfweight), so the marginal-bearing widths
    // are only feasible at shallow depths — the old binary search demanded
    // feasibility at h_max and skipped them, over-sizing the pad by ~50%+
    // carbon. The fast path must match the exhaustive oracle.
    it.each([[100], [120], [150], [200]])(
        'matches the exhaustive oracle at %i kPa presumed bearing',
        (bearingKpa) => {
            const inputs = new Inputs({
                F_Gz_k: 300,
                F_Wx_k: 30,
                P_bearing: bearingKpa,
            });
            const oracle = size(inputs);
            const fast = sizeFast(inputs);

            expect(fast.B).toBe(oracle.B);
            expect(fast.h).toBe(oracle.h);
            expect(fast.carbon).toBeCloseTo(oracle.carbon, 6);
        },
    );

    it('matches the oracle on the reference inputs', () => {
        const inputs = new Inputs();
        const oracle = size(inputs);
        const fast = sizeFast(inputs);

        expect(fast.B).toBe(oracle.B);
        expect(fast.h).toBe(oracle.h);
        expect(fast.carbon).toBeCloseTo(oracle.carbon, 6);
    });
});
