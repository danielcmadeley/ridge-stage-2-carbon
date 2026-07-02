import { describe, expect, it } from 'vitest';
import { analyzeGoverningPortalFrame } from '@/lib/portal-frame/analysis/frame-analysis';
import type { SupportReaction } from '@/lib/portal-frame/analysis/frame-analysis';
import {
    sizeFoundation,
    sizeFoundationReactions,
} from '@/lib/portal-frame/foundation/foundation-sizing';
import { buildPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import { defaultPortalFrameDesign } from '@/types/portal-frame';
import type { FoundationType, PortalFrameDesign } from '@/types/portal-frame';

function defaultReaction(): SupportReaction {
    const design = defaultPortalFrameDesign();
    const built = buildPortalFrame(design);

    return analyzeGoverningPortalFrame(built, design).reactions.left;
}

function designFor(type: FoundationType): PortalFrameDesign {
    return {
        ...defaultPortalFrameDesign(),
        foundation: { ...defaultPortalFrameDesign().foundation, type },
    };
}

describe('sizeFoundation', () => {
    it('sizes each foundation type from the default frame reaction', () => {
        const reaction = defaultReaction();

        for (const type of [
            'two_pile_cap',
            'reinforced_pad',
            'mass_filled',
        ] satisfies FoundationType[]) {
            const result = sizeFoundation(reaction, designFor(type));

            expect(result.type).toBe(type);
            expect(result.dimensions.widthM).toBeGreaterThan(0);
            expect(result.dimensions.depthM).toBeGreaterThan(0);
            expect(result.dimensions.heightM).toBeGreaterThan(0);
            expect(result.checks.length).toBeGreaterThan(0);
            expect(
                result.checks.every((check) =>
                    Number.isFinite(check.utilisation),
                ),
            ).toBe(true);
        }
    });

    it('increases pad area when the vertical reaction increases', () => {
        const reaction: SupportReaction = {
            fxKn: 0,
            fzKn: 120,
            momentKnm: 0,
        };
        const design = designFor('reinforced_pad');
        const base = sizeFoundation(reaction, design);
        const heavier = sizeFoundation(
            {
                ...reaction,
                fzKn: reaction.fzKn * 4,
            },
            design,
        );

        expect(
            heavier.dimensions.widthM * heavier.dimensions.depthM,
        ).toBeGreaterThan(base.dimensions.widthM * base.dimensions.depthM);
    });

    it('increases pile utilisation when the vertical reaction increases', () => {
        const reaction = defaultReaction();
        const design = designFor('two_pile_cap');
        const base = sizeFoundation(reaction, design);
        const heavier = sizeFoundation(
            {
                ...reaction,
                fzKn: reaction.fzKn * 2,
            },
            design,
        );

        expect(heavier.checks[0].utilisation).toBeGreaterThan(
            base.checks[0].utilisation,
        );
    });

    it('uses two 450 mm diameter piles at 6 m depth with 3D spacing', () => {
        const result = sizeFoundation(
            defaultReaction(),
            designFor('two_pile_cap'),
        );

        expect(result.pileCap?.pileCount).toBe(2);
        expect(result.pileCap?.pileDiameterM).toBe(0.45);
        expect(result.pileCap?.pileDepthM).toBe(6);
        expect(result.pileCap?.pileSpacingM).toBeCloseTo(0.45 * 3);
    });

    it('grows the mass pad when wind exposure increases with eaves height', () => {
        const reaction = defaultReaction();
        const lowDesign = {
            ...designFor('mass_filled'),
            eavesHeight: 4,
        };
        const highDesign = {
            ...designFor('mass_filled'),
            eavesHeight: 10,
        };
        const low = sizeFoundation(reaction, lowDesign);
        const high = sizeFoundation(reaction, highDesign);

        const lowVolume = low.dimensions.widthM ** 2 * low.dimensions.heightM;
        const highVolume =
            high.dimensions.widthM ** 2 * high.dimensions.heightM;

        expect(highVolume).toBeGreaterThan(lowVolume);
    });

    it('handles pinned-base moments without invalid values', () => {
        const reaction: SupportReaction = {
            fxKn: 20,
            fzKn: 120,
            momentKnm: 0,
        };
        const result = sizeFoundation(reaction, designFor('two_pile_cap'));

        // P = N/2 (M=0) plus half the cap self-weight -> comfortably above 60,
        // never negative, never infinite even with no base moment.
        expect(result.pileCap?.pileCompressionKn).toBeGreaterThan(60);
        expect(Number.isFinite(result.pileCap?.pileCompressionKn ?? NaN)).toBe(
            true,
        );
        expect(result.pileCap?.pileTensionKn).toBeGreaterThanOrEqual(0);
        expect(
            result.checks.every((check) => Number.isFinite(check.utilisation)),
        ).toBe(true);
    });

    it('matches reinforced pad and mass-filled geometry at moderate portal frame reactions', () => {
        const reaction = defaultReaction();
        const pad = sizeFoundation(reaction, designFor('reinforced_pad'));
        const mass = sizeFoundation(reaction, designFor('mass_filled'));

        expect(pad.dimensions).toEqual(mass.dimensions);
        expect(
            mass.checks.find(
                (check) => check.label === 'Plain footing projection a ≤ a_max',
            )?.utilisation,
        ).toBeLessThan(1);
    });

    it('sizes mass-filled larger than reinforced pad under heavy column loads', () => {
        const reaction: SupportReaction = {
            fxKn: 0,
            fzKn: 250,
            momentKnm: 0,
        };
        const heavyDesign = {
            ...designFor('reinforced_pad'),
            eavesHeight: 10,
            span: 40,
        };
        const pad = sizeFoundation(reaction, heavyDesign);
        const mass = sizeFoundation(reaction, {
            ...heavyDesign,
            foundation: {
                ...heavyDesign.foundation,
                type: 'mass_filled' as const,
            },
        });

        expect(mass.dimensions.widthM).toBeGreaterThan(pad.dimensions.widthM);
        expect(mass.dimensions.heightM).toBeGreaterThan(pad.dimensions.heightM);
        expect(
            mass.checks.find(
                (check) => check.label === 'Plain footing projection a ≤ a_max',
            )?.utilisation,
        ).toBeGreaterThan(0.95);
    });

    it('sizes left and right foundation reactions', () => {
        const design = defaultPortalFrameDesign();
        const built = buildPortalFrame(design);
        const reactions = analyzeGoverningPortalFrame(built, design).reactions;
        const result = sizeFoundationReactions(reactions, design);

        expect(result.left.dimensions.widthM).toBeGreaterThan(0);
        expect(result.right.dimensions.widthM).toBeGreaterThan(0);
    });
});
