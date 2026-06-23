import { describe, expect, it } from 'vitest';
import { buildPortalFrame } from '@/lib/portal-frame/geometry-builder';
import { findCSection } from '@/lib/portal-frame/c-sections';
import { findUbSection } from '@/lib/portal-frame/ub-sections';
import {
    buildSideRails,
    outerColumnFlangeX,
    outerGableColumnFlangeY,
    sideRailAnchorX,
    sideRailGableAnchorY,
} from '@/lib/portal-frame/side-rails';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('buildSideRails', () => {
    const design = defaultPortalFrameDesign();
    const built = buildPortalFrame(design);
    const section = findCSection('202 C 16');
    const gableColumnSection = findUbSection('UB 203x133x25');

    it('places four side rails per wall up to the eaves height', () => {
        const sideRails = buildSideRails(design, section, built.column, gableColumnSection);

        expect(sideRails).toHaveLength(16);
        expect(sideRails.filter((member) => member.id.startsWith('side-rail-left-'))).toHaveLength(4);
        expect(sideRails.filter((member) => member.id.startsWith('side-rail-right-'))).toHaveLength(4);
        expect(sideRails.filter((member) => member.id.startsWith('side-rail-gable-'))).toHaveLength(8);
    });

    it('positions rails at 1.0 m then every 1.5 m', () => {
        const leftHeights = buildSideRails(design, section, built.column, gableColumnSection)
            .filter((member) => member.id.startsWith('side-rail-left-'))
            .map((member) => member.start[2]);

        expect(leftHeights).toEqual([1, 2.5, 4, 5.5]);
    });

    it('anchors each side rail outside the column outer flange', () => {
        const outerX = outerColumnFlangeX(design.span / 2, built.column, 'left');
        const anchorX = sideRailAnchorX(
            design.span / 2,
            built.column,
            section,
            'left',
        );
        const sideRail = buildSideRails(design, section, built.column, gableColumnSection).find(
            (member) => member.id === 'side-rail-left-0',
        )!;

        expect(anchorX).toBeLessThan(outerX);
        expect(anchorX).toBeCloseTo(outerX - section.depth / 1000, 5);
        expect(sideRail.start[0]).toBe(anchorX);
        expect(sideRail.end[0]).toBe(anchorX);
        expect(sideRail.start[2]).toBe(1);
    });

    it('anchors gable side rails outside the gable column outer flange', () => {
        const outerY = outerGableColumnFlangeY(0, gableColumnSection, 'front');
        const frontAnchorY = sideRailGableAnchorY(0, gableColumnSection, section, 'front');
        const rearAnchorY = sideRailGableAnchorY(40, gableColumnSection, section, 'rear');
        const frontGableRail = buildSideRails(
            design,
            section,
            built.column,
            gableColumnSection,
        ).find((member) => member.id === 'side-rail-gable-front-0')!;

        expect(frontAnchorY).toBeLessThan(outerY);
        expect(frontAnchorY).toBeCloseTo(outerY - section.depth / 1000, 5);
        expect(frontGableRail.start[1]).toBe(frontAnchorY);
        expect(frontGableRail.end[1]).toBe(frontAnchorY);
        expect(
            buildSideRails(design, section, built.column, gableColumnSection).find(
                (member) => member.id === 'side-rail-gable-rear-0',
            )!.start[1],
        ).toBe(rearAnchorY);
    });

    it('wraps side rails around the front and rear gable ends', () => {
        const sideRails = buildSideRails(design, section, built.column, gableColumnSection);
        const gableRails = sideRails.filter((member) =>
            member.id.startsWith('side-rail-gable-'),
        );
        const frontAnchorY = sideRailGableAnchorY(0, gableColumnSection, section, 'front');
        const rearAnchorY = sideRailGableAnchorY(40, gableColumnSection, section, 'rear');

        expect(gableRails).toHaveLength(8);
        expect(
            gableRails.find((member) => member.id === 'side-rail-gable-front-0')!.start[1],
        ).toBe(frontAnchorY);
        expect(
            gableRails.find((member) => member.id === 'side-rail-gable-rear-0')!.start[1],
        ).toBe(rearAnchorY);
        expect(
            gableRails.find((member) => member.id === 'side-rail-gable-front-0')!.start[0],
        ).toBeLessThan(
            gableRails.find((member) => member.id === 'side-rail-gable-front-0')!.end[0],
        );
    });

    it('connects wall side rails to the gable side rail anchor positions', () => {
        const sideRails = buildSideRails(design, section, built.column, gableColumnSection);
        const frontAnchorY = sideRailGableAnchorY(0, gableColumnSection, section, 'front');
        const rearAnchorY = sideRailGableAnchorY(40, gableColumnSection, section, 'rear');
        const leftRail = sideRails.find((member) => member.id === 'side-rail-left-0')!;

        expect(leftRail.start[1]).toBe(frontAnchorY);
        expect(leftRail.end[1]).toBe(rearAnchorY);
    });
});
