import { describe, expect, it } from 'vitest';
import {
    buildSegmentTooltipContent,
    resolveChartTooltipDatum,
} from '@/components/ui/chart/chart-single-tooltip';

describe('resolveChartTooltipDatum', () => {
    it('unwraps nested unovis segment data', () => {
        expect(
            resolveChartTooltipDatum({
                data: { label: 'Ground floor slab', carbon: 114860.96 },
            }),
        ).toEqual({
            label: 'Ground floor slab',
            carbon: 114860.96,
        });
    });
});

describe('buildSegmentTooltipContent', () => {
    it('uses the label for the title and category for the formatted value', () => {
        const result = buildSegmentTooltipContent(
            { data: { label: 'Ground floor slab', carbon: 114860.96 } },
            {
                labelKey: 'label',
                valueKey: 'carbon',
                valueFormatter: (value) => `${(value / 1000).toFixed(2)} tCO₂e`,
            },
        );

        expect(result.title).toBe('Ground floor slab');
        expect(result.name).toBe('Ground floor slab');
        expect(result.value).toBe('114.86 tCO₂e');
    });
});
