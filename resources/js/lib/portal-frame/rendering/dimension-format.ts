export function formatDimensionM(value: number): string {
    if (Number.isInteger(value)) {
        return `${value} m`;
    }

    const formatted = value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

    return `${formatted} m`;
}
