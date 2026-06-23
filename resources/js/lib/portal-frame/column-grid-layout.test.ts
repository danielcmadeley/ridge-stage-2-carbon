import { describe, expect, it } from 'vitest';
import {
    columnGridLayout,
    gridLetterLabel,
} from '@/lib/portal-frame/column-grid-layout';
import { defaultPortalFrameDesign } from '@/types/portal-frame';

describe('gridLetterLabel', () => {
    it('maps zero-based indices to spreadsheet-style letters', () => {
        expect(gridLetterLabel(0)).toBe('A');
        expect(gridLetterLabel(6)).toBe('G');
    });
});

describe('columnGridLayout', () => {
    it('labels span grid lines with letters and frame lines with numbers', () => {
        const layout = columnGridLayout(defaultPortalFrameDesign());

        expect(layout.xLines).toEqual([-12, -6, 0, 6, 12]);
        expect(layout.xLabels).toEqual(['A', 'B', 'C', 'D', 'E']);
        expect(layout.yLines).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40]);
        expect(layout.yLabels).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    });
});
