export function resolveChartTooltipDatum(
    datum: Record<string, unknown>,
): Record<string, unknown> {
    const nested = datum.data;

    return nested && typeof nested === 'object' && !Array.isArray(nested)
        ? (nested as Record<string, unknown>)
        : datum;
}

export function buildSegmentTooltipContent(
    datum: Record<string, unknown>,
    options: {
        labelKey: string;
        valueKey: string;
        valueFormatter: (value: number) => string;
    },
): {
    title: string;
    name: string;
    value: string;
} {
    const record = resolveChartTooltipDatum(datum);
    const label = record[options.labelKey] ?? record.name;
    const value = record[options.valueKey];

    return {
        title: String(label),
        name: String(label),
        value: options.valueFormatter(Number(value)),
    };
}
