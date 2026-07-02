import { describe, expect, it } from 'vitest';
import { buildPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import {
    HAUNCH_DEPTH_FACTOR,
    HAUNCH_LENGTH_FRACTION,
} from '@/lib/portal-frame/model/haunch-geometry';
import { isUbSection } from '@/lib/portal-frame/model/member-basis';
import { extractStructuralNodes } from '@/lib/portal-frame/model/member-nodes';
import {
    adjustMembersForRendering,
    extendColumnToRafterTop,
    trimRafterAtColumnFace,
} from '@/lib/portal-frame/model/render-adjustments';
import { findUbSection } from '@/lib/portal-frame/sections/ub-sections';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

const columnSection406 = findUbSection('UB 406x178x74');
const rafterSection356 = findUbSection('UB 356x171x45');

describe('trimRafterAtColumnFace', () => {
    it('moves the left rafter start to the column inner face', () => {
        const column = {
            id: 'frame-0-column-left',
            role: 'column' as const,
            start: [-12, 0, 0] as [number, number, number],
            end: [-12, 0, 6] as [number, number, number],
            section: columnSection406,
        };
        const rafter = {
            id: 'frame-0-rafter-left',
            role: 'rafter' as const,
            start: [-12, 0, 6] as [number, number, number],
            end: [0, 0, 7.26] as [number, number, number],
            section: rafterSection356,
        };

        const trimmed = trimRafterAtColumnFace(rafter, column);
        const halfFlangeWidthM = column.section.b / 2000;

        expect(trimmed.start[0]).toBeCloseTo(-12 + halfFlangeWidthM, 6);
        expect(trimmed.start[1]).toBe(0);
        expect(trimmed.start[2]).toBeGreaterThan(6);
        expect(trimmed.end).toEqual(rafter.end);
    });

    it('moves the right rafter start to the column inner face', () => {
        const column = {
            id: 'frame-0-column-right',
            role: 'column' as const,
            start: [12, 0, 0] as [number, number, number],
            end: [12, 0, 6] as [number, number, number],
            section: columnSection406,
        };
        const rafter = {
            id: 'frame-0-rafter-right',
            role: 'rafter' as const,
            start: [12, 0, 6] as [number, number, number],
            end: [0, 0, 7.26] as [number, number, number],
            section: rafterSection356,
        };

        const trimmed = trimRafterAtColumnFace(rafter, column);
        const halfFlangeWidthM = column.section.b / 2000;

        expect(trimmed.start[0]).toBeCloseTo(12 - halfFlangeWidthM, 6);
        expect(trimmed.end).toEqual(rafter.end);
    });
});

describe('extendColumnToRafterTop', () => {
    it('extends the column to the rafter top flange at eaves', () => {
        const column = {
            id: 'frame-0-column-left',
            role: 'column' as const,
            start: [-12, 0, 0] as [number, number, number],
            end: [-12, 0, 6] as [number, number, number],
            section: columnSection406,
        };
        const rafter = {
            id: 'frame-0-rafter-left',
            role: 'rafter' as const,
            start: [-12, 0, 6] as [number, number, number],
            end: [0, 0, 7.26] as [number, number, number],
            section: rafterSection356,
        };

        const extended = extendColumnToRafterTop(column, rafter);

        expect(extended.end[2]).toBeGreaterThan(column.end[2]);
        expect(extended.start).toEqual(column.start);
    });
});

describe('adjustMembersForRendering', () => {
    it('extends columns and shortens rafters for the solid render', () => {
        const design = defaultPortalFrameDesign();
        const built = buildPortalFrame(design);
        const adjusted = adjustMembersForRendering(built.members);

        const leftRafter = adjusted.find(
            (member) => member.id === 'frame-0-rafter-left',
        );
        const leftColumn = adjusted.find(
            (member) => member.id === 'frame-0-column-left',
        );
        const analysisRafter = built.members.find(
            (member) => member.id === 'frame-0-rafter-left',
        );
        const analysisColumn = built.members.find(
            (member) => member.id === 'frame-0-column-left',
        );

        expect(leftRafter).toBeDefined();
        expect(leftColumn!.end[2]).toBeGreaterThan(analysisColumn!.end[2]);
        expect(leftRafter!.start[0]).toBeGreaterThan(analysisRafter!.start[0]);
    });

    it('uses 10% of span and 1.5x rafter depth for haunch proportions', () => {
        const design = defaultPortalFrameDesign();
        const built = buildPortalFrame(design);
        const rafter = built.members.find(
            (member) => member.id === 'frame-0-rafter-left',
        );

        if (!rafter || !isUbSection(rafter.section)) {
            throw new Error('Expected a UB rafter section.');
        }

        const expectedHaunchLength = design.span * HAUNCH_LENGTH_FRACTION;
        const expectedHaunchDepth =
            (rafter.section.h / 1000) * HAUNCH_DEPTH_FACTOR;

        expect(expectedHaunchLength).toBeGreaterThan(0);
        expect(expectedHaunchDepth).toBeGreaterThan(0);
    });
});

describe('extractStructuralNodes', () => {
    it('deduplicates shared eaves and apex nodes', () => {
        const design = defaultPortalFrameDesign();
        const built = buildPortalFrame(design);
        const frameZeroMembers = built.members.filter((member) =>
            member.id.startsWith('frame-0-'),
        );
        const nodes = extractStructuralNodes(frameZeroMembers);

        expect(nodes).toHaveLength(5);

        const apexNodes = nodes.filter((node) => node[0] === 0);
        expect(apexNodes).toHaveLength(1);
    });
});
