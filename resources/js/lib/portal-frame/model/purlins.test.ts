import { describe, expect, it } from 'vitest';
import { buildPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import {
    buildPurlins,
    pointOnRafter,
    pointOnRafterTopFlange,
    purlinAnchorPoint,
    rafterLengthM,
} from '@/lib/portal-frame/model/purlins';
import { findZSection } from '@/lib/portal-frame/sections/z-sections';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('buildPurlins', () => {
    const design = defaultPortalFrameDesign();
    const built = buildPortalFrame(design);
    const section = findZSection('202 Z 16');

    it('places eight purlins per roof slope for the default design', () => {
        const purlins = buildPurlins(design, section, built.rafter);

        expect(purlins).toHaveLength(16);
        expect(
            purlins.filter((member) => member.role === 'purlin'),
        ).toHaveLength(16);
        expect(
            purlins.filter((member) => member.id.startsWith('purlin-left-')),
        ).toHaveLength(8);
        expect(
            purlins.filter((member) => member.id.startsWith('purlin-right-')),
        ).toHaveLength(8);
    });

    it('runs each purlin along the full building length', () => {
        const purlin = buildPurlins(design, section, built.rafter).find(
            (member) => member.id === 'purlin-left-0',
        )!;

        expect(purlin.section.name).toBe('202 Z 16');
        expect(purlin.start[1]).toBe(0);
        expect(purlin.end[1]).toBe(40);
        expect(purlin.start[2]).toBe(purlin.end[2]);
    });

    it('places the first purlin with its bottom flange on the rafter top flange', () => {
        const rafterLength = rafterLengthM(design);
        const firstOffset = 1.0;
        const expected = purlinAnchorPoint(
            design,
            'left',
            firstOffset,
            built.rafter,
            section,
        );
        const rafterTop = pointOnRafterTopFlange(
            design,
            'left',
            firstOffset,
            built.rafter,
        );
        const purlin = buildPurlins(design, section, built.rafter).find(
            (member) => member.id === 'purlin-left-0',
        )!;

        expect(purlin.start[0]).toBeCloseTo(expected.x, 5);
        expect(purlin.start[2]).toBeCloseTo(expected.z, 5);
        expect(purlin.start[2]).toBeGreaterThan(rafterTop.z);
        expect(purlin.start[2]).toBeGreaterThan(
            pointOnRafter(design, 'left', firstOffset).z,
        );
        expect(firstOffset).toBeLessThan(rafterLength - 0.25);
    });
});
