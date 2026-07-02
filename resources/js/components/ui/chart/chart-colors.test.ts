import { describe, expect, it } from 'vitest';
import {
    CHART_CATEGORICAL_PALETTE,
    chartCategoricalColors,
    chartColorVariables,
    defaultColors,
    ridgeGreenChartColors,
    RIDGE_GREEN_CHART_PALETTE,
} from '@/components/ui/chart/chart-colors';

describe('ridgeGreenChartColors', () => {
    it('returns ridge green hex shades', () => {
        expect(ridgeGreenChartColors(3)).toEqual([
            '#003723',
            '#005032',
            '#1f7a4d',
        ]);
    });

    it('cycles through the palette for additional segments', () => {
        expect(ridgeGreenChartColors(8)[6]).toBe('#b8e6c9');
        expect(ridgeGreenChartColors(8)[7]).toBe(RIDGE_GREEN_CHART_PALETTE[0]);
    });
});

describe('chartCategoricalColors', () => {
    it('returns pastel hues for each segment', () => {
        expect(chartCategoricalColors(4)).toEqual([
            '#86efac',
            '#f9a8d4',
            '#7dd3fc',
            '#fcd34d',
        ]);
    });

    it('cycles through the palette for additional segments', () => {
        expect(chartCategoricalColors(10)[9]).toBe('#fde047');
        expect(chartCategoricalColors(11)[10]).toBe(
            CHART_CATEGORICAL_PALETTE[0],
        );
    });
});

describe('chartColorVariables', () => {
    it('uses the categorical palette', () => {
        expect(chartColorVariables(2)).toEqual(['#86efac', '#f9a8d4']);
    });
});

describe('defaultColors', () => {
    it('returns one categorical color per requested segment', () => {
        expect(defaultColors(4)).toEqual([
            '#86efac',
            '#f9a8d4',
            '#7dd3fc',
            '#fcd34d',
        ]);
    });
});
