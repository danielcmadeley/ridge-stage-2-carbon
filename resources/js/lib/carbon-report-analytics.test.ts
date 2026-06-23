import { describe, expect, it } from 'vitest';
import {
    buildCarbonReportAnalytics,
    carbonChartTonnes,
    CARBON_REPORT_ROWS,
    escapeTypstContent,
    typstChartDataRow,
} from '@/lib/carbon-report-analytics';
import { calculatePortalFrameCarbon } from '@/lib/portal-frame/carbon';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('buildCarbonReportAnalytics', () => {
    it('builds ranked contributors and material categories that sum to the total', () => {
        const carbon = calculatePortalFrameCarbon(defaultPortalFrameDesign());
        const analytics = buildCarbonReportAnalytics(carbon);

        expect(analytics.elements).toHaveLength(CARBON_REPORT_ROWS.length);
        expect(analytics.topContributors.length).toBeGreaterThan(0);
        expect(analytics.topContributors[0].carbonKg).toBeGreaterThanOrEqual(
            analytics.topContributors.at(-1)?.carbonKg ?? 0,
        );

        const categoryTotal = analytics.categories.reduce(
            (sum, category) => sum + category.carbonKg,
            0,
        );

        expect(categoryTotal).toBeCloseTo(carbon.totalCarbonKg, 6);

        const lastElement = analytics.elements.at(-1);

        expect(lastElement?.cumulativeSharePercent).toBeCloseTo(100, 1);
    });

    it('includes primary frame members and improvement guidance', () => {
        const carbon = calculatePortalFrameCarbon(defaultPortalFrameDesign());
        const analytics = buildCarbonReportAnalytics(carbon);

        expect(analytics.primaryFrameElements.map((element) => element.key)).toEqual([
            'columns',
            'gableColumns',
            'rafters',
            'haunches',
        ]);
        expect(analytics.improvementNotes.length).toBeGreaterThan(0);
        expect(analytics.improvementNotes[0].detail.length).toBeGreaterThan(20);
        expect(
            analytics.scorsBenchmark.some(
                (row) => row.isCurrent && row.band === carbon.scorsBand,
            ),
        ).toBe(true);
    });
});

describe('escapeTypstContent', () => {
    it('escapes Typst special characters in table and chart labels', () => {
        expect(escapeTypstContent('#1')).toBe('\\#1');
        expect(escapeTypstContent('0–<150 kgCO2e/m²')).toBe(
            '0–\\<150 kgCO2e/m²',
        );
    });
});

describe('typstChartDataRow', () => {
    it('formats chart rows in tonnes', () => {
        expect(typstChartDataRow('Rafters', 12500)).toBe(
            '  ([Rafters], 12.500),\n',
        );
        expect(carbonChartTonnes(500)).toBe(0.5);
    });
});
