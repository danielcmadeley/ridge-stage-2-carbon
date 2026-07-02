import { describe, expect, it } from 'vitest';
import { calculatePortalFrameCarbon } from '@/lib/portal-frame/carbon/carbon';
import { buildPortalFrame } from '@/lib/portal-frame/model/geometry-builder';
import {
    buildCarbonReportTypstSource,
    CARBON_REPORT_ROWS,
    formatCarbonReportCarbon,
    formatCarbonReportMass,
} from '@/lib/report/typst-carbon-report';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('buildCarbonReportTypstSource', () => {
    it('includes the selected paper size and key carbon totals', () => {
        const design = defaultPortalFrameDesign();
        const carbon = calculatePortalFrameCarbon(design);
        const frame = buildPortalFrame(design);
        const generatedAt = new Date('2026-06-23T12:00:00.000Z');

        const source = buildCarbonReportTypstSource({
            carbon,
            design,
            frame,
            paperSize: 'a3',
            generatedAt,
        });

        expect(source).toContain('paper: "a3"');
        expect(source).toContain('= Embodied Carbon Report');
        expect(source).toContain('== Visual overview');
        expect(source).toContain('== Primary frame comparison');
        expect(source).toContain('== Detailed element data');
        expect(source).toContain('== Improvement focus');
        expect(source).toContain('chart.piechart');
        expect(source).toContain('chart.columnchart');
        expect(source).toContain('chart.barchart');
        expect(source).toContain(
            formatCarbonReportCarbon(carbon.totalCarbonKg),
        );
        expect(source).toContain(
            `${carbon.carbonIntensityKgM2.toFixed(0)} kgCO2e/m²`,
        );
        expect(source).toContain(`IStructE SCORS band`);
        expect(source).toContain(carbon.scorsBand);
        expect(source).toContain(frame.rafter.name);
        expect(source).toContain(frame.column.name);
        expect(source).toContain('23 June 2026');
    });

    it('lists every breakdown row in the element table', () => {
        const design = defaultPortalFrameDesign();
        const carbon = calculatePortalFrameCarbon(design);
        const frame = buildPortalFrame(design);

        const source = buildCarbonReportTypstSource({
            carbon,
            design,
            frame,
        });

        for (const row of CARBON_REPORT_ROWS) {
            expect(source).toContain(`[${row.label}]`);
            expect(source).toContain(
                formatCarbonReportCarbon(carbon.breakdown[row.key].carbonKg),
            );
            expect(source).toContain(
                formatCarbonReportMass(carbon.breakdown[row.key].massKg),
            );
        }

        expect(source).toContain('[Columns]');
        expect(source).toContain('[Rafters]');
    });
});

describe('formatCarbonReportCarbon', () => {
    it('formats large values in tonnes', () => {
        expect(formatCarbonReportCarbon(64080)).toBe('64.08 tCO2e');
    });
});

describe('formatCarbonReportMass', () => {
    it('formats large values in tonnes', () => {
        expect(formatCarbonReportMass(12500)).toBe('12.50 t');
    });
});
