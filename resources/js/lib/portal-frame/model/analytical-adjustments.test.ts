import { describe, expect, it } from 'vitest';
import { adjustMembersForAnalysis } from '@/lib/portal-frame/model/analytical-adjustments';
import { gableColumnXPositions } from '@/lib/portal-frame/model/gable-columns';
import { buildPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import { extractStructuralNodes } from '@/lib/portal-frame/model/member-nodes';
import {
    pointOnRafter,
    pointOnRafterAtX,
    rafterUndersideZAtX,
} from '@/lib/portal-frame/model/purlins';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('adjustMembersForAnalysis', () => {
    const design = defaultPortalFrameDesign();
    const built = buildPortalFrame(design);
    const bayCount = Math.max(
        1,
        Math.round(design.buildingLength / design.baySpacing),
    );
    const halfSpan = design.span / 2;

    it('places purlins on the rafter centreline instead of the physical anchor offset', () => {
        const members = adjustMembersForAnalysis(built.members, design);
        const renderPurlin = built.members.find(
            (member) => member.id === 'purlin-left-0',
        )!;
        const analysisPurlin = members.find(
            (member) => member.id === 'purlin-left-0-bay-0',
        )!;
        const centreline = pointOnRafter(design, 'left', 1.0);

        expect(analysisPurlin.start[0]).toBeCloseTo(centreline.x, 5);
        expect(analysisPurlin.start[2]).toBeCloseTo(centreline.z, 5);
        expect(analysisPurlin.start[2]).toBeLessThan(renderPurlin.start[2]);
    });

    it('places wall side rails on the column centreline', () => {
        const members = adjustMembersForAnalysis(built.members, design);
        const renderSideRail = built.members.find(
            (member) => member.id === 'side-rail-left-0',
        )!;
        const analysisSideRail = members.find(
            (member) => member.id === 'side-rail-left-0-bay-0',
        )!;

        expect(analysisSideRail.start[0]).toBe(-halfSpan);
        expect(analysisSideRail.end[0]).toBe(-halfSpan);
        expect(Math.abs(analysisSideRail.start[0])).toBeLessThan(
            Math.abs(renderSideRail.start[0]),
        );
    });

    it('splits purlins and wall side rails at every frame position', () => {
        const members = adjustMembersForAnalysis(built.members, design);
        const purlins = members.filter((member) => member.role === 'purlin');
        const wallSideRails = members.filter(
            (member) =>
                member.id.startsWith('side-rail-left-') ||
                member.id.startsWith('side-rail-right-'),
        );

        expect(purlins).toHaveLength(16 * bayCount);
        expect(wallSideRails).toHaveLength(8 * bayCount);
        expect(
            members.find((member) => member.id === 'purlin-left-0-bay-0')!
                .end[1],
        ).toBe(design.baySpacing);
        expect(
            members.find((member) => member.id === 'side-rail-right-0-bay-0')!
                .start[1],
        ).toBe(0);
        expect(
            members.find((member) => member.id === 'side-rail-right-0-bay-0')!
                .end[1],
        ).toBe(design.baySpacing);
    });

    it('adds nodes at every frame intersection for secondary members', () => {
        const members = adjustMembersForAnalysis(built.members, design);
        const nodes = extractStructuralNodes(members);
        const framePositions = Array.from(
            { length: bayCount + 1 },
            (_, index) => index * design.baySpacing,
        );

        for (const y of framePositions) {
            expect(
                nodes.some(
                    (node) =>
                        node[0] === -halfSpan && node[1] === y && node[2] === 1,
                ),
            ).toBe(true);
        }
    });

    it('extends gable columns to the rafter centreline instead of the underside', () => {
        const members = adjustMembersForAnalysis(built.members, design);
        const renderColumn = built.members.find(
            (member) => member.id === 'gable-front-column-1',
        )!;
        const analysisColumn = members.find(
            (member) => member.id === 'gable-front-column-1',
        )!;
        const centrelineTop = pointOnRafterAtX(design, -6).z;

        expect(analysisColumn.end[2]).toBeCloseTo(centrelineTop, 5);
        expect(analysisColumn.end[2]).toBeGreaterThan(renderColumn.end[2]);
        expect(renderColumn.end[2]).toBeCloseTo(
            rafterUndersideZAtX(design, -6, built.rafter),
            5,
        );
    });

    it('splits gable side rails at every gable column position', () => {
        const members = adjustMembersForAnalysis(built.members, design);
        const gableColumnPositions = gableColumnXPositions(design.span);
        const gableSideRails = members.filter((member) =>
            member.id.startsWith('side-rail-gable-'),
        );
        const segmentCount = gableColumnPositions.length - 1;

        expect(gableSideRails).toHaveLength(4 * segmentCount * 2);
        expect(
            members.find(
                (member) => member.id === 'side-rail-gable-front-0-seg-0',
            )!.start[0],
        ).toBe(gableColumnPositions[0]);
        expect(
            members.find(
                (member) => member.id === 'side-rail-gable-front-0-seg-0',
            )!.end[0],
        ).toBe(gableColumnPositions[1]);
        expect(
            members.find(
                (member) => member.id === 'side-rail-gable-front-0-seg-0',
            )!.start[1],
        ).toBe(0);
    });

    it('adds nodes at every gable column intersection for gable side rails', () => {
        const members = adjustMembersForAnalysis(built.members, design);
        const nodes = extractStructuralNodes(members);

        for (const x of gableColumnXPositions(design.span)) {
            expect(
                nodes.some(
                    (node) => node[0] === x && node[1] === 0 && node[2] === 1,
                ),
            ).toBe(true);
        }
    });

    it('leaves the solid render member list unchanged', () => {
        expect(
            built.members.find((member) => member.id === 'purlin-left-0')!
                .end[1],
        ).toBe(40);
        expect(
            built.members.find((member) => member.id === 'side-rail-left-0')!
                .start[0],
        ).not.toBe(-halfSpan);
        expect(
            built.members.find(
                (member) => member.id === 'side-rail-gable-front-0',
            )!.start[0],
        ).not.toBe(-halfSpan);
        expect(
            built.members.find(
                (member) => member.id === 'gable-front-column-1',
            )!.end[2],
        ).toBeLessThan(pointOnRafterAtX(design, -6).z);
    });
});
