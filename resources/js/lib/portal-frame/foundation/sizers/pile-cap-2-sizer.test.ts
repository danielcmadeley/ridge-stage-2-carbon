import { describe, expect, it } from 'vitest';
import {
    Inputs,
    size,
    sizeBestEffort,
    sizeFast,
} from '@/lib/portal-frame/foundation/sizers/pile-cap-2-sizer';

describe('pile cap worked example (theory/pile_cap.md)', () => {
    // 600G + 400Q kN vertical, 60G + 40Q kN shear, 600 kN piles at 450 mm dia.
    it('reproduces the sized 2100 x 750 x 925 mm cap at 601 kgCO2e', () => {
        const r = size(new Inputs());

        expect(r.D).toBeCloseTo(0.925, 6);
        expect(r.Lx).toBe(2100);
        expect(r.Ly).toBe(750);
        expect(r.s).toBe(1350);
        expect(r.tie_n).toBe(8);
        expect(r.tie_dia).toBe(16);
        expect(r.As_tie_req).toBeCloseTo(1461, 0);
        expect(r.vol_conc).toBeCloseTo(1.46, 2);
        expect(r.carbon).toBeCloseTo(601, 0);
    });

    it('reproduces the documented pile reactions and shear utilisation', () => {
        const inputs = new Inputs();
        const r = size(inputs);

        expect(r.P_serv_max).toBeCloseTo(586.7, 1);
        expect(r.P_ult_max).toBeCloseTo(826.2, 1);
        expect(r.P_serv_max / inputs.pileCapacity).toBeCloseTo(0.98, 2);
        expect(r.shear_util).toBeCloseTo(0.97, 2);
        expect(r.strut_angle).toBeGreaterThanOrEqual(45);
    });
});

describe('pile cap sizeFast', () => {
    it('matches the exhaustive oracle on the reference inputs', () => {
        const inputs = new Inputs();
        const oracle = size(inputs);
        const fast = sizeFast(inputs);

        expect(fast.D).toBe(oracle.D);
        expect(fast.carbon).toBeCloseTo(oracle.carbon, 6);
    });

    it('finds the shallow feasible cap when high horizontal shear makes deep caps infeasible', () => {
        // The Fvx*D moment overloads the piles at large D, so feasibility is an
        // interval — the old binary search demanded feasibility at D_max and
        // wrongly reported "no feasible cap".
        const inputs = new Inputs({
            N_G: 600,
            N_Q: 300,
            Fvx_G: 100,
            Fvx_Q: 80,
            pileCapacity: 600,
        });
        const oracle = size(inputs);
        const fast = sizeFast(inputs);

        expect(oracle.feasible).toBe(true);
        expect(fast.D).toBe(oracle.D);
        expect(fast.D).toBeLessThan(1.0);
    });
});

describe('pile cap sizeBestEffort', () => {
    it('returns the min-carbon feasible depth when one exists', () => {
        const inputs = new Inputs();
        const bestEffort = sizeBestEffort(inputs);
        const oracle = size(inputs);

        expect(bestEffort.feasible).toBe(true);
        expect(bestEffort.D).toBe(oracle.D);
    });

    it('returns the least-overstressed depth instead of D_max when nothing is feasible', () => {
        // Tiny pile capacity: infeasible at every depth. The honest answer is
        // the shallow depth that minimises pile load, not the deepest cap.
        const inputs = new Inputs({ N_G: 900, N_Q: 600, pileCapacity: 400 });
        const bestEffort = sizeBestEffort(inputs);

        expect(bestEffort.feasible).toBe(false);
        expect(bestEffort.reasons).toContain(
            'pile capacity (load/pile > capacity)',
        );
        expect(bestEffort.D).toBeLessThan(inputs.D_max);
    });
});
