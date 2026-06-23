import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { analyzePortalFrame } from '@/lib/portal-frame/frame-analysis';
import { momentDiagramNormal, createForceDiagramGroup } from '@/lib/portal-frame/force-diagram-3d';
import { collectForceDiagramObjects } from '@/lib/portal-frame/force-diagram-hover';
import { buildPortalFrame } from '@/lib/portal-frame/geometry-builder';
import { defaultPortalFrameDesign } from '@/types/portal-frame';
import type { FrameMember } from '@/types/portal-frame';

function frameZeroMember(built: ReturnType<typeof buildPortalFrame>, id: string): FrameMember {
    const member = built.members.find((candidate) => candidate.id === id);

    if (!member) {
        throw new Error(`Missing member ${id}`);
    }

    return member;
}

/**
 * Plotted moment-diagram offset (relative to the centreline) at a station,
 * i.e. tension-side normal scaled by the signed local moment.
 */
function momentOffset(member: FrameMember, value: number): Vector3 {
    return momentDiagramNormal(member).multiplyScalar(value);
}

describe('moment diagram rendering', () => {
    it('plots opposite members as mirror images, not inversions', () => {
        const built = buildPortalFrame(defaultPortalFrameDesign());
        const analysis = analyzePortalFrame(built);

        const byId = new Map(analysis.members.map((member) => [member.id, member]));

        for (const pair of [
            ['frame-0-column-left', 'frame-0-column-right'],
            ['frame-0-rafter-left', 'frame-0-rafter-right'],
        ] as const) {
            const [leftId, rightId] = pair;
            const leftAnalysis = byId.get(leftId)!;
            const rightAnalysis = byId.get(rightId)!;
            const leftMember = frameZeroMember(built, leftId);
            const rightMember = frameZeroMember(built, rightId);

            for (let station = 0; station < leftAnalysis.momentKnm.length; station++) {
                const leftOffset = momentOffset(
                    leftMember,
                    leftAnalysis.momentKnm[station],
                );
                const rightOffset = momentOffset(
                    rightMember,
                    rightAnalysis.momentKnm[station],
                );

                // Mirror symmetry about the x = 0 plane: equal vertical offset,
                // opposite horizontal offset. An inverted diagram would instead
                // give equal-and-opposite vertical offsets.
                expect(rightOffset.z).toBeCloseTo(leftOffset.z, 6);
                expect(rightOffset.x).toBeCloseTo(-leftOffset.x, 6);
            }
        }
    });

    it('draws the hogging eaves moment on the outer face of both columns', () => {
        const built = buildPortalFrame(defaultPortalFrameDesign());
        const analysis = analyzePortalFrame(built);
        const byId = new Map(analysis.members.map((member) => [member.id, member]));

        for (const side of ['left', 'right'] as const) {
            const member = frameZeroMember(built, `frame-0-column-${side}`);
            const columnAnalysis = byId.get(`frame-0-column-${side}`)!;
            const eavesMoment =
                columnAnalysis.momentKnm[columnAnalysis.momentKnm.length - 1];
            const offset = momentOffset(member, eavesMoment);

            // Outer face means the diagram extends away from the frame centre
            // (same x-sign as the column position).
            expect(Math.sign(offset.x)).toBe(Math.sign(member.start[0]));
        }
    });

    it('attaches hover metadata to rendered force diagram objects', () => {
        const built = buildPortalFrame(defaultPortalFrameDesign());
        const analysis = analyzePortalFrame(built);
        const group = createForceDiagramGroup(
            built.members,
            analysis.members,
            'moment',
        );

        const hoverTargets = collectForceDiagramObjects(group);

        expect(hoverTargets.length).toBeGreaterThan(0);

        for (const target of hoverTargets) {
            expect(target.userData.forceDiagramHover.mode).toBe('moment');
            expect(target.userData.forceDiagramHover.analysis.stationsM.length).toBeGreaterThan(
                0,
            );
        }
    });
});
