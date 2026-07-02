import { Group, Mesh, Sprite } from 'three';
import { describe, expect, it } from 'vitest';
import { adjustMembersForAnalysis } from '@/lib/portal-frame/model/analytical-adjustments';
import { buildPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import {
    createSupportAnnotationsGroup,
    reactionLabelLines,
} from '@/lib/portal-frame/rendering/support-annotations';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

function buildAnnotationFixture() {
    const design = defaultPortalFrameDesign();
    const built = buildPortalFrame(design);
    const analysisMembers = adjustMembersForAnalysis(built.members, design);

    return { design, built, analysisMembers };
}

describe('createSupportAnnotationsGroup', () => {
    it('adds a pinned support symbol at every column base', () => {
        const { design, built, analysisMembers } = buildAnnotationFixture();
        const group = createSupportAnnotationsGroup(
            analysisMembers,
            built,
            design,
        );

        const supportedColumnCount = analysisMembers.filter(
            (member) =>
                (member.role === 'column' || member.role === 'gable_column') &&
                (Math.abs(member.start[2]) < 1e-4 ||
                    Math.abs(member.end[2]) < 1e-4),
        ).length;
        const pinSymbols = group.children.filter(
            (child) => child instanceof Group,
        );

        expect(supportedColumnCount).toBeGreaterThan(0);
        expect(pinSymbols).toHaveLength(supportedColumnCount);
    });

    it('places the pin cone apex at the column base node', () => {
        const { design, built, analysisMembers } = buildAnnotationFixture();
        const group = createSupportAnnotationsGroup(
            analysisMembers,
            built,
            design,
        );

        const firstPin = group.children.find(
            (child) => child instanceof Group,
        )!;
        const cone = firstPin.children.find((child) => child instanceof Mesh)!;

        // Cone centre sits half its height below ground so the apex touches
        // the support node at z = 0.
        expect(cone.position.z).toBeLessThan(0);

        const column = analysisMembers.find(
            (member) => member.role === 'column',
        )!;

        expect(cone.position.x).toBeCloseTo(column.start[0], 6);
    });

    it('skips reaction label sprites when no browser canvas is available', () => {
        const { design, built, analysisMembers } = buildAnnotationFixture();
        const group = createSupportAnnotationsGroup(
            analysisMembers,
            built,
            design,
            'factored',
        );

        const sprites = group.children.filter(
            (child) => child instanceof Sprite,
        );

        expect(sprites).toHaveLength(0);
    });
});

describe('reactionLabelLines', () => {
    it('formats horizontal and vertical reactions to one decimal place', () => {
        expect(
            reactionLabelLines({ fxKn: 12.345, fzKn: -67.89, momentKnm: 0 }),
        ).toEqual(['H 12.3 kN', 'V -67.9 kN']);
    });
});
