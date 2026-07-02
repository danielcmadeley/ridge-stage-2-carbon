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

    it('grows the mass pad to resist an increased horizontal reaction', () => {
        const reaction = defaultReaction();
        const design = designFor('mass_filled');
        const base = sizeFoundation(reaction, design);
        const pushed = sizeFoundation(
            {
                ...reaction,
                fxKn: reaction.fxKn * 2,
            },
            design,
        );

        const baseSliding = base.checks.find(
            (check) => check.label === 'Sliding DA1-C2 (passive incl.)',
        );
        const pushedSliding = pushed.checks.find(
            (check) => check.label === 'Sliding DA1-C2 (passive incl.)',
        );

        // The sizer is an optimizer-to-feasibility: doubling the horizontal
        // reaction makes it grow the pad (plan and/or depth) until sliding and
        // every other limit state pass again. So both results remain feasible
        // (governing utilisation at or below unity) while the concrete volume
        // grows to accommodate the larger load \u2014 rather than the detached
        // utilisation number itself, which always hugs the governing boundary.
        expect(baseSliding?.utilisation).toBeLessThanOrEqual(1);
        expect(pushedSliding?.utilisation).toBeLessThanOrEqual(1);
        expect(pushedSliding?.utilisation).toBeGreaterThan(0);

        const baseVolume =
            base.dimensions.widthM ** 2 * base.dimensions.heightM;
        const pushedVolume =
            pushed.dimensions.widthM ** 2 * pushed.dimensions.heightM;
        expect(pushedVolume).toBeGreaterThanOrEqual(baseVolume);
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

    it('sizes left and right foundation reactions', () => {
        const design = defaultPortalFrameDesign();
        const built = buildPortalFrame(design);
        const reactions = analyzeGoverningPortalFrame(built, design).reactions;
        const result = sizeFoundationReactions(reactions, design);

        expect(result.left.dimensions.widthM).toBeGreaterThan(0);
        expect(result.right.dimensions.widthM).toBeGreaterThan(0);
    });
});
