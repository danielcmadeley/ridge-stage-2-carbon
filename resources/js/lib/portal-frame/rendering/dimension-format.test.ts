import { describe, expect, it } from 'vitest';
import { formatDimensionM } from '@/lib/portal-frame/rendering/dimension-format';

describe('formatDimensionM', () => {
    it('formats whole metres without decimals', () => {
        expect(formatDimensionM(24)).toBe('24 m');
        expect(formatDimensionM(6)).toBe('6 m');
    });

    it('trims trailing zeros for fractional metres', () => {
        expect(formatDimensionM(5.5)).toBe('5.5 m');
        expect(formatDimensionM(6.25)).toBe('6.25 m');
    });
});
