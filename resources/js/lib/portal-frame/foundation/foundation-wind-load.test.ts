import { describe, expect, it } from 'vitest';
import { analyzeGoverningPortalFrame } from '@/lib/portal-frame/analysis/frame-analysis';
import { foundationWindLoadKn } from '@/lib/portal-frame/foundation/foundation-wind-load';
import { sizeFoundation } from '@/lib/portal-frame/foundation/foundation-sizing';
import { buildPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('foundationWindLoadKn', () => {
    it('decreases when eaves height decreases', () => {
        const base = defaultPortalFrameDesign();
        const low = foundationWindLoadKn({ ...base, eavesHeight: 3 });
        const high = foundationWindLoadKn({ ...base, eavesHeight: 10 });

        expect(low).toBeGreaterThan(0);
        expect(low).toBeLessThan(high);
    });

    it('uses building height for wind rather than the frame horizontal reaction', () => {
        const design = { ...defaultPortalFrameDesign(), eavesHeight: 3 };
        const built = buildPortalFrame(design);
        const reaction = analyzeGoverningPortalFrame(
            built,
            design,
        ).reactions.left;

        expect(foundationWindLoadKn(design)).toBeLessThan(
            Math.abs(reaction.fxKn),
        );
    });
});

describe('foundation sizing vs eaves height', () => {
    it('shrinks reinforced pads when eaves height is reduced', () => {
        const base = defaultPortalFrameDesign();
        const built = buildPortalFrame(base);
        const reaction = analyzeGoverningPortalFrame(built, base).reactions.left;
        const design = {
            ...base,
            foundation: {
                ...base.foundation,
                type: 'reinforced_pad' as const,
            },
        };

        const lowEaves = sizeFoundation(reaction, {
            ...design,
            eavesHeight: 3,
        });
        const highEaves = sizeFoundation(reaction, {
            ...design,
            eavesHeight: 10,
        });

        const lowVolume =
            lowEaves.dimensions.widthM ** 2 * lowEaves.dimensions.heightM;
        const highVolume =
            highEaves.dimensions.widthM ** 2 * highEaves.dimensions.heightM;

        expect(lowVolume).toBeLessThan(highVolume);
    });
});
