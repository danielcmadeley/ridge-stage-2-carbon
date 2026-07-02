import { describe, expect, it } from 'vitest';
import {
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

describe('chartColorVariables', () => {
    it('uses the ridge green palette', () => {
        expect(chartColorVariables(2)).toEqual(['#003723', '#005032']);
    });
});

describe('defaultColors', () => {
    it('returns one ridge green color per requested segment', () => {
        expect(defaultColors(4)).toEqual([
            '#003723',
            '#005032',
            '#1f7a4d',
            '#3da56a',
        ]);
    });
});
