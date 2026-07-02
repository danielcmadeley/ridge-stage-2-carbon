import { describe, expect, it } from 'vitest';
import { columnGridLayout } from '@/lib/portal-frame/rendering/column-grid/column-grid-layout';
import {
    adjacentGridLineSpans,
    formatGridLineSpanLabel,
    spanSegment,
} from '@/lib/portal-frame/rendering/column-grid/column-grid-selection';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('adjacentGridLineSpans', () => {
    const layout = columnGridLayout(defaultPortalFrameDesign());

    it('returns bay spacing on either side of an interior frame line', () => {
        const spans = adjacentGridLineSpans(layout, 'y', 4);

        expect(spans.previous).toMatchObject({
            fromLabel: '4',
            toLabel: '5',
            distanceM: 5,
        });
        expect(spans.next).toMatchObject({
            fromLabel: '5',
            toLabel: '6',
            distanceM: 5,
        });
    });

    it('returns only the next span for the first grid line', () => {
        const spans = adjacentGridLineSpans(layout, 'x', 0);

        expect(spans.previous).toBeNull();
        expect(spans.next).toMatchObject({
            fromLabel: 'A',
            toLabel: 'B',
            distanceM: 6,
        });
    });

    it('returns only the previous span for the last grid line', () => {
        const spans = adjacentGridLineSpans(
            layout,
            'y',
            layout.yLines.length - 1,
        );

        expect(spans.previous).toMatchObject({
            fromLabel: '8',
            toLabel: '9',
            distanceM: 5,
        });
        expect(spans.next).toBeNull();
    });
});

describe('spanSegment', () => {
    const layout = columnGridLayout(defaultPortalFrameDesign());

    it('lays out x-axis spans along the clicked y anchor', () => {
        const spans = adjacentGridLineSpans(layout, 'x', 2);
        const segment = spanSegment(layout, 'x', spans.next!, {
            x: 0,
            y: 12,
        });

        expect(segment).toEqual([
            [0, 12, 0.08],
            [6, 12, 0.08],
        ]);
    });

    it('formats span labels in metres', () => {
        expect(
            formatGridLineSpanLabel({
                fromIndex: 0,
                toIndex: 1,
                fromLabel: 'A',
                toLabel: 'B',
                distanceM: 6,
            }),
        ).toBe('6 m');
    });
});
