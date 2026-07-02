import { describe, expect, it } from 'vitest';
import { scorsBandForIntensity } from '@/lib/portal-frame/carbon/scors';

describe('scorsBandForIntensity', () => {
    it('maps intensities to the 50-point SCORS bands', () => {
        expect(scorsBandForIntensity(0)).toBe('A');
        expect(scorsBandForIntensity(149)).toBe('A');
        expect(scorsBandForIntensity(150)).toBe('B');
        expect(scorsBandForIntensity(199)).toBe('B');
        expect(scorsBandForIntensity(200)).toBe('C');
        expect(scorsBandForIntensity(250)).toBe('D');
        expect(scorsBandForIntensity(300)).toBe('E');
        expect(scorsBandForIntensity(341)).toBe('E');
        expect(scorsBandForIntensity(350)).toBe('F');
        expect(scorsBandForIntensity(400)).toBe('G');
        expect(scorsBandForIntensity(750)).toBe('G');
    });
});
