import type { ColumnGridLayout } from '@/lib/portal-frame/rendering/column-grid/column-grid-layout';
import { formatDimensionM } from '@/lib/portal-frame/rendering/dimension-format';

export type ColumnGridAxis = 'x' | 'y';

export type ColumnGridLineMeta = {
    axis: ColumnGridAxis;
    index: number;
    label: string;
    coordinate: number;
};

export type ColumnGridSelection = ColumnGridLineMeta & {
    anchorX: number;
    anchorY: number;
};

export type GridLineSpan = {
    fromIndex: number;
    toIndex: number;
    fromLabel: string;
    toLabel: string;
    distanceM: number;
};

export const COLUMN_GRID_LINE_KEY = 'columnGridLine';

export function isColumnGridLineMeta(
    value: unknown,
): value is ColumnGridLineMeta {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const meta = value as ColumnGridLineMeta;

    return (
        (meta.axis === 'x' || meta.axis === 'y') &&
        Number.isInteger(meta.index) &&
        meta.index >= 0 &&
        typeof meta.label === 'string' &&
        typeof meta.coordinate === 'number'
    );
}

export function adjacentGridLineSpans(
    layout: ColumnGridLayout,
    axis: ColumnGridAxis,
    index: number,
): { previous: GridLineSpan | null; next: GridLineSpan | null } {
    const lines = axis === 'x' ? layout.xLines : layout.yLines;
    const labels = axis === 'x' ? layout.xLabels : layout.yLabels;

    const previous =
        index > 0
            ? {
                  fromIndex: index - 1,
                  toIndex: index,
                  fromLabel: labels[index - 1],
                  toLabel: labels[index],
                  distanceM: Math.abs(lines[index] - lines[index - 1]),
              }
            : null;

    const next =
        index < lines.length - 1
            ? {
                  fromIndex: index,
                  toIndex: index + 1,
                  fromLabel: labels[index],
                  toLabel: labels[index + 1],
                  distanceM: Math.abs(lines[index + 1] - lines[index]),
              }
            : null;

    return { previous, next };
}

export function spanSegment(
    layout: ColumnGridLayout,
    axis: ColumnGridAxis,
    span: GridLineSpan,
    anchor: { x: number; y: number },
): [[number, number, number], [number, number, number]] {
    const lines = axis === 'x' ? layout.xLines : layout.yLines;
    const start = lines[span.fromIndex];
    const end = lines[span.toIndex];

    if (axis === 'x') {
        return [
            [start, anchor.y, 0.08],
            [end, anchor.y, 0.08],
        ];
    }

    return [
        [anchor.x, start, 0.08],
        [anchor.x, end, 0.08],
    ];
}

export function formatGridLineSpanLabel(span: GridLineSpan): string {
    return formatDimensionM(span.distanceM);
}
