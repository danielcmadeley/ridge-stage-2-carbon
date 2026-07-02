import { describe, expect, it } from 'vitest';
import {
    buildGableColumns,
    gableColumnXPositions,
    GABLE_COLUMN_SPACING_M,
    isExistingGableCornerColumn,
} from '@/lib/portal-frame/model/gable-columns';
import { buildPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import { rafterUndersideZAtX } from '@/lib/portal-frame/model/purlins';
import { findUbSection } from '@/lib/portal-frame/sections/ub-sections';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('gableColumnXPositions', () => {
    it('places columns at 6 m centres across the span', () => {
        expect(gableColumnXPositions(24)).toEqual([-12, -6, 0, 6, 12]);
        expect(GABLE_COLUMN_SPACING_M).toBe(6);
    });

    it('always places a column at the centre of the span', () => {
        for (const span of [6, 7, 12, 18, 20, 24, 25, 30, 33]) {
            const positions = gableColumnXPositions(span);

            expect(positions.some((x) => Math.abs(x) < 1e-9)).toBe(true);
        }
    });

    it('keeps spacing symmetric about the centre and at or below 6 m', () => {
        for (const span of [7, 20, 25, 33]) {
            const positions = gableColumnXPositions(span);
            const halfSpan = span / 2;

            expect(positions.at(0)).toBeCloseTo(-halfSpan, 9);
            expect(positions.at(-1)).toBeCloseTo(halfSpan, 9);

            for (let index = 1; index < positions.length; index += 1) {
                expect(positions[index] - positions[index - 1]).toBeLessThanOrEqual(
                    GABLE_COLUMN_SPACING_M + 1e-9,
                );
            }

            const centreIndex = positions.findIndex((x) => Math.abs(x) < 1e-9);
            const left = positions.slice(0, centreIndex).reverse();
            const right = positions.slice(centreIndex + 1);

            expect(left.map((x) => -x)).toEqual(right);
        }
    });

    it('divides a non-multiple span evenly instead of leaving a short edge bay', () => {
        expect(gableColumnXPositions(20)).toEqual([-10, -5, 0, 5, 10]);

        const positions = gableColumnXPositions(25);
        const spacing = 12.5 / 3;

        expect(positions).toHaveLength(7);
        expect(positions).toEqual([
            -3 * spacing, -2 * spacing, -spacing, 0,
            spacing, 2 * spacing, 3 * spacing,
        ]);
    });
});

describe('buildGableColumns', () => {
    const design = defaultPortalFrameDesign();
    const built = buildPortalFrame(design);
    const gableColumnSection = findUbSection('UB 203x133x25');
    const gableColumns = buildGableColumns(
        design,
        gableColumnSection,
        built.rafter,
    );

    it('adds intermediate columns on both gable ends without duplicating corners', () => {
        expect(
            gableColumns.filter((member) => member.role === 'gable_column'),
        ).toHaveLength(6);
        expect(
            gableColumns.filter((member) => member.role === 'foundation'),
        ).toHaveLength(6);
        expect(
            gableColumns.some((member) => member.id === 'gable-front-column-1'),
        ).toBe(true);
        expect(
            gableColumns.some((member) => member.id === 'gable-rear-column-3'),
        ).toBe(true);
        expect(
            gableColumns.some((member) => member.id === 'gable-front-column-0'),
        ).toBe(false);
    });

    it('uses UB 203 sections rotated to meet the rafter underside', () => {
        const midColumn = gableColumns.find(
            (member) => member.id === 'gable-front-column-1',
        );
        const apexColumn = gableColumns.find(
            (member) => member.id === 'gable-front-column-2',
        );

        expect(midColumn?.section.name).toBe('UB 203x133x25');
        expect(midColumn?.end[2]).toBeCloseTo(
            rafterUndersideZAtX(design, -6, built.rafter),
            5,
        );
        expect(midColumn?.end[2]).toBeGreaterThan(design.eavesHeight);
        expect(apexColumn?.end[2]).toBeGreaterThan(midColumn?.end[2] ?? 0);
    });

    it('skips corner positions already occupied by portal frame columns', () => {
        expect(isExistingGableCornerColumn(-12, 0, 12, 40)).toBe(true);
        expect(isExistingGableCornerColumn(-6, 0, 12, 40)).toBe(false);
    });
});
