import { describe, expect, it } from 'vitest';
import { findChsSection } from '@/lib/portal-frame/sections/chs-sections';

describe('findChsSection', () => {
    it('loads 114.3x5.0 CHS from the catalog', () => {
        const section = findChsSection('114.3x5.0 CHS');

        expect(section).toMatchObject({
            profile: 'chs',
            name: '114.3x5.0 CHS',
            d: 114.3,
            t: 5,
            areaCm2: 17.2,
            massPerMKg: 13.5,
        });
    });

    it('accepts diameter and thickness without the CHS suffix', () => {
        expect(findChsSection('114.3x5.0').name).toBe('114.3x5.0 CHS');
    });
});
