import { describe, expect, it } from 'vitest';
import { buildPortalFrame } from '@/lib/portal-frame/geometry-builder';
import {
    buildGableColumns,
    gableColumnXPositions,
    GABLE_COLUMN_SPACING_M,
    isExistingGableCornerColumn,
} from '@/lib/portal-frame/gable-columns';
import { findUbSection } from '@/lib/portal-frame/ub-sections';
import { rafterUndersideZAtX } from '@/lib/portal-frame/purlins';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('gableColumnXPositions', () => {
    it('places columns at 6 m centres across the span', () => {
        expect(gableColumnXPositions(24)).toEqual([-12, -6, 0, 6, 12]);
        expect(GABLE_COLUMN_SPACING_M).toBe(6);
    });
});

describe('buildGableColumns', () => {
    const design = defaultPortalFrameDesign();
    const built = buildPortalFrame(design);
    const gableColumnSection = findUbSection('UB 203x133x25');
    const gableColumns = buildGableColumns(design, gableColumnSection, built.rafter);

    it('adds intermediate columns on both gable ends without duplicating corners', () => {
        expect(gableColumns.filter((member) => member.role === 'gable_column')).toHaveLength(6);
        expect(gableColumns.filter((member) => member.role === 'foundation')).toHaveLength(6);
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
        const midColumn = gableColumns.find((member) => member.id === 'gable-front-column-1');
        const apexColumn = gableColumns.find((member) => member.id === 'gable-front-column-2');

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
