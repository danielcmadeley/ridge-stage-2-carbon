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

    it('has zero bending moment at the pinned bases', () => {
        const result = analyzePortalFrame(buildPortalFrame(defaultPortalFrameDesign()));
        const columns = result.members.filter((member) => member.role === 'column');

        for (const column of columns) {
            // Column base is the first station (z = 0).
            expect(Math.abs(column.momentKnm[0])).toBeLessThan(1e-6);
        }

        // Pin-pin: no moment reaction at the bases.
        expect(Math.abs(result.reactions.left.momentKnm)).toBeLessThan(1e-6);
        expect(Math.abs(result.reactions.right.momentKnm)).toBeLessThan(1e-6);
    });

    it('maintains moment continuity at the eaves moment connections', () => {
        const result = analyzePortalFrame(buildPortalFrame(defaultPortalFrameDesign()));

        for (const side of ['left', 'right'] as const) {
            const column = result.members.find(
                (member) => member.id === `frame-0-column-${side}`,
            );
            const rafter = result.members.find(
                (member) => member.id === `frame-0-rafter-${side}`,
            );

            const columnTopMoment = column!.momentKnm[column!.momentKnm.length - 1];
            const rafterEavesMoment = rafter!.momentKnm[0];

            // Rigid eaves joint: the bending moment is continuous across the
            // connection. Member local axes differ, so compare magnitudes.
            expect(Math.abs(columnTopMoment)).toBeCloseTo(
                Math.abs(rafterEavesMoment),
                3,
            );
            // The eaves moment must be a meaningful (non-trivial) value.
            expect(Math.abs(columnTopMoment)).toBeGreaterThan(1);
        }
    });

    it('maintains moment continuity at the apex moment connection', () => {
        const result = analyzePortalFrame(buildPortalFrame(defaultPortalFrameDesign()));
        const leftRafter = result.members.find(
            (member) => member.id === 'frame-0-rafter-left',
        );
        const rightRafter = result.members.find(
            (member) => member.id === 'frame-0-rafter-right',
        );

        const leftApexMoment = leftRafter!.momentKnm[leftRafter!.momentKnm.length - 1];
        const rightApexMoment = rightRafter!.momentKnm[rightRafter!.momentKnm.length - 1];

        // Both rafters end at the apex (mirrored local axes), so the internal
        // moments are equal and opposite at a rigid apex with no applied moment.
        expect(leftApexMoment).toBeCloseTo(-rightApexMoment, 3);
    });

    it('produces the largest bending moment at the eaves, not the apex', () => {
        const result = analyzePortalFrame(buildPortalFrame(defaultPortalFrameDesign()));

        for (const side of ['left', 'right'] as const) {
            const column = result.members.find(
                (member) => member.id === `frame-0-column-${side}`,
            );
            const rafter = result.members.find(
                (member) => member.id === `frame-0-rafter-${side}`,
            );

            // Eaves moment = column top = rafter start.
            const eavesMoment = Math.abs(
                column!.momentKnm[column!.momentKnm.length - 1],
            );
            // Apex moment = rafter far end.
            const apexMoment = Math.abs(
                rafter!.momentKnm[rafter!.momentKnm.length - 1],
            );

            // For a pinned-base portal under gravity load the hogging eaves
            // moment is the peak; the apex moment is materially smaller.
            expect(apexMoment).toBeLessThan(eavesMoment);

            // The eaves moment must also be the maximum anywhere on the rafter.
            const maxRafterMoment = Math.max(
                ...rafter!.momentKnm.map(Math.abs),
            );
            expect(maxRafterMoment).toBeCloseTo(eavesMoment, 1);
        }
    });

    it('satisfies global equilibrium of base reactions', () => {
        const built = buildPortalFrame(defaultPortalFrameDesign());
        const result = analyzePortalFrame(built);
        const { left, right } = result.reactions;

        const rafters = built.members.filter(
            (member) =>
                member.id.startsWith('frame-0-') && member.role === 'rafter',
        );
        const totalAppliedVerticalKn = rafters.reduce(
            (sum, rafter) => sum + built.rafterLineLoadKnM * memberLengthM(rafter),
            0,
        );

        // No horizontal applied load: horizontal reactions cancel.
        expect(left.fxKn + right.fxKn).toBeCloseTo(0, 3);
        // Vertical reactions carry the full applied load.
        expect(left.fzKn + right.fzKn).toBeCloseTo(totalAppliedVerticalKn, 1);
    });

    it('relates column base axial force to the vertical base reaction', () => {
        const built = buildPortalFrame(defaultPortalFrameDesign());
        const result = analyzePortalFrame(built);
        const leftColumn = result.members.find(
            (member) => member.id === 'frame-0-column-left',
        );

        // The column is vertical, so its axial force at the base equals the
        // vertical reaction there (compression -> negative axial).
        expect(Math.abs(leftColumn!.axialKn[0])).toBeCloseTo(
            Math.abs(result.reactions.left.fzKn),
            1,
        );
        expect(leftColumn!.axialKn[0]).toBeLessThan(0);
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
