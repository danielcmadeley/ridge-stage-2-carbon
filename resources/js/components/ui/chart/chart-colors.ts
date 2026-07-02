/** Ridge brand green (#003723) and lighter shades for chart segments. */
export const RIDGE_GREEN_CHART_PALETTE = [
    '#003723',
    '#005032',
    '#1f7a4d',
    '#3da56a',
    '#5fbf82',
    '#8fd4a8',
    '#b8e6c9',
] as const;

export function ridgeGreenChartColors(count: number): string[] {
    return Array.from(
        { length: count },
        (_, index) =>
            RIDGE_GREEN_CHART_PALETTE[index % RIDGE_GREEN_CHART_PALETTE.length],
    );
}

export function chartColorVariables(count: number): string[] {
    return ridgeGreenChartColors(count);
}

export function defaultColors(count: number = 3): string[] {
    return ridgeGreenChartColors(count);
}
