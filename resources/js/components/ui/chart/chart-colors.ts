/** Ridge brand green (#003723) and lighter shades for monochromatic charts. */
export const RIDGE_GREEN_CHART_PALETTE = [
    '#003723',
    '#005032',
    '#1f7a4d',
    '#3da56a',
    '#5fbf82',
    '#8fd4a8',
    '#b8e6c9',
] as const;

/** Soft pastel hues for pie and donut segments. */
export const CHART_CATEGORICAL_PALETTE = [
    '#86efac',
    '#f9a8d4',
    '#7dd3fc',
    '#fcd34d',
    '#c4b5fd',
    '#fca5a5',
    '#5eead4',
    '#cbd5e1',
    '#93c5fd',
    '#fde047',
] as const;

export function ridgeGreenChartColors(count: number): string[] {
    return Array.from(
        { length: count },
        (_, index) =>
            RIDGE_GREEN_CHART_PALETTE[index % RIDGE_GREEN_CHART_PALETTE.length],
    );
}

export function chartCategoricalColors(count: number): string[] {
    return Array.from(
        { length: count },
        (_, index) =>
            CHART_CATEGORICAL_PALETTE[
                index % CHART_CATEGORICAL_PALETTE.length
            ],
    );
}

export function chartColorVariables(count: number): string[] {
    return chartCategoricalColors(count);
}

export function defaultColors(count: number = 3): string[] {
    return chartCategoricalColors(count);
}
