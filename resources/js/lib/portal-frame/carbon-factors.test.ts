import { describe, expect, it } from 'vitest';
import { carbonFactors } from '@/lib/portal-frame/carbon-factors';

describe('carbonFactors', () => {
    it('parses each material factor from the carbon factor sheet', () => {
        expect(carbonFactors.steelSection).toBe(1.61);
        expect(carbonFactors.galvanizedSteel).toBe(2.62);
        expect(carbonFactors.concrete).toBe(0.122);
        expect(carbonFactors.rebar).toBe(1.72);
    });

    it('keeps comma-laden material names from corrupting the factor column', () => {
        expect(Number.isFinite(carbonFactors.galvanizedSteel)).toBe(true);
        expect(Number.isFinite(carbonFactors.rebar)).toBe(true);
    });
});
