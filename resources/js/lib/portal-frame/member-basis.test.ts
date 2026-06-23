import { describe, expect, it } from 'vitest';
import { memberBasis } from '@/lib/portal-frame/member-basis';
import { findUbSection } from '@/lib/portal-frame/ub-sections';
import type { FrameMember } from '@/types/portal-frame';

function testRafter(side: 'left' | 'right'): FrameMember {
    const startX = side === 'left' ? -12 : 12;

    return {
        id: `frame-0-rafter-${side}`,
        role: 'rafter',
        start: [startX, 0, 6],
        end: [0, 0, 7.26],
        section: findUbSection('UB 356x171x45'),
    };
}

describe('memberBasis', () => {
    it('keeps rafter major axis pointing upward for both frame sides', () => {
        for (const side of ['left', 'right'] as const) {
            const basis = memberBasis(testRafter(side));

            expect(basis.majorAxis.z).toBeGreaterThan(0);
        }
    });

    it('orients gable columns ninety degrees with major axis along building length', () => {
        const member: FrameMember = {
            id: 'gable-front-column-1',
            role: 'gable_column',
            start: [-6, 0, 0],
            end: [-6, 0, 6.5],
            section: findUbSection('UB 203x133x25'),
        };

        expect(memberBasis(member).majorAxis.toArray()).toEqual([0, 1, 0]);
    });
});
