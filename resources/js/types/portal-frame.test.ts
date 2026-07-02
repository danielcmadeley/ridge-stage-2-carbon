import { describe, expect, it } from 'vitest';
import {
    defaultPortalFrameDesign,
    normalizePortalFrameDesign,
} from '@/types/portal-frame';

describe('normalizePortalFrameDesign', () => {
    it('fills missing foundation data from defaults', () => {
        const normalized = normalizePortalFrameDesign({
            span: 30,
            eavesHeight: 7,
            buildingLength: 50,
            baySpacing: 6,
            deadLoadKnM2: 1.5,
            liveLoadKnM2: 0.8,
            columnRestraint: 'unrestrained',
            roofPitchDeg: 8,
        });

        expect(normalized.span).toBe(30);
        expect(normalized.foundation.type).toBe('reinforced_pad');
        expect(normalized.foundation.assumptions.allowableBearingKpa).toBe(150);
    });

    it('preserves a complete design', () => {
        const design = defaultPortalFrameDesign();

        expect(normalizePortalFrameDesign(design)).toEqual(design);
    });
});
