import { describe, expect, it } from 'vitest';
import {
    buildGableEndBracing,
    GABLE_ROOF_BRACE_RAFTER_FRACTION,
} from '@/lib/portal-frame/model/gable-bracing';
import { buildPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import { findChsSection } from '@/lib/portal-frame/sections/chs-sections';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

const braceSection = findChsSection('114.3x5.0 CHS');

describe('buildGableEndBracing', () => {
    it('returns no members when there is only one frame', () => {
        expect(buildGableEndBracing(1, 5, 12, 6, 7.26, braceSection)).toEqual(
            [],
        );
    });

    it('adds wall X-bracing and roof V-bracing on both gable ends', () => {
        const braces = buildGableEndBracing(3, 5, 12, 6, 7.26, braceSection);

        expect(braces).toHaveLength(16);

        const frontLeftWall = braces.filter((member) =>
            member.id.startsWith('gable-front-left-wall-'),
        );
        expect(frontLeftWall).toHaveLength(2);
        expect(frontLeftWall[0].start).toEqual([-12, 0, 0]);
        expect(frontLeftWall[0].end).toEqual([-12, 5, 6]);
        expect(frontLeftWall[1].start).toEqual([-12, 0, 6]);
        expect(frontLeftWall[1].end).toEqual([-12, 5, 0]);

        const frontLeftRoof = braces.filter((member) =>
            member.id.startsWith('gable-front-left-roof-'),
        );
        expect(frontLeftRoof).toHaveLength(2);
        expect(frontLeftRoof[0].start).toEqual([-12, 0, 6]);
        expect(frontLeftRoof[1].start).toEqual([0, 0, 7.26]);
        expect(frontLeftRoof[0].end).toEqual(frontLeftRoof[1].end);
        expect(frontLeftRoof[0].end).toEqual([
            -12 * (1 - GABLE_ROOF_BRACE_RAFTER_FRACTION),
            5,
            6 + GABLE_ROOF_BRACE_RAFTER_FRACTION * (7.26 - 6),
        ]);

        const rearRightWall = braces.filter((member) =>
            member.id.startsWith('gable-rear-right-wall-'),
        );
        expect(rearRightWall).toHaveLength(2);
        expect(rearRightWall[0].start).toEqual([12, 5, 0]);
        expect(rearRightWall[0].end).toEqual([12, 10, 6]);
    });
});

describe('buildPortalFrame gable bracing integration', () => {
    it('includes bracing members in the built frame', () => {
        const built = buildPortalFrame(defaultPortalFrameDesign());
        const braces = built.members.filter(
            (member) => member.role === 'brace',
        );

        expect(braces).toHaveLength(16);
        expect(
            braces.every((member) => member.section.name === '114.3x5.0 CHS'),
        ).toBe(true);
    });
});
