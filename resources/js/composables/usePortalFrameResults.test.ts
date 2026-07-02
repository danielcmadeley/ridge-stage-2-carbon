import { describe, expect, it } from 'vitest';
import { reactive } from 'vue';
import { usePortalFrameResults } from '@/composables/usePortalFrameResults';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('usePortalFrameResults', () => {
    it('derives frame, reactions, foundation sizing, and carbon for a valid design', () => {
        const design = reactive(defaultPortalFrameDesign());
        const results = usePortalFrameResults(() => design);

        expect(results.frameError.value).toBeNull();
        expect(results.resolvedFrame.value).not.toBeNull();
        expect(results.baseReactions.value).not.toBeNull();
        expect(results.foundationSizing.value).not.toBeNull();
        expect(
            results.foundationSizingEntries.value.map((entry) => entry.side),
        ).toEqual(['left', 'right']);
        expect(results.carbon.value?.totalCarbonKg).toBeGreaterThan(0);
    });

    it('degrades to nulls with an error message when the design is unbuildable', () => {
        const design = reactive(defaultPortalFrameDesign());
        design.baySpacing = 0;

        const results = usePortalFrameResults(() => design);

        expect(results.resolvedFrame.value).toBeNull();
        expect(results.frameError.value).toBe(
            'Bay spacing must be greater than zero.',
        );
        expect(results.baseReactions.value).toBeNull();
        expect(results.foundationSizing.value).toBeNull();
        expect(results.foundationSizingEntries.value).toEqual([]);
        expect(results.carbon.value).toBeNull();
    });

    it('recomputes when the design changes', () => {
        const design = reactive(defaultPortalFrameDesign());
        const results = usePortalFrameResults(() => design);
        const initialCarbon = results.carbon.value?.totalCarbonKg;

        design.buildingLength = design.buildingLength * 2;

        expect(results.carbon.value?.totalCarbonKg).toBeGreaterThan(
            initialCarbon ?? Number.POSITIVE_INFINITY,
        );
    });

    it('recomputes foundation sizing when the foundation type changes', () => {
        const design = reactive(defaultPortalFrameDesign());
        const results = usePortalFrameResults(() => design);
        const padDimensions = {
            ...results.foundationSizing.value!.left.dimensions,
        };

        design.foundation.type = 'mass_filled';

        expect(results.foundationSizing.value?.left.type).toBe('mass_filled');
        expect(
            results.foundationSizing.value?.left.checks.some((check) =>
                check.label.includes('Plain footing projection'),
            ),
        ).toBe(true);
        expect(results.foundationSizing.value?.left.dimensions).toEqual(
            padDimensions,
        );
        expect(results.carbon.value?.breakdown.rebar.massKg).toBe(0);

        design.foundation.type = 'two_pile_cap';

        expect(results.foundationSizing.value?.left.type).toBe('two_pile_cap');
        expect(results.foundationSizing.value?.left.dimensions).not.toEqual(
            padDimensions,
        );
        expect(results.carbon.value?.breakdown.rebar.massKg).toBeGreaterThan(
            0,
        );
    });
});
