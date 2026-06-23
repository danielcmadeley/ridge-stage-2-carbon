import { describe, expect, it } from 'vitest';
import { buildPortalFrame } from '@/lib/portal-frame/geometry-builder';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('buildPortalFrame', () => {
    it('adds longitudinal UB 203 eaves ties along each side of the building', () => {
        const built = buildPortalFrame(defaultPortalFrameDesign());
        const ties = built.members.filter((member) => member.role === 'tie');

        expect(ties).toHaveLength(2);

        const leftTie = ties.find((member) => member.id === 'eaves-tie-left')!;
        const rightTie = ties.find((member) => member.id === 'eaves-tie-right')!;

        expect(leftTie.section.name).toBe('UB 203x133x25');
        expect(leftTie.start).toEqual([-12, 0, 6]);
        expect(leftTie.end).toEqual([-12, 40, 6]);

        expect(rightTie.start).toEqual([12, 0, 6]);
        expect(rightTie.end).toEqual([12, 40, 6]);
    });

    it('includes purlins and side rails with the configured secondary sections', () => {
        const built = buildPortalFrame(defaultPortalFrameDesign());
        const purlins = built.members.filter((member) => member.role === 'purlin');
        const sideRails = built.members.filter((member) => member.role === 'side_rail');

        expect(purlins).toHaveLength(16);
        expect(sideRails).toHaveLength(16);
        expect(purlins[0]?.section.name).toBe('202 Z 16');
        expect(sideRails[0]?.section.name).toBe('202 C 16');
        expect(built.members.filter((member) => member.id.startsWith('gable-front-column-'))).toHaveLength(3);
        expect(built.members.filter((member) => member.id.startsWith('side-rail-gable-'))).toHaveLength(8);
    });

    it('adds two 450 mm x 6 m piles under each two-pile cap', () => {
        const design = defaultPortalFrameDesign();
        design.foundation.type = 'two_pile_cap';

        const built = buildPortalFrame(design);
        const firstLeftPiles = built.members.filter((member) =>
            member.id.startsWith('frame-0-pile-left-'),
        );

        expect(firstLeftPiles).toHaveLength(2);
        expect(firstLeftPiles[0]?.pile?.diameter).toBe(0.45);
        expect(firstLeftPiles[0]?.pile?.depth).toBe(6);
        expect(Math.abs(firstLeftPiles[1]!.start[0] - firstLeftPiles[0]!.start[0])).toBeCloseTo(
            0.45 * 3,
        );
    });
});
