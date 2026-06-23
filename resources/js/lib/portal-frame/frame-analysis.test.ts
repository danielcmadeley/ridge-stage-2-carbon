import { describe, expect, it } from 'vitest';
import { buildPortalFrame } from '@/lib/portal-frame/geometry-builder';
import { analyzePortalFrame } from '@/lib/portal-frame/frame-analysis';
import { memberLengthM } from '@/lib/portal-frame/member-basis';
import { findUbSection } from '@/lib/portal-frame/ub-sections';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('findUbSection', () => {
    it('parses major-axis inertia and area from CSV', () => {
        const section = findUbSection('UB 203x102x23');

        expect(section.iyCm4).toBe(2105);
        expect(section.areaCm2).toBe(29.4);
    });
});

describe('analyzePortalFrame', () => {
    it('satisfies vertical equilibrium for the default frame', () => {
        const design = defaultPortalFrameDesign();
        const built = buildPortalFrame(design);
        const result = analyzePortalFrame(built);

        const rafters = built.members.filter(
            (member) =>
                member.id.startsWith('frame-0-') && member.role === 'rafter',
        );
        const totalAppliedVerticalKn = rafters.reduce(
            (sum, rafter) => sum + built.rafterLineLoadKnM * memberLengthM(rafter),
            0,
        );
        const totalReactionVerticalKn =
            result.reactions.left.fzKn + result.reactions.right.fzKn;

        expect(totalReactionVerticalKn).toBeCloseTo(totalAppliedVerticalKn, 1);
    });

    it('produces symmetric reactions for the default symmetric frame', () => {
        const built = buildPortalFrame(defaultPortalFrameDesign());
        const result = analyzePortalFrame(built);

        expect(result.reactions.left.fzKn).toBeCloseTo(result.reactions.right.fzKn, 1);
        expect(result.reactions.left.fxKn).toBeCloseTo(-result.reactions.right.fxKn, 1);
    });

    it('returns non-zero bending in rafters and columns', () => {
        const result = analyzePortalFrame(buildPortalFrame(defaultPortalFrameDesign()));

        for (const member of result.members) {
            const maxMoment = Math.max(...member.momentKnm.map(Math.abs));
            const maxShear = Math.max(...member.shearKn.map(Math.abs));

            expect(maxMoment).toBeGreaterThan(0);
            expect(maxShear).toBeGreaterThan(0);
        }
    });

    it('stiffer sections reduce apex horizontal displacement', () => {
        const design = defaultPortalFrameDesign();
        const built = buildPortalFrame(design);
        const lightSection = findUbSection('UB 127x76x13');
        const heavySection = findUbSection('UB 356x171x45');

        const lightMembers = built.members
            .filter(
                (member) =>
                    member.id.startsWith('frame-0-') &&
                    (member.role === 'column' || member.role === 'rafter'),
            )
            .map((member) => ({
                ...member,
                section: member.role === 'column' ? lightSection : lightSection,
            }));

        const heavyMembers = lightMembers.map((member) => ({
            ...member,
            section: heavySection,
        }));

        const lightBuilt = {
            ...built,
            column: lightSection,
            rafter: lightSection,
            members: [
                ...built.members.filter((member) => !member.id.startsWith('frame-0-')),
                ...lightMembers,
            ],
        };
        const heavyBuilt = {
            ...built,
            column: heavySection,
            rafter: heavySection,
            members: [
                ...built.members.filter((member) => !member.id.startsWith('frame-0-')),
                ...heavyMembers,
            ],
        };

        const lightResult = analyzePortalFrame(lightBuilt);
        const heavyResult = analyzePortalFrame(heavyBuilt);

        expect(lightResult.apexHorizontalDisplacementM).toBeCloseTo(0, 3);
        expect(Math.abs(heavyResult.apexVerticalDisplacementM)).toBeLessThan(
            Math.abs(lightResult.apexVerticalDisplacementM),
        );
    });
});
